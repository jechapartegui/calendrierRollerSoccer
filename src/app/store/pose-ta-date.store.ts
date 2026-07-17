import { Injectable } from '@angular/core';

import {
  BehaviorSubject,
  distinctUntilChanged,
  map
} from 'rxjs';

import {
  Calendrier,
  Categorie,
  Club,
  Creneau,
  EquipeEngagee,
  Gymnase,
  Match,
  Saison
} from 'src/app/class';

export { Saison } from 'src/app/class';


export interface PoseTaDateApplicationData {
  calendriers: Calendrier[];
  categories: Categorie[];
  creneaux: Creneau[];
  equipesEngagees: EquipeEngagee[];
  matchs: Match[];
  gymnases: Gymnase[];
}

export interface PoseTaDateState
  extends PoseTaDateApplicationData {

  clubs: Club[];
  saisons: Saison[];

  selectedClub: Club | null;
  selectedSaison: Saison | null;

  loading: boolean;
  loaded: boolean;

  error: string | null;
}

const emptyApplicationData:
  PoseTaDateApplicationData = {

  calendriers: [],
  categories: [],
  creneaux: [],
  equipesEngagees: [],
  matchs: [],
  gymnases: []
};

const initialState:
  PoseTaDateState = {

  clubs: [],
  saisons: [],

  selectedClub: null,
  selectedSaison: null,

  ...emptyApplicationData,

  loading: false,
  loaded: false,

  error: null
};

@Injectable({
  providedIn: 'root'
})
export class PoseTaDateStore {

  private readonly stateSubject =
    new BehaviorSubject<PoseTaDateState>(
      this.restoreInitialState()
    );

  public readonly state$ =
    this.stateSubject.asObservable();

  public readonly clubs$ =
    this.state$.pipe(
      map(state => state.clubs),
      distinctUntilChanged()
    );

  public readonly saisons$ =
    this.state$.pipe(
      map(state => state.saisons),
      distinctUntilChanged()
    );

  public readonly selectedClub$ =
    this.state$.pipe(
      map(state => state.selectedClub),
      distinctUntilChanged()
    );

  public readonly selectedSaison$ =
    this.state$.pipe(
      map(state => state.selectedSaison),
      distinctUntilChanged()
    );

  public readonly calendriers$ =
    this.state$.pipe(
      map(state => state.calendriers),
      distinctUntilChanged()
    );

  public readonly categories$ =
    this.state$.pipe(
      map(state => state.categories),
      distinctUntilChanged()
    );

  public readonly creneaux$ =
    this.state$.pipe(
      map(state => state.creneaux),
      distinctUntilChanged()
    );

  public readonly equipesEngagees$ =
    this.state$.pipe(
      map(state => state.equipesEngagees),
      distinctUntilChanged()
    );

  public readonly matchs$ =
    this.state$.pipe(
      map(state => state.matchs),
      distinctUntilChanged()
    );

  public readonly gymnases$ =
    this.state$.pipe(
      map(state => state.gymnases),
      distinctUntilChanged()
    );

  public readonly loading$ =
    this.state$.pipe(
      map(state => state.loading),
      distinctUntilChanged()
    );

  public readonly loaded$ =
    this.state$.pipe(
      map(state => state.loaded),
      distinctUntilChanged()
    );

  public readonly error$ =
    this.state$.pipe(
      map(state => state.error),
      distinctUntilChanged()
    );

  public get snapshot():
    PoseTaDateState {

    return this.stateSubject.value;
  }

  public get selectedClubId():
    number | null {

    const club =
      this.snapshot.selectedClub;

    return club
      ? Number(club.id)
      : null;
  }

  public get selectedSaisonId():
    number | null {

    const saison =
      this.snapshot.selectedSaison;

    return saison
      ? Number(saison.id)
      : null;
  }

  /*
   * Alimentation de l'écran de connexion.
   */

  public setConnectionData(
    clubs: Club[],
    saisons: Saison[]
  ): void {

    this.patch({
      clubs: [...clubs],
      saisons: [...saisons]
    });
  }

  /*
   * Changement de club ou de saison.
   *
   * On vide les données métier pour éviter
   * de conserver celles de l'ancienne saison.
   */

