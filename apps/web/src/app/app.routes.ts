import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastros',
    loadComponent: () =>
      import('./features/products/pages/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'caixa',
    loadComponent: () =>
      import('./features/checkout/pages/checkout.page').then((m) => m.CheckoutPage),
  },
  // TODO #10 (Tarefa 9): guards por papel e proteção sem sessão; hoje a rota raiz só leva ao login.
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
