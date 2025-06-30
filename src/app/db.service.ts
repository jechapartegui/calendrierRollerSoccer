import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map, Observable } from 'rxjs';
import { Calendrier, Categorie, Club, Creneau, EquipeEngagee, Gymnase, Match } from './class';
import { environment } from 'src/environments/environment';
import { DatePipe } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  private apiUrl = environment.apiUrl;
public selectedClub :number;
  constructor(private http: HttpClient, private datePipe: DatePipe) {}

  getListeClub(): Observable<Club[]> {
    return this.http.get<Club[]>(this.apiUrl + "/listeclub");
  }
   validerCode(id: number, code: string) {
    return this.http.post<{ valid: boolean }>(`${this.apiUrl}/validcode`, { id, code });
  }

    getAll<T>(t: string): Observable<T[]> { return this.http.get<T[]>(`${this.apiUrl}/${t}`); }
  getOne<T>(t: string, id: number): Observable<T> { return this.http.get<T>(`${this.apiUrl}/${t}/${id}`); }
  create<T>(t: string, item: T): Observable<any> { return this.http.post(`${this.apiUrl}/${t}`, item); }
 update<T extends { id: number }>(t: string, item: T): Observable<any> {
  return this.http.put(`${this.apiUrl}/${t}/${item.id}`, item);
}
  delete(t: string, id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/${t}/${id}`); }

  // Méthodes typées :
  getClubs(): Observable<Club[]> { return this.getAll<Club>('clubs'); }
  getOneClub(id:number): Observable<Club> { return this.getOne<Club>('clubs', id); }
  createClub(c: Club): Observable<any> { return this.create<Club>('clubs', c); }
  updateClub(c: Club): Observable<any> { return this.update<Club>('clubs', c); }
  deleteClub(id: number): Observable<any> { return this.delete('clubs', id); }

  // === CALENDRIER ===
  getCalendriers(): Observable<Calendrier[]> { return this.getAll<Calendrier>('calendrier'); }
  getOneCalendrier(id: number): Observable<Calendrier> { return this.getOne<Calendrier>('calendrier', id); }
  createCalendrier(c: Calendrier): Observable<any> { return this.create<Calendrier>('calendrier', c); }
  updateCalendrier(c: Calendrier): Observable<any> { return this.update<Calendrier>('calendrier', c); }
  deleteCalendrier(id: number): Observable<any> { return this.delete('calendrier', id); }

  // === CATEGORIE ===
  getCategories(): Observable<Categorie[]> { return this.getAll<Categorie>('categorie'); }
  getOneCategorie(id: number): Observable<Categorie> { return this.getOne<Categorie>('categorie', id); }
  createCategorie(c: Categorie): Observable<any> { return this.create<Categorie>('categorie', c); }
  updateCategorie(c: Categorie): Observable<any> { return this.update<Categorie>('categorie', c); }
  deleteCategorie(id: number): Observable<any> { return this.delete('categorie', id); }

  // === CRENEAU ===
  getCreneaux(): Observable<Creneau[]> {
  return this.getAll<Creneau>('creneau').pipe(
    map((arr: Creneau[]) =>
      arr.map(c => ({
        ...c,
        date: new Date(c.date as unknown as string)
      }))
    )
  );
}
  getOneCreneau(id: number): Observable<Creneau> { return this.getOne<Creneau>('creneau', id); }
 private toPayload(c: Creneau): any {
    return {
      ...c,
      date: this.datePipe.transform(c.date, 'yyyy-MM-dd')
    };
  }

  createCreneau(c: Creneau): Observable<any> {
    const payload = this.toPayload(c);
    return this.create('creneau', payload);
  }

  updateCreneau(c: Creneau): Observable<any> {
    const payload = this.toPayload(c);
    return this.update('creneau', payload);
  }
  deleteCreneau(id: number): Observable<any> { return this.delete('creneau', id); }

  // === EQUIPE ENGAGEE ===
  getEquipes(): Observable<EquipeEngagee[]> { return this.getAll<EquipeEngagee>('equipe_engagee'); }
  getOneEquipe(id: number): Observable<EquipeEngagee> { return this.getOne<EquipeEngagee>('equipe_engagee', id); }
  createEquipe(c: EquipeEngagee): Observable<any> { return this.create<EquipeEngagee>('equipe_engagee', c); }
  updateEquipe(c: EquipeEngagee): Observable<any> { return this.update<EquipeEngagee>('equipe_engagee', c); }
  deleteEquipe(id: number): Observable<any> { return this.delete('equipe_engagee', id); }

  // === MATCH ===
  getMatchs(): Observable<Match[]> { return this.getAll<Match>('match'); }
  getOneMatch(id: number): Observable<Match> { return this.getOne<Match>('match', id); }
  createMatch(c: Match): Observable<any> { return this.create<Match>('match', c); }
  updateMatch(c: Match): Observable<any> { return this.update<Match>('match', c); }
  deleteMatch(id: number): Observable<any> { return this.delete('match', id); }

  
  // === GYMNASE ===
  getGymnases(): Observable<Gymnase[]> { return this.getAll<Gymnase>('gymnase'); }
  getOneGymnase(id: number): Observable<Gymnase> { return this.getOne<Gymnase>('gymnase', id); }
  createGymnase(c: Gymnase): Observable<any> { return this.create<Gymnase>('gymnase', c); }
  updateGymnase(c: Gymnase): Observable<any> { return this.update<Gymnase>('gymnase', c); }
  deleteGymnase(id: number): Observable<any> { return this.delete('gymnase', id); }
}
