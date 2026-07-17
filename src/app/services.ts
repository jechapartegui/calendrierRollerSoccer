import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Injectable } from '@angular/core';

import {
  catchError,
  finalize,
  forkJoin,
  map,
  Observable,
  tap,
  throwError
} from 'rxjs';

import {
  Categorie,
  Club,
  Creneau,
  EquipeEngagee,
  Gymnase,
  Match
} from 'src/app/class';

import {
  PoseTaDateApplicationData,
  PoseTaDateStore
} from 'src/app/store/pose-ta-date.store';

import type {
  Saison
} from 'src/app/store/pose-ta-date.store';

import {
  environment
} from 'src/environments/environment';

export type {
  Saison
} from 'src/app/store/pose-ta-date.store';

export interface ConnectionData {
  clubs: Club[];
  saisons: Saison[];
}

export interface CodeValidationResponse {
  valid: boolean;
}

export interface MutationResponse<T = unknown> {
  id?: number;
  data?: T;
  updated?: boolean;
  deleted?: boolean;
}

export type TypeIndisponibilite =
  | 'club'
  | 'equipe';

/*
 * Une seule table métier pour :
 * - jours fériés ;
 * - vacances ;
 * - indisponibilités de club ;
 * - indisponibilités d'équipe.
 */
export interface CalendrierMetier {
  id: number;
  date_debut: Date | string;
  date_fin: Date | string | null;
  pays: number;
  motif: string;
  equipe: number | null;
  saison: number;
  club: number | null;
  heure_debut: string | null;
  heure_fin: string | null;
  zone: string | null;
}

/*
 * Une indisponibilité est simplement une ligne de
 * ptd_calendrier possédant un club.
 *
 * Le type n'existe pas en base :
 * il est déduit de la présence ou non de equipe.
 */
export interface Indisponibilite
  extends CalendrierMetier {

  club: number;
  type: TypeIndisponibilite;
}

export interface IndisponibilitePayload {
  club?: number;
  equipe: number | null;
  type: TypeIndisponibilite;
  date_debut: Date | string;
  date_fin: Date | string | null;
  motif: string;
  heure_debut?: string | null;
  heure_fin?: string | null;
}

export type CreneauPayload =
  Partial<Creneau> & {
    saison: number;
    creneau_confirme?: boolean;
    un_club?: boolean;
  };

@Injectable({
  providedIn: 'root'
})
export class AllServices {

