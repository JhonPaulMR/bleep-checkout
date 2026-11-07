import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export const IDLE_LIMIT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS = ['click', 'keydown', 'mousemove', 'touchstart'];

/** Encerra a sessão após 30 minutos sem uso (CA6); o prazo corre só enquanto não há uso. */
@Injectable({ providedIn: 'root' })
export class IdleSessionService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private lastActivity = Date.now();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  private readonly expiredState = signal(false);
  /** Verdadeiro quando a última sessão terminou por inatividade ou por 401 da API. */
  readonly expired = this.expiredState.asReadonly();

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.expiredState.set(false);
        this.touch();
        this.schedule(IDLE_LIMIT_MS);
      } else {
        this.stopTimer();
      }
    });
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  /** Passa a ouvir o uso (clique, teclado, mouse, toque) para reiniciar o prazo. */
  start(): void {
    if (this.listening) return;
    this.listening = true;
    const onActivity = () => this.touch();
    for (const name of ACTIVITY_EVENTS) {
      document.addEventListener(name, onActivity, { passive: true });
    }
    this.destroyRef.onDestroy(() => {
      for (const name of ACTIVITY_EVENTS) document.removeEventListener(name, onActivity);
    });
  }

  touch(): void {
    this.lastActivity = Date.now();
  }

  isExpired(): boolean {
    return this.auth.isAuthenticated() && Date.now() - this.lastActivity >= IDLE_LIMIT_MS;
  }

  expire(): void {
    this.stopTimer();
    this.auth.clearSession();
    this.expiredState.set(true);
    void this.router.navigateByUrl('/login');
  }

  private schedule(delay: number): void {
    this.stopTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.isExpired()) {
        this.expire();
      } else if (this.auth.isAuthenticated()) {
        this.schedule(IDLE_LIMIT_MS - (Date.now() - this.lastActivity));
      }
    }, delay);
  }

  private stopTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
