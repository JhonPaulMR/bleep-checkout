import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Operator, OperatorsService } from '../data/operators.service';

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-operators-page',
  imports: [FormsModule],
  templateUrl: './operators.page.html',
})
export class OperatorsPage implements OnInit {
  private readonly operatorsService = inject(OperatorsService);

  protected readonly operators = signal<Operator[]>([]);
  protected readonly loadingList = signal(true);
  protected readonly submitting = signal(false);

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
        this.loadingList.set(false);
      },
    });
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.nameError() || this.emailError() || this.passwordError()) return;

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
      });
  }
}
