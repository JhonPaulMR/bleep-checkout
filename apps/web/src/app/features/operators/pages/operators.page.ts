import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Operator, OperatorsService } from '../data/operators.service';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const DUPLICATE_EMAIL_MESSAGE = 'Já existe um usuário com este e-mail.';
const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar. Tente novamente.';

@Component({
  selector: 'app-operators-page',
  imports: [FormsModule],
  templateUrl: './operators.page.html',
})
export class OperatorsPage implements OnInit {
  private readonly operatorsService = inject(OperatorsService);

  protected readonly operators = signal<Operator[]>([]);
  protected readonly loadingList = signal(true);
  protected readonly listError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);

  protected readonly nameError = computed(() =>
    this.name().trim() === '' ? 'Informe o nome' : null,
  );

  protected readonly emailError = computed(() => {
    const email = this.email().trim();
    if (email === '') return 'Informe o e-mail';
    return EMAIL_FORMAT.test(email) ? null : 'E-mail inválido';
  });

  protected readonly passwordError = computed(() => {
    const password = this.password();
    if (password === '') return 'Informe a senha';
    return password.length < MIN_PASSWORD_LENGTH
      ? 'A senha deve ter pelo menos 8 caracteres'
      : null;
  });

  ngOnInit(): void {
    this.operatorsService.list().subscribe({
      next: (operators) => {
        this.operators.set(operators);
        this.listError.set(null);
        this.loadingList.set(false);
      },
      error: (err: unknown) => {
        this.loadingList.set(false);
        if (err instanceof HttpErrorResponse && err.status === 401) return;
        this.listError.set(NETWORK_ERROR_MESSAGE);
      },
    });
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.submitted.set(true);
    if (this.nameError() || this.emailError() || this.passwordError()) return;

    this.submitError.set(null);
    this.submitting.set(true);
    this.operatorsService
      .create({
        name: this.name().trim(),
        email: this.email().trim(),
        password: this.password(),
      })
      .subscribe({
        next: (created) => {
          this.operators.update((current) => [created, ...current]);
          this.name.set('');
          this.email.set('');
          this.password.set('');
          this.submitted.set(false);
          this.submitting.set(false);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (err instanceof HttpErrorResponse) {
            if (err.status === 401) return;
            if (err.status === 409) {
              const apiMessage = (err.error as { message?: unknown } | null)?.message;
              this.submitError.set(
                typeof apiMessage === 'string' ? apiMessage : DUPLICATE_EMAIL_MESSAGE,
              );
              return;
            }
          }
          this.submitError.set(NETWORK_ERROR_MESSAGE);
        },
      });
  }
}
