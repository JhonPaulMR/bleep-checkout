import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { firstValueFrom, Subscription } from 'rxjs';
import {
  CheckoutService,
  Payment,
  PayWithCardPayload,
  Product,
  Sale,
} from '../data/checkout.service';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar. Tente novamente.';
const CARD_DECLINED_MESSAGE =
  'Pagamento recusado. Tente outro cartão ou escolha outra forma de pagamento.';
const DEFAULT_PAYER_EMAIL = 'operador@bleep.local';
const CARD_BRICK_CONTAINER_ID = 'card-payment-brick-container';

type CheckoutPaymentMethod = 'CARD' | 'PIX';

interface CartItem {
  product: Product;
  quantity: number;
}

interface BrickFormData {
  token: string;
  payment_method_id: string;
  installments: number;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
}

interface CardBrickController {
  unmount?: () => void;
}

interface MercadoPagoBricksBuilder {
  create(
    brick: 'cardPayment',
    containerId: string,
    settings: {
      initialization: {
        amount: number;
        payer: { email: string };
      };
      callbacks: {
        onReady?: () => void;
        onSubmit: (formData: BrickFormData) => Promise<void>;
        onError?: (error: unknown) => void;
      };
    },
  ): Promise<CardBrickController>;
}

interface MercadoPagoInstance {
  bricks(): MercadoPagoBricksBuilder;
}

type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string },
) => MercadoPagoInstance;

interface WindowWithMercadoPago extends Window {
  MercadoPago?: MercadoPagoConstructor;
}

@Component({
  selector: 'app-checkout-page',
  templateUrl: './checkout.page.html',
})
export class CheckoutPage implements OnInit {
  private readonly checkoutService = inject(CheckoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private pollingSubscription: Subscription | null = null;
  private cardBrickController: CardBrickController | null = null;
  private cachedPublicKey: string | null = null;
  private destroyed = false;
  private brickMountSeq = 0;

  // TODO #4: seleção simplificada dos produtos do catálogo seedado; leitor de código de barras e busca avançada entram na US03.
  protected readonly products = signal<Product[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly productsError = signal<string | null>(null);

  protected readonly cart = signal<CartItem[]>([]);
  protected readonly cartTotalCents = computed(() =>
    this.cart().reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0),
  );
  protected readonly cartItemCount = computed(() =>
    this.cart().reduce((sum, item) => sum + item.quantity, 0),
  );

  protected readonly creatingSale = signal(false);
  protected readonly saleError = signal<string | null>(null);

  protected readonly sale = signal<Sale | null>(null);
  protected readonly lastPayment = signal<Payment | null>(null);
  protected readonly selectedMethod = signal<CheckoutPaymentMethod>('CARD');

  protected readonly brickLoading = signal(false);
  protected readonly submittingPayment = signal(false);
  protected readonly paymentError = signal<string | null>(null);
  protected readonly declinedMessage = signal<string | null>(null);
  protected readonly copiedPixCode = signal(false);

  protected readonly isPixPending = computed(() => {
    const currentSale = this.sale();
    const payment = this.lastPayment();
    return currentSale?.status === 'PENDING' && payment?.method === 'PIX';
  });

  protected readonly isCardPending = computed(() => {
    const currentSale = this.sale();
    const payment = this.lastPayment();
    return currentSale?.status === 'PENDING' && payment?.method !== 'PIX';
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.stopPolling();
      this.unmountCardBrick();
    });
  }

