import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product, ProductsService } from '../data/products.service';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const EAN13_FORMAT = /^\d{13}$/;
const NUMERIC_PRICE_FORMAT = /^-?\d+(?:[.,]\d+)?$/;

function parsePriceToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!NUMERIC_PRICE_FORMAT.test(trimmed)) return null;
  const numeric = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100);
}

@Component({
  selector: 'app-products-page',
  imports: [FormsModule],
  templateUrl: './products.page.html',
})
export class ProductsPage implements OnInit {
  private readonly productsService = inject(ProductsService);

  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  protected readonly modalOpen = signal(false);
  protected readonly name = signal('');
  protected readonly barcode = signal('');
  protected readonly price = signal('');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly nameError = computed(() =>
    this.name().trim() === '' ? 'Informe o nome do produto.' : null,
  );

  protected readonly barcodeValid = computed(() => EAN13_FORMAT.test(this.barcode().trim()));

  protected readonly barcodeError = computed(() => {
    const trimmed = this.barcode().trim();
    if (trimmed === '') return 'Informe o código de barras.';
    return EAN13_FORMAT.test(trimmed)
      ? null
      : 'O código de barras deve conter exatamente 13 dígitos numéricos.';
  });

  protected readonly priceError = computed(() => {
    const trimmed = this.price().trim();
    if (trimmed === '') return 'Informe o preço unitário.';
    const cents = parsePriceToCents(trimmed);
    return cents !== null && cents > 0 ? null : 'Informe um preço unitário maior que zero.';
  });

  protected readonly activeProductsCount = computed(
    () => this.products().filter((product) => product.active).length,
  );

  protected readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.products();

    return this.products().filter(
      (product) =>
        product.name.toLowerCase().includes(term) || product.barcode.toLowerCase().includes(term),
    );
  });

  // TODO #14: edição e desativação de produtos entram na US13
  protected readonly actionsDisabled = true;

  ngOnInit(): void {
    this.listError.set(null);
    this.productsService.list().subscribe({
      next: (products) => {
        this.products.set(products);
        this.listError.set(null);
        this.loading.set(false);
      },
      error: () => {
        this.listError.set('Não foi possível conectar. Tente novamente.');
        this.loading.set(false);
      },
    });
  }

  protected formatPrice(priceCents: number): string {
    return BRL_FORMATTER.format(priceCents / 100);
  }

  protected openModal(): void {
    this.resetForm();
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    this.resetForm();
    this.modalOpen.set(false);
  }

  protected submit(): void {
    if (this.saving()) return;
    this.submitted.set(true);

    if (this.nameError() || this.barcodeError() || this.priceError()) return;

    const priceCents = parsePriceToCents(this.price());
    if (priceCents === null || priceCents <= 0) return;

    this.submitError.set(null);
    this.saving.set(true);

    this.productsService
      .create({
        name: this.name().trim(),
        barcode: this.barcode().trim(),
        priceCents,
      })
      .subscribe({
        next: (created) => {
          this.products.update((current) =>
            [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.saving.set(false);
          this.closeModal();
        },
        error: () => {
          this.saving.set(false);
          this.submitError.set('Não foi possível cadastrar o produto. Tente novamente.');
        },
      });
  }

  private resetForm(): void {
    this.name.set('');
    this.barcode.set('');
    this.price.set('');
    this.submitted.set(false);
    this.saving.set(false);
    this.submitError.set(null);
  }
}
