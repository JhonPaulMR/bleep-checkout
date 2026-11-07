import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AREA_BY_ROLE } from '../../../core/auth/role.guard';
import { LoginService } from '../data/login.service';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  protected readonly failure = signal<string | null>(null);

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
    this.failure.set(null);
    this.loading.set(true);
    this.loginService.login(this.email(), this.password()).subscribe({
      next: ({ accessToken, user }) => {
        this.auth.startSession(accessToken, user);
        this.loading.set(false);
        void this.router.navigateByUrl(AREA_BY_ROLE[user.role]);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.failure.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível conectar. Tente novamente.',
        );
      },
    });
  }
}