  private readonly apiUrl =
    environment.apiUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly store: PoseTaDateStore
  ) {}

  public get selectedClub(): Club | null {
    return this.store.snapshot.selectedClub;
  }

  public get selectedSaison(): Saison | null {
    return this.store.snapshot.selectedSaison;
  }

  public get selectedClubId(): number | null {
    return this.store.selectedClubId;
  }

  public get selectedSaisonId(): number | null {
    return this.store.selectedSaisonId;
  }

  /*
   * CONNEXION / CONTEXTE
   */

  public loadConnectionData():
    Observable<ConnectionData> {

    this.store.setLoading(true);
    this.store.setError(null);

    return forkJoin({
      clubs: this.getListeClub(),
      saisons: this.getSaisons()
    }).pipe(
      tap(({ clubs, saisons }) => {
        this.store.setConnectionData(
          clubs,
          saisons
        );
      }),

      catchError(error => {
        this.store.setError(
          'Impossible de charger les clubs et les saisons.'
        );

        return throwError(() => error);
      }),

      finalize(() => {
        this.store.setLoading(false);
      })
    );
  }

  public setSelection(
    club: Club,
    saison: Saison
  ): void {

    this.store.setContext(
      club,
      saison
    );
  }

  public clearSelection(): void {
    this.store.clearContext();
  }

  /*
   * CHARGEMENT GLOBAL
   */

  public loadApplicationData():
    Observable<PoseTaDateApplicationData> {

    const clubId =
      this.selectedClubId;

    const saison =
      this.selectedSaison;

    if (!saison) {
      return throwError(
        () => new Error(
          'Aucune saison sélectionnée.'
        )
      );
    }

    this.store.setLoading(true);
    this.store.setError(null);

    return forkJoin({
      calendriers:
        this.getCalendriers(saison),

      categories:
        this.getCategories(saison.id),

      creneaux:
        this.getCreneaux(saison.id),

      equipesEngagees:
        this.getEquipesEngagees(saison.id),

      matchs:
        this.getMatchs(saison.id),

      gymnases:
        this.getGymnases(
          clubId ?? undefined
        )
    }).pipe(
      tap(data => {
        this.store.setApplicationData(data);
      }),

      catchError(error => {
        this.store.setError(
          'Impossible de charger les données de la saison.'
        );

        return throwError(() => error);
      }),

      finalize(() => {
        this.store.setLoading(false);
      })
    );
  }

  /*
   * GET
   */

  public getListeClub():
    Observable<Club[]> {

    return this.http.get<Club[]>(
      `${this.apiUrl}/listeclub`
    );
  }

  public getSaisons():
    Observable<Saison[]> {

    return this.http.get<Saison[]>(
      `${this.apiUrl}/listesaison`
    );
  }

  public validerCode(
    clubId: number,
    code: string
  ): Observable<CodeValidationResponse> {

    return this.http.post<CodeValidationResponse>(
      `${this.apiUrl}/validcode`,
      {
        id: clubId,
        code
      }
    );
  }

  public getCalendriers(
    saison: Saison
  ): Observable<CalendrierMetier[]> {

    let params =
      this.getSaisonParams(
        saison.id
      );

    if (saison.date_debut) {
      params = params.set(
        'date_debut',
        saison.date_debut
      );
    }

    if (saison.date_fin) {
      params = params.set(
        'date_fin',
        saison.date_fin
      );
    }

    return this.http.get<CalendrierMetier[]>(
      `${this.apiUrl}/calendrier`,
      { params }
    );
  }

  public getCategories(
    saisonId: number
  ): Observable<Categorie[]> {

    return this.http.get<Categorie[]>(
      `${this.apiUrl}/categorie`,
      {
        params:
          this.getSaisonParams(saisonId)
      }
    );
  }

  public getCreneaux(
    saisonId: number
  ): Observable<Creneau[]> {

    return this.http.get<Creneau[]>(
      `${this.apiUrl}/creneau`,
      {
        params:
          this.getSaisonParams(saisonId)
      }
    );
  }

  public getEquipesEngagees(
    saisonId: number
  ): Observable<EquipeEngagee[]> {

    return this.http.get<EquipeEngagee[]>(
      `${this.apiUrl}/equipe_engagee`,
      {
        params:
          this.getSaisonParams(saisonId)
      }
    );
  }

  public getMatchs(
    saisonId: number
  ): Observable<Match[]> {

    return this.http.get<Match[]>(
      `${this.apiUrl}/match`,
      {
        params:
          this.getSaisonParams(saisonId)
      }
    );
  }

  public getGymnases(
    clubId?: number
  ): Observable<Gymnase[]> {

    let params =
      new HttpParams();

    if (clubId !== undefined) {
      params = params.set(
        'club',
        clubId.toString()
      );
    }

    return this.http.get<Gymnase[]>(
      `${this.apiUrl}/gymnase`,
      { params }
    );
  }

  /*
   * Compatibilité pour les écrans qui demandent encore
   * explicitement les indisponibilités.
   *
   * La route appelée reste /calendrier : aucune seconde
   * table ni route /indisponibilite.
   */
  public getIndisponibilites(
    saisonId: number
  ): Observable<Indisponibilite[]> {

    return this.http
      .get<CalendrierMetier[]>(
        `${this.apiUrl}/calendrier`,
        {
          params:
            this.getSaisonParams(
              saisonId
            )
        }
      )
      .pipe(
        map(calendriers =>
          this.extraireIndisponibilites(
            calendriers
          )
        )
      );
  }

  /*
   * ÉQUIPES
   */

  public createEquipe(
    equipe:
      Partial<EquipeEngagee>
  ): Observable<EquipeEngagee> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const payload = {
      ...equipe,
      saison: saisonId
    };

    return this.http
      .post<
        MutationResponse<EquipeEngagee>
      >(
        `${this.apiUrl}/equipe_engagee`,
        payload
      )
      .pipe(
        map(response =>
          this.buildCreatedEntity(
            payload,
            response
          )
        ),

        tap(created => {
          this.patchApplicationData({
            equipesEngagees: [
              ...this.store.snapshot
                .equipesEngagees,
              created
            ]
          });
        })
      );
  }

  public deleteEquipe(
    id: number
  ): Observable<void> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    return this.http
      .delete<MutationResponse>(
        `${this.apiUrl}/equipe_engagee/${id}`,
        {
          params:
            this.getSaisonParams(
              saisonId
            )
        }
      )
      .pipe(
        tap(() => {
          this.patchApplicationData({
            equipesEngagees:
              this.store.snapshot
                .equipesEngagees
                .filter(
                  equipe =>
                    Number(equipe.id) !==
                    Number(id)
                )
          });
        }),

        map(() => undefined)
      );
  }

  /*
   * MATCHS / ARBITRAGE
   */

  public createMatch(
    match:
      Partial<Match>
  ): Observable<Match> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const payload = {
      ...this.removeFrontFields(match),
      saison: saisonId
    };

    return this.http
      .post<
        MutationResponse<Match>
      >(
        `${this.apiUrl}/match`,
        payload
      )
      .pipe(
        map(response =>
          this.buildCreatedEntity(
            payload,
            response
          )
        ),

        tap(created => {
          this.patchApplicationData({
            matchs: [
              ...this.store.snapshot
                .matchs,
              created
            ]
          });
        })
      );
  }

  public updateMatch(
    id: number,
    modifications:
      Partial<Match>
  ): Observable<Match> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const current =
      this.store.snapshot.matchs.find(
        match =>
          Number(match.id) ===
          Number(id)
      );

    const payload = {
      ...(current ?? {}),
      ...this.removeFrontFields(
        modifications
      ),
      id,
      saison: saisonId
    } as Match;

    return this.http
      .put<
        MutationResponse<Match>
      >(
        `${this.apiUrl}/match/${id}`,
        payload
      )
      .pipe(
        map(response => ({
          ...payload,
          ...(response.data ?? {})
        }) as Match),

        tap(updated => {
          this.patchApplicationData({
            matchs:
              this.store.snapshot
                .matchs
                .map(
                  match =>
                    Number(match.id) ===
                    Number(id)
                      ? updated
                      : match
                )
          });
        })
      );
  }

  public deleteMatch(
    id: number
  ): Observable<void> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    return this.http
      .delete<MutationResponse>(
        `${this.apiUrl}/match/${id}`,
        {
          params:
            this.getSaisonParams(
              saisonId
            )
        }
      )
      .pipe(
        tap(() => {
          this.patchApplicationData({
            matchs:
              this.store.snapshot
                .matchs
                .filter(
                  match =>
                    Number(match.id) !==
                    Number(id)
                )
          });
        }),

        map(() => undefined)
      );
  }

  /*
   * GYMNASES
   */

  public createGymnase(
    gymnase:
      Partial<Gymnase>
  ): Observable<Gymnase> {

    const clubId =
      this.selectedClubId;

    if (clubId === null) {
      return throwError(
        () => new Error(
          'Aucun club sélectionné.'
        )
      );
    }

    const payload = {
      ...gymnase,
      club:
        gymnase.club ?? clubId
    };

    return this.http
      .post<
        MutationResponse<Gymnase>
      >(
        `${this.apiUrl}/gymnase`,
        payload
      )
      .pipe(
        map(response =>
          this.buildCreatedEntity(
            payload,
            response
          )
        ),

        tap(created => {
          this.patchApplicationData({
            gymnases: [
              ...this.store.snapshot
                .gymnases,
              created
            ]
          });
        })
      );
  }

  public updateGymnase(
    id: number,
    modifications:
      Partial<Gymnase>
  ): Observable<Gymnase> {

    const current =
      this.store.snapshot.gymnases.find(
        gymnase =>
          Number(gymnase.id) ===
          Number(id)
      );

    const payload = {
      ...(current ?? {}),
      ...modifications,
      id
    } as Gymnase;

    return this.http
      .put<
        MutationResponse<Gymnase>
      >(
        `${this.apiUrl}/gymnase/${id}`,
        payload
      )
      .pipe(
        map(response => ({
          ...payload,
          ...(response.data ?? {})
        }) as Gymnase),

        tap(updated => {
          this.patchApplicationData({
            gymnases:
              this.store.snapshot
                .gymnases
                .map(
                  gymnase =>
                    Number(gymnase.id) ===
                    Number(id)
                      ? updated
                      : gymnase
                )
          });
        })
      );
  }

  public deleteGymnase(
    id: number
  ): Observable<void> {

    return this.http
      .delete<MutationResponse>(
        `${this.apiUrl}/gymnase/${id}`
      )
      .pipe(
        tap(() => {
          this.patchApplicationData({
            gymnases:
              this.store.snapshot
                .gymnases
                .filter(
                  gymnase =>
                    Number(gymnase.id) !==
                    Number(id)
                )
          });
        }),

        map(() => undefined)
      );
  }

  /*
   * CRÉNEAUX
   */

  public createCreneau(
    creneau:
      Partial<Creneau>
  ): Observable<Creneau> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const payload:
      CreneauPayload = {
      ...creneau,
      saison:
        saisonId
    };

    return this.http
      .post<
        MutationResponse<Creneau>
      >(
        `${this.apiUrl}/creneau`,
        payload
      )
      .pipe(
        map(response =>
          this.buildCreatedEntity(
            payload,
            response
          )
        ),

        tap(created => {
          this.store.addCreneau(
            created
          );
        })
      );
  }

  public updateCreneau(
    id: number,
    modifications:
      Partial<Creneau>
  ): Observable<Creneau> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const current =
      this.store.snapshot.creneaux.find(
        creneau =>
          Number(creneau.id) ===
          Number(id)
      );

    const payload = {
      ...(current ?? {}),
      ...modifications,
      id,
      saison:
        saisonId
    } as Creneau;

    return this.http
      .put<
        MutationResponse<Creneau>
      >(
        `${this.apiUrl}/creneau/${id}`,
        payload
      )
      .pipe(
        map(response => ({
          ...payload,
          ...(response.data ?? {})
        }) as Creneau),

        tap(updated => {
          this.store.updateCreneau(
            updated
          );
        })
      );
  }

  public deleteCreneau(
    id: number
  ): Observable<void> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    return this.http
      .delete<MutationResponse>(
        `${this.apiUrl}/creneau/${id}`,
        {
          params:
            this.getSaisonParams(
              saisonId
            )
        }
      )
      .pipe(
        tap(() => {
          this.store.removeCreneau(
            id
          );
        }),

        map(() => undefined)
      );
  }

  /*
   * CALENDRIER / INDISPONIBILITÉS
   *
   * Les indisponibilités sont stockées dans ptd_calendrier.
   * Une ligne est une indisponibilité dès que club est renseigné.
   */

  public createCalendrier(
    calendrier:
      Partial<CalendrierMetier>
  ): Observable<CalendrierMetier> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const payload = {
      date_debut:
        calendrier.date_debut,

      date_fin:
        calendrier.date_fin ??
        null,

      pays:
        calendrier.pays ??
        1,

      motif:
        calendrier.motif ??
        '',

      equipe:
        calendrier.equipe ??
        null,

      saison:
        saisonId,

      club:
        calendrier.club ??
        null,

      heure_debut:
        calendrier.heure_debut ??
        null,

      heure_fin:
        calendrier.heure_fin ??
        null,

      zone:
        calendrier.zone ??
        null
    };

    return this.http
      .post<
        MutationResponse<CalendrierMetier>
      >(
        `${this.apiUrl}/calendrier`,
        payload
      )
      .pipe(
        map(response =>
          this.buildCreatedEntity(
            payload,
            response
          )
        ),

        tap(created => {
          this.patchApplicationData({
            calendriers: [
              ...this.store.snapshot
                .calendriers,
              created as any
            ]
          });
        })
      );
  }

  public updateCalendrier(
    id: number,
    modifications:
      Partial<CalendrierMetier>
  ): Observable<CalendrierMetier> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    const current =
      (
        this.store.snapshot
          .calendriers as
          unknown as CalendrierMetier[]
      ).find(
        calendrier =>
          Number(calendrier.id) ===
          Number(id)
      );

    const payload:
      CalendrierMetier = {
      ...(current ?? {
        id,
        date_debut: '',
        date_fin: null,
        pays: 1,
        motif: '',
        equipe: null,
        saison: saisonId,
        club: null,
        heure_debut: null,
        heure_fin: null,
        zone: null
      }),

      ...modifications,
      id,
      saison:
        saisonId
    };

    return this.http
      .put<
        MutationResponse<CalendrierMetier>
      >(
        `${this.apiUrl}/calendrier/${id}`,
        payload
      )
      .pipe(
        map(response => ({
          ...payload,
          ...(response.data ?? {})
        }) as CalendrierMetier),

        tap(updated => {
          this.patchApplicationData({
            calendriers:
              (
                this.store.snapshot
                  .calendriers as
                  unknown as CalendrierMetier[]
              ).map(
                calendrier =>
                  Number(calendrier.id) ===
                  Number(id)
                    ? updated
                    : calendrier
              ) as any
          });
        })
      );
  }

  public deleteCalendrier(
    id: number
  ): Observable<void> {

    const saisonId =
      this.requireSaisonId();

    if (saisonId instanceof Error) {
      return throwError(
        () => saisonId
      );
    }

    return this.http
      .delete<MutationResponse>(
        `${this.apiUrl}/calendrier/${id}`,
        {
          params:
            this.getSaisonParams(
              saisonId
            )
        }
      )
      .pipe(
        tap(() => {
          this.patchApplicationData({
            calendriers:
              this.store.snapshot
                .calendriers
                .filter(
                  calendrier =>
                    Number(calendrier.id) !==
                    Number(id)
                )
          });
        }),

        map(() => undefined)
      );
  }

  public createIndisponibilite(
    indisponibilite:
      IndisponibilitePayload
  ): Observable<Indisponibilite> {

    const club =
      this.selectedClub as
        (
          Club & {
            pays?: number;
            zone?: string | null;
          }
        ) |
        null;

    const clubId =
      indisponibilite.club ??
      this.selectedClubId;

    if (
      clubId === null ||
      !club
    ) {
      return throwError(
        () => new Error(
          'Aucun club sélectionné.'
        )
      );
    }

    return this.createCalendrier({
      date_debut:
        indisponibilite.date_debut,

      date_fin:
        indisponibilite.date_fin ??
        null,

      pays:
        Number(
          club.pays ?? 1
        ),

      motif:
        indisponibilite.motif,

      equipe:
        indisponibilite.type ===
          'equipe'
          ? (
              indisponibilite.equipe ??
              null
            )
          : null,

      club:
        clubId,

      heure_debut:
        indisponibilite.heure_debut ??
        null,

      heure_fin:
        indisponibilite.heure_fin ??
        null,

      zone:
        club.zone ??
        null
    }).pipe(
      map(calendrier =>
        this.toIndisponibilite(
          calendrier
        )
      )
    );
  }

  public updateIndisponibilite(
    id: number,
    modifications:
      Partial<IndisponibilitePayload>
  ): Observable<Indisponibilite> {

    const current =
      (
        this.store.snapshot
          .calendriers as
          unknown as CalendrierMetier[]
      ).find(
        calendrier =>
          Number(calendrier.id) ===
          Number(id)
      );

    if (!current) {
      return throwError(
        () => new Error(
          'Indisponibilité introuvable dans le store.'
        )
      );
    }

    const type =
      modifications.type ??
      (
        current.equipe
          ? 'equipe'
          : 'club'
      );

    return this.updateCalendrier(
      id,
      {
        ...current,

        date_debut:
          modifications.date_debut ??
          current.date_debut,

        date_fin:
          modifications.date_fin !==
          undefined
            ? modifications.date_fin
            : current.date_fin,

        motif:
          modifications.motif ??
          current.motif,

        club:
          modifications.club ??
          current.club,

        equipe:
          type === 'equipe'
            ? (
                modifications.equipe ??
                current.equipe
              )
            : null,

        heure_debut:
          modifications.heure_debut !==
          undefined
            ? modifications.heure_debut
            : current.heure_debut,

        heure_fin:
          modifications.heure_fin !==
          undefined
            ? modifications.heure_fin
            : current.heure_fin
      }
    ).pipe(
      map(calendrier =>
        this.toIndisponibilite(
          calendrier
        )
      )
    );
  }

  public deleteIndisponibilite(
    id: number
  ): Observable<void> {

    return this.deleteCalendrier(id);
  }

  public extraireIndisponibilites(
    calendriers:
      readonly CalendrierMetier[]
  ): Indisponibilite[] {

    return calendriers
      .filter(
        calendrier =>
          calendrier.club !== null &&
          calendrier.club !== undefined &&
          Number(calendrier.club) > 0
      )
      .map(
        calendrier =>
          this.toIndisponibilite(
            calendrier
          )
      );
  }

  private toIndisponibilite(
    calendrier:
      CalendrierMetier
  ): Indisponibilite {

    return {
      ...calendrier,

      club:
        Number(calendrier.club),

      equipe:
        calendrier.equipe
          ? Number(
              calendrier.equipe
            )
          : null,

      type:
        calendrier.equipe
          ? 'equipe'
          : 'club'
    };
  }

  /*
   * OUTILS INTERNES
   */

  private patchApplicationData(
    patch:
      Partial<PoseTaDateApplicationData>
  ): void {

    const snapshot =
      this.store.snapshot;

    this.store.setApplicationData({
      calendriers:
        patch.calendriers ??
        snapshot.calendriers,

      categories:
        patch.categories ??
        snapshot.categories,

      creneaux:
        patch.creneaux ??
        snapshot.creneaux,

      equipesEngagees:
        patch.equipesEngagees ??
        snapshot.equipesEngagees,

      matchs:
        patch.matchs ??
        snapshot.matchs,

      gymnases:
        patch.gymnases ??
        snapshot.gymnases
    });
  }

  private buildCreatedEntity<
    T extends {
      id?: number;
    }
  >(
    payload:
      Partial<T>,
    response:
      MutationResponse<T>
  ): T {

    const data =
      response.data ?? {};

    const id =
      response.id ??
      (data as T).id;

    if (
      id === undefined ||
      id === null
    ) {
      throw new Error(
        'Le back n’a pas renvoyé l’identifiant de la donnée créée.'
      );
    }

    return {
      ...payload,
      ...data,
      id:
        Number(id)
    } as T;
  }

  private removeFrontFields<T>(
    value: T
  ): Partial<T> {

    if (
      !value ||
      typeof value !== 'object'
    ) {
      return value;
    }

    const {
      creneau,
      ...persistable
    } = value as T & {
      creneau?: unknown;
    };

    return persistable as
      Partial<T>;
  }

  private requireSaisonId():
    number | Error {

    const saisonId =
      this.selectedSaisonId;

    return saisonId === null
      ? new Error(
          'Aucune saison sélectionnée.'
        )
      : saisonId;
  }

  private getSaisonParams(
    saisonId: number
  ): HttpParams {

    return new HttpParams()
      .set(
        'saison',
        saisonId.toString()
      );
  }
}
