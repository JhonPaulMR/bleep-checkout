import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Role } from '../auth/auth.service';

interface MenuItem {
  label: string;
  path: string;
}

const MENU_BY_ROLE: Record<Role, MenuItem[]> = {
  MANAGER: [
    { label: 'Cadastros', path: '/cadastros' },
    { label: 'Operadores', path: '/operadores' },
  ],
  OPERATOR: [{ label: 'Caixa', path: '/caixa' }],
};

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (user()) {
      <header class="flex items-center justify-start bg-superficie px-md py-sm shadow">
        <nav class="flex gap-md">
          @for (item of menu(); track item.path) {
            <a
              class="text-corpo-destaque text-texto"
              activeClass="text-primaria"
              routerLinkActive
              [routerLink]="item.path"
              >{{ item.label }}</a
            >
          }
        </nav>
      </header>
    }
  `,
})
export class Header {
  protected readonly user = inject(AuthService).user;
  protected readonly menu = computed(() => {
    const current = this.user();
    return current ? MENU_BY_ROLE[current.role] : [];
  });
}
