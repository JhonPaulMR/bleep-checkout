import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, Role } from '../auth/auth.service';

const MENU_BY_ROLE: Record<Role, { label: string; path: string }> = {
  MANAGER: { label: 'Cadastros', path: '/cadastros' },
  OPERATOR: { label: 'Caixa', path: '/caixa' },
};

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    @if (user()) {
      <header class="flex items-center justify-start bg-superficie px-md py-sm shadow">
        <nav class="flex gap-md">
          <a
            class="text-corpo-destaque text-texto"
            activeClass="text-primaria"
            routerLinkActive
            [routerLink]="menu()!.path"
            >{{ menu()!.label }}</a
          >
        </nav>
      </header>
    }
  `,
})
export class Header {
  protected readonly user = inject(AuthService).user;
  protected readonly menu = computed(() => {
    const current = this.user();
    return current ? MENU_BY_ROLE[current.role] : null;
  });
}
