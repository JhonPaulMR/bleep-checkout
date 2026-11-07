import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base da API: lida do environment (trocado por fileReplacements no build de produção). */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => environment.apiUrl,
});
