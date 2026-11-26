import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CheckoutCustomer,
  CheckoutService,
  Payment,
  PayWithCardPayload,
  Product,
  Sale,
} from '../data/checkout.service';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar. Tente novamente.';
const INVALID_QUANTITY_MESSAGE = 'Informe uma quantidade inteira positiva.';
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
  imports: [FormsModule],
  templateUrl: './checkout.page.html',
  host: {
    '(window:keydown)': 'onWindowKeydown($event)',
  },
})
export class CheckoutPage {
  private readonly auth = inject(AuthService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly barcodeInputEl = viewChild<ElementRef<HTMLInputElement>>('barcodeInput');
  private readonly quantityInputEl = viewChild<ElementRef<HTMLInputElement>>('quantityInputEl');

  private pollingSubscription: Subscription | null = null;
  private cardBrickController: CardBrickController | null = null;
  private cachedPublicKey: string | null = null;
  private destroyed = false;
  private brickMountSeq = 0;

  protected readonly operatorName = computed(() => this.auth.user()?.name ?? 'Operador');

  protected readonly barcodeTerm = signal('');
  protected readonly lookingUpBarcode = signal(false);
  protected readonly barcodeError = signal<string | null>(null);

  protected readonly quantityInput = signal('1');
  protected readonly quantityError = signal<string | null>(null);
  protected readonly parsedQuantity = computed<number | null>(() => {
    const raw = this.quantityInput().trim();
    if (!/^\d+$/.test(raw)) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isSafeInteger(value) && value >= 1 ? value : null;
  });
  protected readonly effectivePreviewQuantity = computed(() => this.parsedQuantity() ?? 1);

  protected readonly searchModalOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly searchResults = signal<Product[]>([]);
  protected readonly searchingProducts = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly hasSearched = signal(false);

  protected readonly selectedCustomer = signal<CheckoutCustomer | null>(null);
  protected readonly customerModalOpen = signal(false);
  protected readonly customers = signal<CheckoutCustomer[]>([]);
  protected readonly customerSearchTerm = signal('');
  protected readonly loadingCustomers = signal(false);
  protected readonly customerError = signal<string | null>(null);
  protected readonly filteredCustomers = computed(() => {
    const term = this.customerSearchTerm().trim();
    if (!term) return this.customers();

    const nameQuery = term.toLowerCase();
    const digitsQuery = term.replace(/\D/g, '');

    return this.customers().filter((customer) => {
      const matchesName = customer.name.toLowerCase().includes(nameQuery);
      const matchesCpf =
        digitsQuery !== '' && customer.cpf.replace(/\D/g, '').includes(digitsQuery);
      return matchesName || matchesCpf;
    });
  });

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

  protected onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.searchModalOpen()) {
        event.preventDefault();
        this.closeSearchModal();
        return;
      }
      if (this.customerModalOpen()) {
        event.preventDefault();
        this.closeCustomerModal();
        return;
      }
    }

    const anyModalOpen = this.searchModalOpen() || this.customerModalOpen();

    if (event.key === 'F2' && !this.sale() && !anyModalOpen) {
      event.preventDefault();
      this.quantityInputEl()?.nativeElement.focus();
      return;
    }

    if (event.key === 'F3' && !this.sale() && !anyModalOpen) {
      event.preventDefault();
      this.openCustomerModal();
      return;
    }

    if (event.key === 'F4' && !this.sale() && !anyModalOpen) {
      event.preventDefault();
      this.focusBarcodeInput();
    }
  }

  protected formatCents(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  protected formatCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  protected formatRowIndex(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  protected onQuantityChange(value: string): void {
    this.quantityInput.set(value);
    this.quantityError.set(null);
  }

  protected decreaseInputQuantity(): void {
    const current = this.parsedQuantity() ?? 1;
    this.quantityInput.set(String(Math.max(1, current - 1)));
    this.quantityError.set(null);
  }

  protected increaseInputQuantity(): void {
    const current = this.parsedQuantity() ?? 0;
    this.quantityInput.set(String(current + 1));
    this.quantityError.set(null);
  }

  protected addByBarcode(): void {
    const code = this.barcodeTerm().trim();
    if (!code || this.lookingUpBarcode() || this.creatingSale()) return;

    const qty = this.parsedQuantity();
    if (qty === null) {
      this.quantityError.set(INVALID_QUANTITY_MESSAGE);
      return;
    }

    this.barcodeError.set(null);
    this.lookingUpBarcode.set(true);

    this.checkoutService.findProductByBarcode(code).subscribe({
      next: (product) => {
        this.lookingUpBarcode.set(false);
        this.addProduct(product, qty);
        this.quantityInput.set('1');
        this.quantityError.set(null);
        this.barcodeTerm.set('');
        this.barcodeError.set(null);
        this.focusBarcodeInput();
      },
      error: (err: unknown) => {
        this.lookingUpBarcode.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.barcodeError.set('Produto não localizado.');
          return;
        }
        this.barcodeError.set(NETWORK_ERROR_MESSAGE);
      },
    });
  }

  protected openSearchModal(): void {
    this.searchTerm.set('');
    this.searchResults.set([]);
    this.searchError.set(null);
    this.hasSearched.set(false);
    this.searchModalOpen.set(true);
    this.runProductSearch();
  }

  protected closeSearchModal(): void {
    this.searchModalOpen.set(false);
    this.focusBarcodeInput();
  }

  protected openCustomerModal(): void {
    if (this.creatingSale() || this.sale()) return;
    this.customerSearchTerm.set('');
    this.customerError.set(null);
    this.customerModalOpen.set(true);
    this.loadCustomers();
  }

  protected closeCustomerModal(): void {
    this.customerModalOpen.set(false);
    this.focusBarcodeInput();
  }

  protected onCustomerModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCustomerModal();
    }
  }

  protected loadCustomers(): void {
    if (this.loadingCustomers()) return;

    this.customerError.set(null);
    this.loadingCustomers.set(true);

    this.checkoutService.listCustomers().subscribe({
      next: (customers) => {
        this.loadingCustomers.set(false);
        this.customers.set(customers);
      },
      error: (err: unknown) => {
        this.loadingCustomers.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.customerError.set(NETWORK_ERROR_MESSAGE);
      },
    });
  }

  protected selectCustomer(customer: CheckoutCustomer): void {
    this.selectedCustomer.set(customer);
    this.closeCustomerModal();
  }

  protected removeSelectedCustomer(): void {
    this.selectedCustomer.set(null);
  }

  protected runProductSearch(): void {
    if (this.searchingProducts()) return;

    this.searchError.set(null);
    this.searchingProducts.set(true);

    this.checkoutService.searchProducts(this.searchTerm()).subscribe({
      next: (products) => {
        this.searchingProducts.set(false);
        this.searchResults.set(products);
        this.hasSearched.set(true);
      },
      error: (err: unknown) => {
        this.searchingProducts.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.searchError.set(NETWORK_ERROR_MESSAGE);
      },
    });
  }

  protected selectSearchedProduct(product: Product): void {
    const qty = this.parsedQuantity();
    if (qty === null) {
      this.quantityError.set(INVALID_QUANTITY_MESSAGE);
      return;
    }

    this.addProduct(product, qty);
    this.quantityInput.set('1');
    this.quantityError.set(null);
    this.closeSearchModal();
  }

  protected addProduct(product: Product, quantity = 1): void {
    this.saleError.set(null);
    this.cart.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...items, { product, quantity }];
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

  protected removeProduct(productId: string): void {
    this.saleError.set(null);
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
  }

  protected clearCart(): void {
    this.cart.set([]);
    this.saleError.set(null);
    this.barcodeError.set(null);
    this.focusBarcodeInput();
  }

  private focusBarcodeInput(): void {
    this.barcodeInputEl()?.nativeElement.focus();
  }

  protected proceedToPayment(): void {
    if (this.creatingSale() || this.cart().length === 0) return;

    this.saleError.set(null);
    this.creatingSale.set(true);

    const itemsPayload = this.cart().map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));

    const customerId = this.selectedCustomer()?.id;
    const createSale$ = customerId
      ? this.checkoutService.createSale(itemsPayload, customerId)
      : this.checkoutService.createSale(itemsPayload);

    createSale$.subscribe({
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
    this.quantityInput.set('1');
    this.quantityError.set(null);
    this.barcodeTerm.set('');
    this.barcodeError.set(null);
    this.saleError.set(null);
    this.paymentError.set(null);
    this.declinedMessage.set(null);
    this.copiedPixCode.set(false);
    this.selectedMethod.set('CARD');
    this.selectedCustomer.set(null);
    this.customerModalOpen.set(false);
    this.customerSearchTerm.set('');
    this.customerError.set(null);
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
