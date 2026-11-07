import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, Role } from '../../../core/auth/auth.service';
import { LoginService } from '../data/login.service';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AREA_BY_ROLE: Record<Role, string> = {
  MANAGER: '/cadastros',
  OPERATOR: '/caixa',
};

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly loginService = inject(LoginService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly loading = signal(false);

  protected readonly submitted = signal(false);

  protected readonly emailError = computed(() => {
    const email = this.email().trim();
    if (email === '') return 'Informe o e-mail';
    return EMAIL_FORMAT.test(email) ? null : 'E-mail inválido';
  });

  protected readonly passwordError = computed(() =>
    this.password() === '' ? 'Informe a senha' : null,
  );

  protected submit(): void {
    this.submitted.set(true);
    if (this.emailError() || this.passwordError()) return;
    this.loading.set(true);
    this.loginService.login(this.email(), this.password()).subscribe({
      next: ({ accessToken, user }) => {
        this.auth.startSession(accessToken, user);
        this.loading.set(false);
        void this.router.navigateByUrl(AREA_BY_ROLE[user.role]);
      },
      // TODO #10 (Tarefa 8): mensagens de erro de credencial e de rede.
      error: () => this.loading.set(false),
    });
  }
}
