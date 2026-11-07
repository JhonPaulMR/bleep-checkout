import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleSessionService } from './core/auth/idle-session.service';
import { Header } from './core/layout/header';

@Component({
  imports: [RouterOutlet, Header],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    inject(IdleSessionService).start();
  }
}
