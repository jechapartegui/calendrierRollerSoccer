import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AllServices {
  private apiUrl = 'http://localhost:2510/api';

  constructor(private http: HttpClient) {}

  getMatchs() {
    return this.http.get<any[]>(`${this.apiUrl}/matchs`);
  }
}
