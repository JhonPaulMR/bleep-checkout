import { Routes } from '@angular/router';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastros',
    redirectTo: 'produtos',
    pathMatch: 'full',
  },
  {
    path: 'produtos',
    canMatch: [roleGuard('MANAGER')],
    loadComponent: () =>
      import('./features/products/pages/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'operadores',
    canMatch: [roleGuard('MANAGER')],
    loadComponent: () =>
      import('./features/operators/pages/operators.page').then((m) => m.OperatorsPage),
  },
  {
    path: 'caixa',
    canMatch: [roleGuard('OPERATOR')],
    loadComponent: () =>
      import('./features/checkout/pages/checkout.page').then((m) => m.CheckoutPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
