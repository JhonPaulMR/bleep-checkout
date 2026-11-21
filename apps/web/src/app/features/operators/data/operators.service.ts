import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Role } from '../../../core/auth/auth.service';
import { API_URL } from '../../../core/config/api-url';

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdById: string | null;
  createdAt: string;
}

export interface CreateOperatorPayload {
  name: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class OperatorsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  list(): Observable<Operator[]> {
    return this.http
      .get<{ data: Operator[] }>(`${this.apiUrl}/users`)
      .pipe(map((response) => response.data));
  }

  create(payload: CreateOperatorPayload): Observable<Operator> {
    return this.http
      .post<{ data: Operator }>(`${this.apiUrl}/users`, payload)
      .pipe(map((response) => response.data));
  }
}
