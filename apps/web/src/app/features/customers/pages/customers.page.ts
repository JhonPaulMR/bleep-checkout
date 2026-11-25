import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer, CustomersService } from '../data/customers.service';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'app-customers-page',
  imports: [FormsModule],
  templateUrl: './customers.page.html',
})
export class CustomersPage implements OnInit {
  private readonly customersService = inject(CustomersService);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal<string | null>(null);
  protected readonly searchTerm = signal('');

  // TODO #13: recarga de crédito do cliente entra na US12
  protected readonly addCreditDisabled = true;

  protected readonly totalCreditCents = computed(() =>
    this.customers().reduce((sum, customer) => sum + customer.balanceCents, 0),
  );

  protected readonly positiveBalanceCount = computed(
    () => this.customers().filter((customer) => customer.balanceCents > 0).length,
  );

  protected readonly zeroBalanceCount = computed(
    () => this.customers().length - this.positiveBalanceCount(),
  );

  protected readonly filteredCustomers = computed(() => {
    const term = this.searchTerm().trim();
    if (!term) return this.customers();

    const nameQuery = term.toLowerCase();
    const digitsQuery = term.replace(/\D/g, '');

    return this.customers().filter((customer) => {
      const matchesName = customer.name.toLowerCase().includes(nameQuery);
      const matchesCpf = digitsQuery !== '' && customer.cpf.includes(digitsQuery);
      return matchesName || matchesCpf;
    });
  });

  ngOnInit(): void {
    this.listError.set(null);
    this.customersService.list().subscribe({
      next: (customers) => {
        this.customers.set(customers);
        this.listError.set(null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.listError.set('Não foi possível conectar. Tente novamente.');
      },
    });
  }

  protected formatBalance(balanceCents: number): string {
    return BRL_FORMATTER.format(balanceCents / 100);
  }

  protected formatCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  protected getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
}