  ngOnInit(): void {
    this.checkoutService.listProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.productsError.set(null);
        this.loadingProducts.set(false);
      },
      error: (err: unknown) => {
        this.loadingProducts.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.productsError.set(this.extractErrorMessage(err));
      },
    });
  }

  protected formatCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  protected addProduct(product: Product): void {
    this.saleError.set(null);
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...items, { product, quantity: 1 }];
    });
  }

  protected decreaseProduct(productId: string): void {
    this.cart.update((items) =>
      items
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  protected proceedToPayment(): void {
    if (this.creatingSale() || this.cart().length === 0) return;

    this.saleError.set(null);
    this.creatingSale.set(true);

    const itemsPayload = this.cart().map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));

    this.checkoutService.createSale(itemsPayload).subscribe({
      next: (createdSale) => {
        this.creatingSale.set(false);
        this.sale.set(createdSale);
        this.lastPayment.set(null);
        this.paymentError.set(null);
        this.declinedMessage.set(null);
        this.selectedMethod.set('CARD');
        this.initializeCardBrick(createdSale);
      },
      error: (err: unknown) => {
        this.creatingSale.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.saleError.set(this.extractErrorMessage(err));
      },
    });
  }

  protected selectPaymentMethod(method: CheckoutPaymentMethod): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.status !== 'OPEN' || this.submittingPayment()) return;
    if (this.selectedMethod() === method) return;

    this.selectedMethod.set(method);
    this.paymentError.set(null);

    if (method === 'CARD') {
      this.initializeCardBrick(currentSale);
    } else {
      this.unmountCardBrick();
    }
  }

  protected retryCardPayment(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.status !== 'OPEN') return;

    this.declinedMessage.set(null);
    this.paymentError.set(null);
    this.selectedMethod.set('CARD');
    this.initializeCardBrick(currentSale);
  }

  protected generatePix(): void {
    const currentSale = this.sale();
    if (!currentSale || currentSale.status !== 'OPEN' || this.submittingPayment()) return;

    this.paymentError.set(null);
    this.declinedMessage.set(null);
    this.submittingPayment.set(true);

    this.checkoutService.payWithPix(currentSale.id).subscribe({
      next: (response) => {
        this.submittingPayment.set(false);
        this.sale.set(response.sale);
        this.lastPayment.set(response.payment);
        if (response.sale.status === 'PENDING') {
          this.startPolling(response.sale.id);
        }
      },
      error: (err: unknown) => {
        this.submittingPayment.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.paymentError.set(this.extractErrorMessage(err));
      },
    });
  }

  protected copyPixCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard
        .writeText(code)
        .then(() => {
          this.copiedPixCode.set(true);
        })
        .catch(() => {
          this.copiedPixCode.set(false);
        });
    }
  }

  protected startNewSale(): void {
    // TODO #12: vendas deixadas em PENDING permanecem no banco para retomada ou cancelamento na tela de Vendas Pendentes (US11).
    this.stopPolling();
    this.unmountCardBrick();
    this.sale.set(null);
    this.lastPayment.set(null);
    this.cart.set([]);
    this.saleError.set(null);
    this.paymentError.set(null);
    this.declinedMessage.set(null);
    this.copiedPixCode.set(false);
    this.selectedMethod.set('CARD');
  }

  private initializeCardBrick(currentSale: Sale): void {
    this.unmountCardBrick();
    const seq = ++this.brickMountSeq;
    this.brickLoading.set(true);
    this.paymentError.set(null);

    void this.mountCardBrick(currentSale, seq);
  }

  private async mountCardBrick(currentSale: Sale, seq: number): Promise<void> {
    if (!this.isBrickMountStillValid(seq, currentSale.id)) {
      this.brickLoading.set(false);
      return;
    }

    let publicKey = this.cachedPublicKey;
    if (!publicKey) {
      try {
        const config = await firstValueFrom(this.checkoutService.getPaymentConfig());
        this.cachedPublicKey = config.publicKey;
        publicKey = config.publicKey;
      } catch (err: unknown) {
        if (!this.isBrickMountStillValid(seq, currentSale.id)) return;
        this.brickLoading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.paymentError.set(this.extractErrorMessage(err));
        return;
      }
    }

    if (!this.isBrickMountStillValid(seq, currentSale.id)) {
      return;
    }

    const container = await this.waitForBrickContainer();
    if (!this.isBrickMountStillValid(seq, currentSale.id)) {
      return;
    }
    if (!container) {
      this.brickLoading.set(false);
      this.paymentError.set('Não foi possível carregar o formulário de cartão. Tente novamente.');
      return;
    }

    const MercadoPagoCtor = (window as WindowWithMercadoPago).MercadoPago;
    if (!MercadoPagoCtor) {
      this.brickLoading.set(false);
      this.paymentError.set('Não foi possível carregar o SDK de pagamento. Tente novamente.');
      return;
    }

    try {
      const mp = new MercadoPagoCtor(publicKey, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      const createdBrick = await bricksBuilder.create(
        'cardPayment',
        CARD_BRICK_CONTAINER_ID,
        {
          initialization: {
            amount: currentSale.totalCents / 100,
            payer: {
              email: DEFAULT_PAYER_EMAIL,
            },
          },
          callbacks: {
            onReady: () => {
              if (!this.isBrickMountStillValid(seq, currentSale.id)) return;
              this.brickLoading.set(false);
            },
            onSubmit: (formData) => this.handleCardSubmit(formData),
            onError: () => {
              if (!this.isBrickMountStillValid(seq, currentSale.id)) return;
              this.brickLoading.set(false);
              this.paymentError.set(
                'Não foi possível carregar o formulário de cartão. Tente novamente.',
              );
            },
          },
        },
      );

      if (!this.isBrickMountStillValid(seq, currentSale.id)) {
        createdBrick.unmount?.();
        return;
      }

      this.cardBrickController = createdBrick;
    } catch (err: unknown) {
      if (!this.isBrickMountStillValid(seq, currentSale.id)) return;
      this.brickLoading.set(false);
      this.paymentError.set(this.extractErrorMessage(err));
    }
  }

  private isBrickMountStillValid(seq: number, saleId: string): boolean {
    return (
      !this.destroyed &&
      this.brickMountSeq === seq &&
      this.sale()?.id === saleId &&
      this.sale()?.status === 'OPEN' &&
      this.selectedMethod() === 'CARD'
    );
  }

  private waitForBrickContainer(): Promise<HTMLElement | null> {
    const existing = document.getElementById(CARD_BRICK_CONTAINER_ID);
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      afterNextRender(
        () => {
          resolve(document.getElementById(CARD_BRICK_CONTAINER_ID));
        },
        { injector: this.injector },
      );
    });
  }

  private async handleCardSubmit(formData: BrickFormData): Promise<void> {
    const currentSale = this.sale();
    if (!currentSale || currentSale.status !== 'OPEN' || this.submittingPayment()) return;

    this.submittingPayment.set(true);
    this.paymentError.set(null);
    this.declinedMessage.set(null);

    const payload: PayWithCardPayload = {
      token: formData.token,
      paymentMethodId: formData.payment_method_id,
      installments: formData.installments,
      identification: {
        type: formData.payer?.identification?.type ?? 'CPF',
        number: formData.payer?.identification?.number ?? '',
      },
      ...(formData.payer?.email ? { payerEmail: formData.payer.email } : {}),
    };

    try {
      const response = await firstValueFrom(
        this.checkoutService.payWithCard(currentSale.id, payload),
      );
      this.submittingPayment.set(false);
      this.sale.set(response.sale);
      this.lastPayment.set(response.payment);

      if (response.sale.status === 'COMPLETED') {
        this.stopPolling();
        this.unmountCardBrick();
      } else if (response.payment.status === 'DECLINED') {
        this.declinedMessage.set(CARD_DECLINED_MESSAGE);
      } else if (response.sale.status === 'PENDING') {
        this.unmountCardBrick();
        this.startPolling(response.sale.id);
      }
    } catch (err: unknown) {
      this.submittingPayment.set(false);
      if (err instanceof HttpErrorResponse && err.status === 401) return;
      this.paymentError.set(this.extractErrorMessage(err));
    }
  }

  private startPolling(saleId: string): void {
    this.stopPolling();
    this.pollingSubscription = this.checkoutService.pollSaleUntilSettled(saleId).subscribe({
      next: (updatedSale) => {
        if (updatedSale.status !== 'PENDING') {
          this.sale.set(updatedSale);
          this.stopPolling();
          if (updatedSale.status === 'OPEN') {
            this.declinedMessage.set(CARD_DECLINED_MESSAGE);
          }
        }
      },
      error: () => {
        this.stopPolling();
      },
    });
  }

  private stopPolling(): void {
    this.pollingSubscription?.unsubscribe();
    this.pollingSubscription = null;
  }

  private unmountCardBrick(): void {
    this.brickMountSeq += 1;
    this.brickLoading.set(false);
    this.cardBrickController?.unmount?.();
    this.cardBrickController = null;
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const apiMessage = (err.error as { message?: unknown } | null)?.message;
      if (typeof apiMessage === 'string' && apiMessage.trim() !== '') {
        return apiMessage;
      }
    }
    return NETWORK_ERROR_MESSAGE;
  }
}
