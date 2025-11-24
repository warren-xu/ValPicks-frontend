import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatchState } from './models';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly baseUrl = '/api'; // goes through proxy to http://localhost:8080

  constructor(private http: HttpClient) {}

  createMatch(teamA: string, teamB: string, slots: number): Observable<{ matchId: string }> {
    const url = `${this.baseUrl}/match/create?teamA=${encodeURIComponent(teamA)}&teamB=${encodeURIComponent(teamB)}&slots=${slots}`;
    return this.http.get<{ matchId: string }>(url);
  }

  getState(matchId: string): Observable<MatchState> {
    const url = `${this.baseUrl}/match/state?id=${encodeURIComponent(matchId)}`;
    return this.http.get<MatchState>(url);
  }

  applyAction(matchId: string, teamIndex: number, action: 'ban' | 'pick', mapId: number): Observable<MatchState> {
    const url = `${this.baseUrl}/match/action?id=${encodeURIComponent(matchId)}&team=${teamIndex}&action=${action}&map=${mapId}`;
    return this.http.get<MatchState>(url);
  }
}
