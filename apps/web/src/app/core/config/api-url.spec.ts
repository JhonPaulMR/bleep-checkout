import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { API_URL } from './api-url';

describe('API_URL', () => {
  it('vem do environment', () => {
    expect(TestBed.inject(API_URL)).toBe(environment.apiUrl);
  });
});
