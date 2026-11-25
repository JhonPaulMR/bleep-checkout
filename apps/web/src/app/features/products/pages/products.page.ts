import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product, ProductsService } from '../data/products.service';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

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
}