  public setContext(
    club: Club,
    saison: Saison
  ): void {

    const currentClubId =
      this.selectedClubId;

    const currentSaisonId =
      this.selectedSaisonId;

    const contextChanged =
      currentClubId !== Number(club.id) ||
      currentSaisonId !== Number(saison.id);

    this.patch({
      selectedClub: club,
      selectedSaison: saison,

      ...(contextChanged
        ? {
            ...emptyApplicationData,
            loaded: false
          }
        : {}),

      error: null
    });

    sessionStorage.setItem(
      'pose-ta-date.club',
      JSON.stringify(club)
    );

    sessionStorage.setItem(
      'pose-ta-date.saison',
      JSON.stringify(saison)
    );
  }

  /*
   * Chargement complet de la saison.
   */

  public setApplicationData(
    data: PoseTaDateApplicationData
  ): void {

    this.patch({
      calendriers: [
        ...data.calendriers
      ],

      categories: [
        ...data.categories
      ],

      creneaux: [
        ...data.creneaux
      ],

      equipesEngagees: [
        ...data.equipesEngagees
      ],

      matchs: [
        ...data.matchs
      ],

      gymnases: [
        ...data.gymnases
      ],

      loaded: true,
      error: null
    });
  }

  public setLoading(
    loading: boolean
  ): void {

    this.patch({
      loading
    });
  }

  public setError(
    error: string | null
  ): void {

    this.patch({
      error
    });
  }

  /*
   * Mise à jour instantanée des créneaux.
   *
   * Les tableaux sont toujours remplacés
   * par de nouvelles instances.
   *
   * Les composants abonnés à creneaux$
   * sont donc actualisés immédiatement.
   */

  public addCreneau(
    creneau: Creneau
  ): void {

    this.patch({
      creneaux: [
        ...this.snapshot.creneaux,
        creneau
      ]
    });
  }

  public updateCreneau(
    creneau: Creneau
  ): void {

    this.patch({
      creneaux:
        this.snapshot.creneaux.map(
          current => {
            if (
              Number(current.id) !==
              Number(creneau.id)
            ) {
              return current;
            }

            return {
              ...current,
              ...creneau
            };
          }
        )
    });
  }

  public removeCreneau(
    creneauId: number
  ): void {

    this.patch({
      creneaux:
        this.snapshot.creneaux.filter(
          creneau =>
            Number(creneau.id) !==
            Number(creneauId)
        )
    });
  }

  /*
   * Ces méthodes permettent aussi de resynchroniser
   * une liste complète après une opération complexe.
   */

  public replaceCreneaux(
    creneaux: Creneau[]
  ): void {

    this.patch({
      creneaux: [...creneaux]
    });
  }

  public replaceCategories(
    categories: Categorie[]
  ): void {

    this.patch({
      categories: [...categories]
    });
  }

  public replaceEquipesEngagees(
    equipesEngagees: EquipeEngagee[]
  ): void {

    this.patch({
      equipesEngagees: [
        ...equipesEngagees
      ]
    });
  }

  public replaceMatchs(
    matchs: Match[]
  ): void {

    this.patch({
      matchs: [...matchs]
    });
  }

  public replaceCalendriers(
    calendriers: Calendrier[]
  ): void {

    this.patch({
      calendriers: [...calendriers]
    });
  }

  public replaceGymnases(
    gymnases: Gymnase[]
  ): void {

    this.patch({
      gymnases: [...gymnases]
    });
  }

  public clearContext(): void {

    sessionStorage.removeItem(
      'pose-ta-date.club'
    );

    sessionStorage.removeItem(
      'pose-ta-date.saison'
    );

    this.stateSubject.next({
      ...initialState,

      /*
       * On garde les listes permettant
       * de rester sur l'écran de connexion.
       */
      clubs: this.snapshot.clubs,
      saisons: this.snapshot.saisons
    });
  }

  private patch(
    partialState:
      Partial<PoseTaDateState>
  ): void {

    this.stateSubject.next({
      ...this.snapshot,
      ...partialState
    });
  }

  private restoreInitialState():
    PoseTaDateState {

    try {
      const storedClub =
        sessionStorage.getItem(
          'pose-ta-date.club'
        );

      const storedSaison =
        sessionStorage.getItem(
          'pose-ta-date.saison'
        );

      return {
        ...initialState,

        selectedClub:
          storedClub
            ? JSON.parse(storedClub)
            : null,

        selectedSaison:
          storedSaison
            ? JSON.parse(storedSaison)
            : null
      };
    } catch (error) {
      console.warn(
        'Impossible de restaurer le contexte Pose Ta Date',
        error
      );

      sessionStorage.removeItem(
        'pose-ta-date.club'
      );

      sessionStorage.removeItem(
        'pose-ta-date.saison'
      );

      return {
        ...initialState
      };
    }
  }
}