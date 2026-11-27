import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PendingSale, PendingSalesService } from '../data/pending-sales.service';

const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar. Tente novamente.';

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function extractApiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse && err.status !== 0) {
    const body = err.error as { message?: string | string[] } | null;
    if (typeof body?.message === 'string' && body.message.trim() !== '') {
      return body.message;
    }
    if (Array.isArray(body?.message) && body.message.length > 0) {
      return body.message.join(' ');
    }
  }
  return NETWORK_ERROR_MESSAGE;
}

@Component({
  selector: 'app-pending-sales-page',
  imports: [RouterLink],
  templateUrl: './pending-sales.page.html',
  host: {
    '(window:keydown)': 'onWindowKeydown($event)',
  },
})
export class PendingSalesPage implements OnInit {
  private readonly pendingSalesService = inject(PendingSalesService);
  private readonly router = inject(Router);

  protected readonly sales = signal<PendingSale[]>([]);
  protected readonly loading = signal(true);
  protected readonly listError = signal<string | null>(null);

  protected readonly reopenTarget = signal<PendingSale | null>(null);
  protected readonly reopeningSale = signal(false);
  protected readonly reopenError = signal<string | null>(null);

  protected readonly cancelTarget = signal<PendingSale | null>(null);
  protected readonly cancelingSale = signal(false);
  protected readonly cancelError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPendingSales();
  }

  protected loadPendingSales(): void {
    this.loading.set(true);
    this.listError.set(null);

    this.pendingSalesService.listPendingSales().subscribe({
      next: (sales) => {
        this.sales.set(sales);
        this.listError.set(null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.listError.set(extractApiErrorMessage(err));
      },
    });
  }

  protected formatCents(cents: number): string {
    return BRL_FORMATTER.format(cents / 100);
  }

  protected formatDateTime(isoDate: string): string {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return DATETIME_FORMATTER.format(parsed);
  }

  protected isSaleBusy(saleId: string): boolean {
    return (
      (this.reopeningSale() && this.reopenTarget()?.id === saleId) ||
      (this.cancelingSale() && this.cancelTarget()?.id === saleId)
    );
  }

  protected resumeSale(sale: PendingSale): void {
    if (this.isSaleBusy(sale.id)) return;
    void this.router.navigate(['/caixa'], { queryParams: { saleId: sale.id } });
  }

  protected openReopenConfirm(sale: PendingSale): void {
    if (this.isSaleBusy(sale.id)) return;
    this.reopenError.set(null);
    this.reopenTarget.set(sale);
  }

  protected closeReopenConfirm(): void {
    if (this.reopeningSale()) return;
    this.reopenTarget.set(null);
    this.reopenError.set(null);
  }

  protected onReopenModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeReopenConfirm();
    }
  }

  protected confirmReopen(): void {
    const target = this.reopenTarget();
    if (!target || this.reopeningSale()) return;

    this.reopeningSale.set(true);
    this.reopenError.set(null);

    this.pendingSalesService.reopenSale(target.id).subscribe({
      next: () => {
        this.reopeningSale.set(false);
        this.reopenTarget.set(null);
        this.reopenError.set(null);
        void this.router.navigate(['/caixa'], { queryParams: { saleId: target.id } });
      },
      error: (err: unknown) => {
        this.reopeningSale.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.reopenError.set(extractApiErrorMessage(err));
      },
    });
  }

  protected openCancelConfirm(sale: PendingSale): void {
    if (this.isSaleBusy(sale.id)) return;
    this.cancelError.set(null);
    this.cancelTarget.set(sale);
  }

  protected closeCancelConfirm(): void {
    if (this.cancelingSale()) return;
    this.cancelTarget.set(null);
    this.cancelError.set(null);
  }

  protected onCancelModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeCancelConfirm();
    }
  }

  protected confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target || this.cancelingSale()) return;

    this.cancelingSale.set(true);
    this.cancelError.set(null);

    this.pendingSalesService.cancelSale(target.id).subscribe({
      next: () => {
        this.cancelingSale.set(false);
        this.sales.update((list) => list.filter((item) => item.id !== target.id));
        this.cancelTarget.set(null);
        this.cancelError.set(null);
      },
      error: (err: unknown) => {
        this.cancelingSale.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.cancelError.set(extractApiErrorMessage(err));
      },
    });
  }

  protected onWindowKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (this.reopenTarget() && !this.reopeningSale()) {
      event.preventDefault();
      this.closeReopenConfirm();
      return;
    }
    if (this.cancelTarget() && !this.cancelingSale()) {
      event.preventDefault();
      this.closeCancelConfirm();
    }
  }
}
