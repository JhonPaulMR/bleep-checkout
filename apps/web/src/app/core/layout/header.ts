import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Role } from '../auth/auth.service';

interface MenuItem {
  label: string;
  path: string;
}

const MENU_BY_ROLE: Record<Role, MenuItem[]> = {
  MANAGER: [
    { label: 'Produtos', path: '/produtos' },
    { label: 'Clientes', path: '/clientes' },
    { label: 'Operadores', path: '/operadores' },
  ],
  OPERATOR: [
    { label: 'Caixa', path: '/caixa' },
    { label: 'Vendas pendentes', path: '/pendentes' },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  MANAGER: 'Gerente',
  OPERATOR: 'Operador de caixa',
};

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (user(); as u) {
      <header class="sticky top-0 z-40 border-b border-desabilitado/60 bg-superficie">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-md px-lg">
          <div class="flex items-center gap-sm">
            <span class="text-titulo-secao font-bold text-primaria">Bleep</span>
            <span
              class="rounded border border-desabilitado/60 bg-fundo px-xs py-0.5 text-legenda font-medium text-texto-suave"
              >Checkout</span
            >
          </div>

          <nav class="flex rounded-xl bg-fundo p-xs">
            @for (item of menu(); track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive
                #rla="routerLinkActive"
                class="rounded-lg px-md py-xs text-legenda transition-colors"
                [class.bg-primaria]="rla.isActive"
                [class.text-superficie]="rla.isActive"
                [class.font-semibold]="rla.isActive"
                [class.text-texto-suave]="!rla.isActive"
                [class.hover:text-texto]="!rla.isActive"
              >
                {{ item.label }}
              </a>
            }
          </nav>

          <div class="flex items-center gap-md">
            <div class="flex flex-col items-end">
              <span class="text-corpo-destaque leading-tight text-texto">{{ u.name }}</span>
              <span class="text-legenda leading-tight text-texto-suave">{{ roleLabel() }}</span>
            </div>
            <button
              type="button"
              (click)="logout()"
              class="rounded-md border border-desabilitado px-md py-xs text-legenda font-semibold text-texto-suave transition-colors hover:border-texto hover:text-texto"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
    }
  `,
})
export class Header {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;

  protected readonly menu = computed(() => {
    const current = this.user();
    return current ? MENU_BY_ROLE[current.role] : [];
  });

  protected readonly roleLabel = computed(() => {
    const current = this.user();
    return current ? ROLE_LABEL[current.role] : '';
  });

  protected logout(): void {
    this.auth.clearSession();
    void this.router.navigateByUrl('/login');
  }
}
