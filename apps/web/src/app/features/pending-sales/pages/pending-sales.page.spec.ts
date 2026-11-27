import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { routes } from '../../../app.routes';
import { PendingSale, PendingSalesService } from '../data/pending-sales.service';
import { PendingSalesPage } from './pending-sales.page';

describe('PendingSalesPage', () => {
  let serviceStub: {
    listPendingSales: ReturnType<typeof vi.fn>;
    cancelSale: ReturnType<typeof vi.fn>;
    reopenSale: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const saleWithCustomer: PendingSale = {
    id: 'sale-1',
    number: 10,
    operatorId: 'op-1',
    status: 'PENDING',
    totalCents: 2500,
    createdAt: '2026-11-27T14:30:00.000Z',
    completedAt: null,
    customerId: 'cust-1',
    customer: {
      id: 'cust-1',
      name: 'Maria Oliveira',
      cpf: '12345678901',
      balanceCents: 5000,
    },
    items: [],
    payments: [
      {
        id: 'pay-pix-1',
        saleId: 'sale-1',
        method: 'PIX',
        status: 'PENDING',
        amountCents: 2500,
        gatewayPaymentId: 'mp-pix-1',
        qrCode: '000201',
        qrCodeBase64: 'iVBORw0KGgo=',
        createdAt: '2026-11-27T14:30:05.000Z',
      },
    ],
  };

  const saleWithoutCustomer: PendingSale = {
    id: 'sale-2',
    number: 11,
    operatorId: 'op-1',
    status: 'PENDING',
    totalCents: 1290,
    createdAt: '2026-11-27T15:00:00.000Z',
    completedAt: null,
    customerId: null,
    customer: null,
    items: [],
    payments: [],
  };

  beforeEach(() => {
    serviceStub = {
      listPendingSales: vi.fn(),
      cancelSale: vi.fn(),
      reopenSale: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [PendingSalesPage],
      providers: [
        provideRouter([]),
        { provide: PendingSalesService, useValue: serviceStub },
      ],
    });
    router = TestBed.inject(Router);
  });

  async function render() {
    const fixture = TestBed.createComponent(PendingSalesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('rota /pendentes existe em app.routes.ts e usa roleGuard', () => {
    const pendingRoute = routes.find((route) => route.path === 'pendentes');
    expect(pendingRoute).toBeDefined();
    expect(pendingRoute?.canMatch?.length).toBe(1);
    expect(typeof pendingRoute?.loadComponent).toBe('function');
  });

  it('exibe estado de carregamento enquanto busca vendas pendentes', () => {
    const pending$ = new Subject<PendingSale[]>();
    serviceStub.listPendingSales.mockReturnValue(pending$.asObservable());

    const fixture = TestBed.createComponent(PendingSalesPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Carregando vendas pendentes');
  });

  it('renderiza lista de vendas pendentes com e sem cliente, número, total, data/hora, selo e ações (CA1)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer, saleWithoutCustomer]));

    const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const expectedFirstDateTime = dateTimeFormatter.format(new Date(saleWithCustomer.createdAt));
    const expectedSecondDateTime = dateTimeFormatter.format(
      new Date(saleWithoutCustomer.createdAt),
    );

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const cards = el.querySelectorAll('[data-testid="pending-sale-card"]');
    expect(cards.length).toBe(2);

    const firstCard = cards[0] as HTMLElement;
    expect(firstCard.textContent).toContain('#10');
    expect(firstCard.textContent).toContain('25,00');
    expect(
      firstCard.querySelector('[data-testid="pending-sale-datetime"]')?.textContent?.trim(),
    ).toBe(expectedFirstDateTime);
    expect(firstCard.textContent).toContain('Maria Oliveira');
    expect(firstCard.textContent).toContain('Pendente — aguardando pagamento');
    expect(firstCard.querySelector('[data-testid="resume-sale-btn"]')?.textContent).toContain(
      'Retomar',
    );
    expect(firstCard.querySelector('[data-testid="reopen-sale-btn"]')?.textContent).toContain(
      'Trocar forma',
    );
    expect(firstCard.querySelector('[data-testid="cancel-sale-btn"]')?.textContent).toContain(
      'Cancelar',
    );

    const secondCard = cards[1] as HTMLElement;
    expect(secondCard.textContent).toContain('#11');
    expect(secondCard.textContent).toContain('12,90');
    expect(
      secondCard.querySelector('[data-testid="pending-sale-datetime"]')?.textContent?.trim(),
    ).toBe(expectedSecondDateTime);
    expect(secondCard.textContent).not.toContain('Maria Oliveira');
    expect(secondCard.querySelector('[data-testid="pending-sale-customer"]')).toBeNull();
  });

  it('exibe estado vazio com atalho para /caixa quando não há vendas pendentes (CA2)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([]));

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const emptyState = el.querySelector('[data-testid="empty-pending-sales"]');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('Não há vendas pendentes');

    const backLink = el.querySelector('[data-testid="back-to-checkout-link"]');
    expect(backLink?.getAttribute('href')).toBe('/caixa');
  });

  it('clicar em Retomar navega para /caixa?saleId=<id> (CA3)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer]));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const resumeBtn = el.querySelector('[data-testid="resume-sale-btn"]') as HTMLButtonElement;
    resumeBtn.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/caixa'], {
      queryParams: { saleId: 'sale-1' },
    });
  });

  it('clicar em Cancelar abre confirmação e Confirmar cancelamento chama cancelSale e remove a venda da lista (CA4)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer, saleWithoutCustomer]));
    serviceStub.cancelSale.mockReturnValue(of({ ...saleWithCustomer, status: 'CANCELED' }));

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const cancelButtons = el.querySelectorAll('[data-testid="cancel-sale-btn"]');
    (cancelButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const modal = el.querySelector('[data-testid="cancel-confirm-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('#10');

    const confirmBtn = el.querySelector('[data-testid="confirm-cancel-btn"]') as HTMLButtonElement;
    confirmBtn.click();
    fixture.detectChanges();

    expect(serviceStub.cancelSale).toHaveBeenCalledWith('sale-1');
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();

    const remainingCards = el.querySelectorAll('[data-testid="pending-sale-card"]');
    expect(remainingCards.length).toBe(1);
    expect(remainingCards[0].textContent).toContain('#11');
  });

  it('desistir da confirmação de cancelamento por Voltar ou Esc não chama cancelSale (CA7)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer]));

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    // Abre e desiste clicando em Voltar
    (el.querySelector('[data-testid="cancel-sale-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();

    (el.querySelector('[data-testid="dismiss-cancel-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(serviceStub.cancelSale).not.toHaveBeenCalled();

    // Abre novamente e desiste apertando Esc
    (el.querySelector('[data-testid="cancel-sale-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).toBeNull();
    expect(serviceStub.cancelSale).not.toHaveBeenCalled();
  });

  it('clicar em Trocar forma abre confirmação e Confirmar troca chama reopenSale e navega para /caixa?saleId=<id> (CA5)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer]));
    serviceStub.reopenSale.mockReturnValue(of({ ...saleWithCustomer, status: 'OPEN' }));
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const reopenBtn = el.querySelector('[data-testid="reopen-sale-btn"]') as HTMLButtonElement;
    reopenBtn.click();
    fixture.detectChanges();

    const modal = el.querySelector('[data-testid="reopen-confirm-modal"]');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('#10');
    expect(serviceStub.reopenSale).not.toHaveBeenCalled();

    const confirmBtn = el.querySelector('[data-testid="confirm-reopen-btn"]') as HTMLButtonElement;
    expect(confirmBtn.textContent).toContain('Confirmar troca');
    confirmBtn.click();
    fixture.detectChanges();

    expect(serviceStub.reopenSale).toHaveBeenCalledWith('sale-1');
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/caixa'], {
      queryParams: { saleId: 'sale-1' },
    });
  });

  it('desistir da confirmação de trocar forma por Voltar ou Esc não chama reopenSale (CA5/CA7)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer]));

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    // Abre e desiste clicando em Voltar
    (el.querySelector('[data-testid="reopen-sale-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).not.toBeNull();

    (el.querySelector('[data-testid="dismiss-reopen-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).toBeNull();
    expect(serviceStub.reopenSale).not.toHaveBeenCalled();

    // Abre novamente e desiste apertando Esc
    (el.querySelector('[data-testid="reopen-sale-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).not.toBeNull();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).toBeNull();
    expect(serviceStub.reopenSale).not.toHaveBeenCalled();
  });

  it('desabilita botões durante cancelamento e reabertura para evitar duplo clique (CA7)', async () => {
    const reopen$ = new Subject<PendingSale>();
    const cancel$ = new Subject<PendingSale>();
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer]));
    serviceStub.reopenSale.mockReturnValue(reopen$.asObservable());
    serviceStub.cancelSale.mockReturnValue(cancel$.asObservable());

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const resumeBtn = el.querySelector('[data-testid="resume-sale-btn"]') as HTMLButtonElement;
    const reopenBtn = el.querySelector('[data-testid="reopen-sale-btn"]') as HTMLButtonElement;
    const cancelBtn = el.querySelector('[data-testid="cancel-sale-btn"]') as HTMLButtonElement;

    reopenBtn.click();
    fixture.detectChanges();

    const confirmReopenBtn = el.querySelector(
      '[data-testid="confirm-reopen-btn"]',
    ) as HTMLButtonElement;
    const dismissReopenBtn = el.querySelector(
      '[data-testid="dismiss-reopen-btn"]',
    ) as HTMLButtonElement;
    confirmReopenBtn.click();
    fixture.detectChanges();

    expect(resumeBtn.disabled).toBe(true);
    expect(reopenBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
    expect(confirmReopenBtn.disabled).toBe(true);
    expect(dismissReopenBtn.disabled).toBe(true);

    // Esc durante envio não fecha o modal de troca
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).not.toBeNull();

    reopen$.error(new HttpErrorResponse({ status: 0 }));
    fixture.detectChanges();

    expect(resumeBtn.disabled).toBe(false);
    expect(reopenBtn.disabled).toBe(false);
    expect(cancelBtn.disabled).toBe(false);
    expect(confirmReopenBtn.disabled).toBe(false);
    expect(dismissReopenBtn.disabled).toBe(false);

    dismissReopenBtn.click();
    fixture.detectChanges();

    // Agora testa desabilitação no modal de cancelamento
    cancelBtn.click();
    fixture.detectChanges();

    const confirmBtn = el.querySelector('[data-testid="confirm-cancel-btn"]') as HTMLButtonElement;
    const dismissBtn = el.querySelector('[data-testid="dismiss-cancel-btn"]') as HTMLButtonElement;
    confirmBtn.click();
    fixture.detectChanges();

    expect(confirmBtn.disabled).toBe(true);
    expect(dismissBtn.disabled).toBe(true);

    // Esc durante envio não fecha o modal
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();
  });

  it('exibe erro claro com retentativa ao falhar listagem (CA7)', async () => {
    serviceStub.listPendingSales
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })))
      .mockReturnValueOnce(of([saleWithCustomer]));

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Não foi possível conectar');

    const retryBtn = el.querySelector('[data-testid="retry-load-btn"]') as HTMLButtonElement;
    expect(retryBtn).not.toBeNull();
    retryBtn.click();
    fixture.detectChanges();

    expect(serviceStub.listPendingSales).toHaveBeenCalledTimes(2);
    expect(el.querySelectorAll('[data-testid="pending-sale-card"]').length).toBe(1);
  });

  it('exibe erro claro ao falhar cancelSale ou reopenSale mantendo o estado e permitindo retentar (CA7)', async () => {
    serviceStub.listPendingSales.mockReturnValue(of([saleWithCustomer]));
    serviceStub.reopenSale.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    serviceStub.cancelSale.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );

    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    // Falha ao reabrir
    (el.querySelector('[data-testid="reopen-sale-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('[data-testid="confirm-reopen-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="reopen-sale-error"]')?.textContent).toContain(
      'Não foi possível conectar',
    );
    expect(el.querySelector('[data-testid="reopen-confirm-modal"]')).not.toBeNull();
    expect(el.querySelectorAll('[data-testid="pending-sale-card"]').length).toBe(1);

    (el.querySelector('[data-testid="dismiss-reopen-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    // Falha ao cancelar
    (el.querySelector('[data-testid="cancel-sale-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('[data-testid="confirm-cancel-btn"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="cancel-sale-error"]')?.textContent).toContain(
      'Não foi possível conectar',
    );
    expect(el.querySelector('[data-testid="cancel-confirm-modal"]')).not.toBeNull();
    expect(el.querySelectorAll('[data-testid="pending-sale-card"]').length).toBe(1);
  });
});
