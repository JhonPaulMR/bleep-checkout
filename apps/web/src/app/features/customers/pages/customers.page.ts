import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Customer, CustomersService } from '../data/customers.service';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const CPF_ALLOWED_CHARS = /^[\d.-]+$/;
const CPF_DIGITS_FORMAT = /^\d{11}$/;
const NUMERIC_BALANCE_FORMAT = /^-?\d+(?:[.,]\d{1,2})?$/;
const CONNECTION_ERROR_MESSAGE = 'Não foi possível conectar. Tente novamente.';

function normalizeCpf(raw: string): string | null {
  const trimmed = raw.trim();
  if (!CPF_ALLOWED_CHARS.test(trimmed)) return null;
  const digits = trimmed.replace(/[.-]/g, '');
  return CPF_DIGITS_FORMAT.test(digits) ? digits : null;
}

function parseBalanceToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!NUMERIC_BALANCE_FORMAT.test(trimmed)) return null;
  const numeric = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100);
}

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

  protected readonly modalOpen = signal(false);
  protected readonly name = signal('');
  protected readonly cpf = signal('');
  protected readonly initialBalance = signal('0,00');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly cpfConflictError = signal<string | null>(null);

  protected readonly nameError = computed(() =>
    this.name().trim() === '' ? 'Informe o nome do cliente.' : null,
  );

  protected readonly cpfError = computed(() => {
    const trimmed = this.cpf().trim();
    if (trimmed === '') return 'Informe o CPF.';
    return normalizeCpf(trimmed) ? null : 'Informe um CPF válido com 11 dígitos numéricos.';
  });

  protected readonly cpfHasError = computed(() =>
    Boolean(this.cpfConflictError() || (this.submitted() && this.cpfError())),
  );

  protected readonly balanceError = computed(() => {
    const trimmed = this.initialBalance().trim();
    if (trimmed === '') return 'Informe o saldo inicial.';
    const cents = parseBalanceToCents(trimmed);
    return cents !== null && cents >= 0 ? null : 'O saldo inicial não pode ser negativo.';
  });

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
        this.listError.set(CONNECTION_ERROR_MESSAGE);
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

  protected openModal(): void {
    this.resetForm();
    this.modalOpen.set(true);
  }

  protected closeModal(): void {
    if (this.saving()) return;
    this.resetForm();
    this.modalOpen.set(false);
  }

  protected onCpfChange(value: string): void {
    this.cpf.set(value);
    if (this.cpfConflictError()) {
      this.cpfConflictError.set(null);
    }
  }

  protected submit(): void {
    if (this.saving()) return;
    this.submitted.set(true);

    if (this.nameError() || this.cpfError() || this.balanceError()) return;

    const normalizedCpf = normalizeCpf(this.cpf());
    const balanceCents = parseBalanceToCents(this.initialBalance());
    if (normalizedCpf === null || balanceCents === null || balanceCents < 0) return;

    this.submitError.set(null);
    this.cpfConflictError.set(null);
    this.saving.set(true);

    this.customersService
      .create({
        name: this.name().trim(),
        cpf: normalizedCpf,
        balanceCents,
      })
      .subscribe({
        next: (created) => {
          this.customers.update((current) =>
            [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.saving.set(false);
          this.closeModal();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401) {
              return;
            }
            if (err.status === 409) {
              const apiMessage = (err.error as { message?: unknown } | null)?.message;
              this.cpfConflictError.set(
                typeof apiMessage === 'string'
                  ? apiMessage
                  : 'Já existe um cliente com este CPF.',
              );
              this.submitError.set(null);
              return;
            }
          }
          this.submitError.set(CONNECTION_ERROR_MESSAGE);
        },
      });
  }

  private resetForm(): void {
    this.name.set('');
    this.cpf.set('');
    this.initialBalance.set('0,00');
    this.submitted.set(false);
    this.saving.set(false);
    this.submitError.set(null);
    this.cpfConflictError.set(null);
  }
}
