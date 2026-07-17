import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { Router } from '@angular/router';

import {
  firstValueFrom,
  Subject,
  takeUntil
} from 'rxjs';

import {
  Calendrier,
  Categorie,
  Club,
  Creneau,
  EquipeEngagee,
  Gymnase,
  Match
} from 'src/app/class';

import {
  AllServices,
  Indisponibilite,
  TypeIndisponibilite
} from 'src/app/services';

import {
  PoseTaDateState,
  PoseTaDateStore,
  Saison
} from 'src/app/store/pose-ta-date.store';

import {
  CreneauPeriodique
} from 'src/app/formulaire-creneau/formulaire-creneau.component';

import {
  CreneauScore
} from 'src/app/match-planning/match-planning.component';

import {
  FiltreCalendrierValue
} from 'src/app/filtre-calendrier/filtre-calendrier.component';

type ClubTerritorial = Club & {
  pays?: number;
  zone?: string | null;
};

type CalendrierTerritorial =
  Calendrier & {
    /*
     * Dans MainComponent, les calendriers sont
     * systématiquement convertis par mapCalendriers().
     */
    date_debut: Date;
    date_fin: Date | null;

    pays: number;
    zone?: number | null;
    motif: string;
  };

type CreneauAvecConfirmation = Creneau & {
  /*
   * "confirme" reste toléré pendant la migration des anciennes données.
   * La colonne courante est bien creneau_confirme.
   */
  confirme?: boolean;
  creneau_confirme?: boolean;
  un_club?: boolean;
  saison?: number;
};

export type MatchAvecCreneau =
  Match & {
    creneau?: CreneauAvecConfirmation;
    arbitre?: number | null;
    requete_arbitre?: boolean;
    saison?: number;
  };

export class CalendrierComplet {
  date: Date = new Date();
  evenements: Evenement[] = [];
  matchs: MatchAvecCreneau[] = [];
  indisponibilites: Indisponibilite[] = [];
}

type Evenement = {
  id: number;
  type: 'jour férié' | 'vacances';
  libelle: string;
  pays: number;
  zone: string | null;
  priorite: number;
};

interface IndisponibiliteForm {
  type: TypeIndisponibilite;
  equipe: number | null;
  date_debut: string;
  date_fin: string | null;
  motif: string;
}

type MainTab =
  | 'equipes'
  | 'gymnases'
  | 'creneaux'
  | 'creneaux-proposes'
  | 'indisponibilites'
  | 'arbitrage'
  | 'matchs'
  | 'planification'
  | 'calendrier';

interface MainTabDefinition {
  id: MainTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent
  implements OnInit, OnDestroy {

  private readonly destroy$ =
    new Subject<void>();

  public readonly tabs:
    MainTabDefinition[] = [
      {
        id: 'equipes',
        label: 'Mes équipes',
        shortLabel: 'Équipes',
        description:
          'Gérer les équipes engagées par mon club.',
        icon: 'EQ'
      },
      {
        id: 'gymnases',
        label: 'Mes gymnases',
        shortLabel: 'Gymnases',
        description:
          'Gérer les lieux disponibles pour organiser les rencontres.',
        icon: 'GY'
      },
      {
        id: 'creneaux',
        label: 'Mes créneaux',
        shortLabel: 'Créneaux',
        description:
          'Créer et administrer les créneaux proposés par mon club.',
        icon: 'CR'
      },
      {
        id: 'creneaux-proposes',
        label: 'Créneaux proposés',
        shortLabel: 'Propositions',
        description:
          'Consulter les créneaux proposés par les autres clubs.',
        icon: 'CP'
      },
      {
        id: 'indisponibilites',
        label: 'Gérer mes indispos',
        shortLabel: 'Indispos',
        description:
          'Déclarer les dates auxquelles mes équipes ne peuvent pas jouer.',
        icon: 'IN'
      },
      {
        id: 'arbitrage',
        label: 'Arbitrage',
        shortLabel: 'Arbitrage',
        description:
          'Répondre aux demandes d’arbitrage et suivre mes arbitrages confirmés.',
        icon: 'AR'
      },
      {
        id: 'matchs',
        label: 'Tous les matchs',
        shortLabel: 'Matchs',
        description:
          'Consulter les rencontres et leur état de planification.',
        icon: 'MA'
      },
      {
        id: 'planification',
        label: 'Planifier mes matchs',
        shortLabel: 'Planifier',
        description:
          'Sélectionner les créneaux les plus adaptés aux rencontres.',
        icon: 'PL'
      },
      {
        id: 'calendrier',
        label: 'Calendrier complet',
        shortLabel: 'Calendrier',
        description:
          'Visualiser la saison, les matchs, vacances et jours fériés.',
        icon: 'CA'
      }
    ];

  public activeTab: MainTab = 'equipes';

  public loading = false;
  public errorMessage: string | null = null;

  public equipesEngagees: EquipeEngagee[] = [];
  public equipesEngageesFiltres: EquipeEngagee[] = [];

  public categories: Categorie[] = [];
  public clubs: Club[] = [];

  public creneaux: Creneau[] = [];
  public creneauxFiltres: Creneau[] = [];

  public gymnases: Gymnase[] = [];
  public gymnasesFiltres: Gymnase[] = [];

  public matchs: MatchAvecCreneau[] = [];
  public matchsFiltres: MatchAvecCreneau[] = [];

  public calendriers: CalendrierTerritorial[] = [];
  public calendrierComplet: CalendrierComplet[] = [];
  public calendrierCompletFiltres: CalendrierComplet[] = [];

  /*
   * Les indisponibilités ne forment pas une collection séparée :
   * elles sont dérivées des lignes de ptd_calendrier ayant un club.
   */
  public indisponibilites: Indisponibilite[] = [];
  public modeAjoutIndisponibilite = false;
  public indisponibilitesLoading = false;
  public indisponibiliteSaving = false;
  public indisponibiliteDeletingId: number | null = null;

  public nouvelleIndisponibilite:
    IndisponibiliteForm = {
    equipe: null,
    type: 'club',
    date_debut: '',
    date_fin: null,
    motif: ''
  };

  public filtreCreneauProposeClub: number | null = null;
  public filtreCreneauProposeDateDebut: string | null = null;
  public filtreCreneauProposeDateFin: string | null = null;

  private filtreCalendrierActif: FiltreCalendrierValue = {
    clubId: null,
    categorieId: null,
    equipeId: null,
    planifie: null,
    dateDebut: null,
    dateFin: null,
    afficherMatchs: true,
    afficherEvenements: true,
    afficherIndisponibilites: true,
    uniquementAvecContenu: false
  };

  public showToutes = false;

  public modeAjoutEquipe = false;

  public nouvelleEquipe: EquipeEngagee = {
    id: 0,
    nom: '',
    categorie: 0,
    club: 0
  };

  public editgymnase: Gymnase | null = null;
  public histogymnase = '';

  public modeCreneau:
    'unique' |
    'periodique' |
    null = null;

  public filterDateDebut:
    string | null = null;

  public filterDateFin:
    string | null = null;

  public filterGymnase:
    number | null = null;


  /*
   * Popin d'arbitrage utilisée depuis la liste générale des matchs.
   *
   * États persistés dans ptd_matchs :
   * - arbitre = null : aucun arbitre ;
   * - arbitre renseigné + requete_arbitre = true : proposition en attente ;
   * - arbitre renseigné + requete_arbitre = false : arbitrage confirmé.
   */
  public arbitrageModalMatch:
    MatchAvecCreneau | null = null;

  public arbitrageClubSelectionne:
    number | null = null;

  public arbitrageSaving = false;

  public arbitrageModalMessage:
    string | null = null;

  constructor(
    /*
     * AllServices recharge les données saisonnalisées
     * et alimente le store.
     */
    private readonly services: AllServices,

    /*
     * Le store est l'unique source de vérité
     * pour le contexte et les données affichées.
     */
    public readonly store: PoseTaDateStore,

    private readonly router: Router
  ) {}

  public async ngOnInit():
    Promise<void> {

    const snapshot =
      this.store.snapshot;

    if (
      !snapshot.selectedClub ||
      !snapshot.selectedSaison
    ) {
      await this.router.navigate(['/']);
      return;
    }

    this.nouvelleEquipe = {
      id: 0,
      nom: '',
      categorie: 0,
      club: this.selectedClubId
    };

    /*
     * Toute modification du store entraîne
     * une reconstruction des données de l'écran.
     */
    this.store.state$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(state => {
        this.appliquerEtatStore(state);
      });

    /*
     * Après une navigation normale depuis ClubComponent,
     * le store est déjà chargé.
     *
     * Après un F5, le contexte est restauré depuis
     * sessionStorage, mais les données doivent être relues.
     */
    if (!snapshot.loaded) {
      await this.rechargerDonneesDepuisApi();
    }

  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public get activeTabConfig():
    MainTabDefinition {

    return (
      this.tabs.find(
        tab => tab.id === this.activeTab
      ) ?? this.tabs[0]
    );
  }

  public get selectedClubId():
    number {

    return (
      this.store.selectedClubId ?? 0
    );
  }

  public get selectedSaisonId():
    number {

    return (
      this.store.selectedSaisonId ?? 0
    );
  }

  public get selectedClub():
    Club | null {

    return this.store.snapshot.selectedClub;
  }

  public get selectedSaison():
    Saison | null {

    return this.store.snapshot.selectedSaison;
  }

  public get selectedClubNom():
    string {

    return (
      this.selectedClub?.nom ??
      'Club non sélectionné'
    );
  }

  public get selectedSaisonNom():
    string {

    const saison =
      this.selectedSaison;

    if (!saison) {
      return 'Saison non sélectionnée';
    }

    if (saison.nom) {
      return saison.nom;
    }

    if (saison.libelle) {
      return saison.libelle;
    }

    return `Saison ${saison.id}`;
  }

  public get matchsPlanifies():
    number {

    return this.matchs.filter(
      match =>
        Number(match.creneau_choisi) > 0
    ).length;
  }

  public get matchsNonPlanifies():
    number {

    return this.matchs.length -
      this.matchsPlanifies;
  }

  public get creneauxProposes():
    CreneauAvecConfirmation[] {

    return (
      this.creneaux as CreneauAvecConfirmation[]
    )
      .filter(
        creneau =>
          Number(creneau.club) !==
          Number(this.selectedClubId)
      )
      .sort(
        (a, b) =>
          this.getDateTime(a.date) -
          this.getDateTime(b.date)
      );
  }

  public get creneauxProposesFiltres():
    CreneauAvecConfirmation[] {

    const dateDebut =
      this.parseDateLocal(
        this.filtreCreneauProposeDateDebut
      );

    const dateFin =
      this.parseDateLocal(
        this.filtreCreneauProposeDateFin
      );

    return this.creneauxProposes.filter(
      creneau => {
        if (
          this.filtreCreneauProposeClub &&
          Number(creneau.club) !==
            Number(
              this.filtreCreneauProposeClub
            )
        ) {
          return false;
        }

        const dateCreneau =
          this.parseDateLocal(
            creneau.date
          );

        if (!dateCreneau) {
          return false;
        }

        if (
          dateDebut &&
          dateCreneau < dateDebut
        ) {
          return false;
        }

        if (
          dateFin &&
          dateCreneau > dateFin
        ) {
          return false;
        }

        return true;
      }
    );
  }

  public get clubsAvecCreneauxProposes():
    Club[] {

    const clubIds =
      new Set(
        this.creneauxProposes.map(
          creneau =>
            Number(creneau.club)
        )
      );

    return this.clubs
      .filter(
        club =>
          clubIds.has(
            Number(club.id)
          )
      )
      .sort(
        (a, b) =>
          a.nom.localeCompare(b.nom)
      );
  }

  public get indisponibilitesDuClub():
    Indisponibilite[] {

    return this.indisponibilites
      .filter(
        indisponibilite =>
          Number(indisponibilite.club) ===
            Number(this.selectedClubId) &&
          Number(indisponibilite.saison) ===
            Number(this.selectedSaisonId)
      )
      .sort(
        (a, b) =>
          this.getDateTime(
            a.date_debut
          ) -
          this.getDateTime(
            b.date_debut
          )
      );
  }

  public get indisponibilitesClubCount():
    number {

    return this.indisponibilitesDuClub.filter(
      item =>
        item.type === 'club'
    ).length;
  }

  public get indisponibilitesEquipeCount():
    number {

    return this.indisponibilitesDuClub.filter(
      item =>
        item.type === 'equipe'
    ).length;
  }

  public get arbitragesAValider():
    MatchAvecCreneau[] {

    return this.matchs.filter(
      match =>
        Number(match.arbitre) ===
          Number(this.selectedClubId) &&
        match.requete_arbitre === true
    );
  }

  public get arbitragesConfirmes():
    MatchAvecCreneau[] {

    return this.matchs.filter(
      match =>
        Number(match.arbitre) ===
          Number(this.selectedClubId) &&
        match.requete_arbitre === false
    );
  }

  public get demandesArbitrageCount():
    number {

    return this.arbitragesAValider.length;
  }

  public getTabCount(
    tab: MainTab
  ): number | null {

    switch (tab) {
      case 'equipes':
        return this.equipesEngageesFiltres.length;

      case 'gymnases':
        return this.gymnasesFiltres.length;

      case 'creneaux':
        return this.creneauxFiltres.length;

      case 'creneaux-proposes':
        return this.creneauxProposes.length;

      case 'indisponibilites':
        return this.indisponibilitesDuClub.length;

      case 'arbitrage':
        return this.demandesArbitrageCount;

      case 'matchs':
        return this.matchs.length;

      case 'planification':
        return this.matchsNonPlanifies;

      default:
        return null;
    }
  }

  public async changerClub():
    Promise<void> {

    this.store.clearContext();

    await this.router.navigate(['/']);
  }

  private async rechargerDonneesDepuisApi():
    Promise<void> {

    try {
      await firstValueFrom(
        this.services.loadApplicationData()
      );
    } catch (error) {
      console.error(
        'Impossible de recharger les données de la saison',
        error
      );
    }
  }

  private appliquerEtatStore(
    state: PoseTaDateState
  ): void {

    this.loading =
      state.loading;

    this.errorMessage =
      state.error;

    this.clubs = [
      ...state.clubs
    ];

    this.categories = [
      ...state.categories
    ];

    this.gymnases = [
      ...state.gymnases
    ].sort(
      (a, b) =>
        a.nom.localeCompare(b.nom)
    );

    this.creneaux = [
      ...state.creneaux
    ].sort(
      (a, b) =>
        this.getDateTime(a.date) -
        this.getDateTime(b.date)
    );

    this.calendriers =
      this.mapCalendriers(
        state.calendriers
      );

    /*
     * Une seule source de vérité :
     * toutes les indisponibilités proviennent de ptd_calendrier.
     */
    this.indisponibilites =
      this.services
        .extraireIndisponibilites(
          this.calendriers as any
        );

    this.equipesEngagees = [
      ...state.equipesEngagees
    ].sort(
      (a, b) => {
        const categorieA =
          this.getCategorieNom(
            a.categorie
          );

        const categorieB =
          this.getCategorieNom(
            b.categorie
          );

        const comparaisonCategorie =
          categorieA.localeCompare(
            categorieB
          );

        if (
          comparaisonCategorie !== 0
        ) {
          return comparaisonCategorie;
        }

        return a.nom.localeCompare(
          b.nom
        );
      }
    );

    this.equipesEngageesFiltres =
      this.equipesEngagees.filter(
        equipe =>
          Number(equipe.club) ===
          Number(this.selectedClubId)
      );

    this.gymnasesFiltres =
      this.gymnases.filter(
        gymnase =>
          Number(gymnase.club) ===
          Number(this.selectedClubId)
      );

    this.creneauxFiltres =
      this.creneaux.filter(
        creneau =>
          Number(creneau.club) ===
          Number(this.selectedClubId)
      );

    this.matchs =
      this.enrichirEtTrierMatchs(
        state.matchs
      );

    this.matchsFiltres = [
      ...this.matchs
    ];

    this.calendrierComplet =
      this.enrichirCalendrier();

    this.rafraichirCalendrierFiltre();
  }

  public setActiveTab(
    tab: MainTab
  ): void {

    this.activeTab = tab;

    this.modeAjoutEquipe = false;
    this.modeCreneau = null;
    this.editgymnase = null;
    this.fermerArbitrageModal();
  }

  public toggleVoirToutes(): void {
    this.showToutes = !this.showToutes;
  }

  public async creerEquipe():
    Promise<void> {

    if (
      !this.nouvelleEquipe.nom.trim() ||
      !this.nouvelleEquipe.categorie
    ) {
      return;
    }

    const categorieId =
      Number(
        this.nouvelleEquipe.categorie
      );

    try {
      await firstValueFrom(
        this.services.createEquipe({
          ...this.nouvelleEquipe,
          club:
            this.selectedClubId
        })
      );

      this.nouvelleEquipe = {
        id: 0,
        nom: '',
        categorie: 0,
        club:
          this.selectedClubId
      };

      this.modeAjoutEquipe = false;

      const categorie =
        this.categories.find(
          item =>
            Number(item.id) ===
            categorieId
        );

      if (
        categorie &&
        categorie.nom !== 'CDF'
      ) {
        await this.genererMatchsPourCategorie(
          categorieId
        );
      }
    } catch (error) {
      console.error(
        'Erreur lors de la création de l’équipe',
        error
      );
    }
  }

  public async supprimerEquipe(
    equipe: EquipeEngagee
  ): Promise<void> {

    const confirmation =
      window.confirm(
        `Supprimer l’équipe « ${equipe.nom} » et ses matchs associés ?`
      );

    if (!confirmation) {
      return;
    }

    try {
      const matchsASupprimer =
        this.matchs.filter(
          match =>
            Number(match.domicile) ===
              Number(equipe.id) ||
            Number(match.exterieur) ===
              Number(equipe.id)
        );

      for (
        const match of matchsASupprimer
      ) {
        await firstValueFrom(
          this.services.deleteMatch(
            match.id
          )
        );
      }

      await firstValueFrom(
        this.services.deleteEquipe(
          equipe.id
        )
      );
    } catch (error) {
      console.error(
        'Erreur lors de la suppression de l’équipe',
        error
      );
    }
  }

  public async genererMatchsPourCategorie(
    categorieId: number
  ): Promise<void> {

    const equipes =
      this.store.snapshot
        .equipesEngagees
        .filter(
          equipe =>
            Number(equipe.categorie) ===
            Number(categorieId)
        );

    const existingMatchKeys =
      new Set(
        this.store.snapshot
          .matchs
          .filter(
            match =>
              Number(match.categorie) ===
              Number(categorieId)
          )
          .map(
            match =>
              `${match.domicile}-${match.exterieur}`
          )
      );

    for (
      let i = 0;
      i < equipes.length;
      i++
    ) {
      for (
        let j = 0;
        j < equipes.length;
        j++
      ) {
        if (i === j) {
          continue;
        }

        const domicile =
          equipes[i];

        const exterieur =
          equipes[j];

        const key =
          `${domicile.id}-${exterieur.id}`;

        if (
          existingMatchKeys.has(key)
        ) {
          continue;
        }

        existingMatchKeys.add(key);

        await firstValueFrom(
          this.services.createMatch({
            id: 0,
            categorie:
              categorieId,
            domicile:
              domicile.id,
            exterieur:
              exterieur.id,
            creneau_choisi:
              0,
            club_recevant:
              domicile.club,
            arbitre:
              null,
            requete_arbitre:
              false
          } as Match)
        );
      }
    }
  }

  private enrichirEtTrierMatchs(
    matchs: Match[]
  ): MatchAvecCreneau[] {

    return matchs
      .map(
        match => ({
          ...match,

          creneau:
            this.creneaux.find(
              creneau =>
                Number(creneau.id) ===
                Number(
                  match.creneau_choisi
                )
            )
        })
      )
      .sort(
        (a, b) => {
          const dateA =
            a.creneau?.date
              ? this.getDateTime(
                  a.creneau.date
                )
              : Infinity;

          const dateB =
            b.creneau?.date
              ? this.getDateTime(
                  b.creneau.date
                )
              : Infinity;

          return dateA - dateB;
        }
      );
  }

  public async updateCreneau(
    creneau: Creneau
  ): Promise<void> {

    try {
      await firstValueFrom(
        this.services.updateCreneau(
          creneau.id,
          {
            ...creneau,

            date:
              this.normaliserDateApi(
                creneau.date
              )
          }
        )
      );
    } catch (error) {
      console.error(
        'Erreur lors de la mise à jour du créneau',
        error
      );
    }
  }

  public async confirmerSuppressionCreneau(
    creneau: Creneau
  ): Promise<void> {

    const matchsLies =
      this.getMatchsPourCreneau(
        creneau.id
      );

    const message =
      matchsLies.length > 0
        ? 'Ce créneau contient des matchs. Ils seront remis en attente. Continuer ?'
        : 'Supprimer ce créneau ?';

    if (!window.confirm(message)) {
      return;
    }

    try {
      for (
        const match of matchsLies
      ) {
        const {
          creneau:
            _creneauFront,
          ...matchPersistable
        } = match;

        await firstValueFrom(
          this.services.updateMatch(
            match.id,
            {
              ...matchPersistable,
              creneau_choisi: 0
            }
          )
        );
      }

      await firstValueFrom(
        this.services.deleteCreneau(
          creneau.id
        )
      );
    } catch (error) {
      console.error(
        'Erreur lors de la suppression du créneau',
        error
      );
    }
  }

  public modifierCreneau(
    creneau: Creneau
  ): void {

    /*
     * Le formulaire historique ne gère pas encore
     * explicitement l'objet en modification.
     */
    this.modeCreneau = 'unique';

    console.info(
      'Créneau sélectionné pour modification',
      creneau
    );
  }

  public async rafraichirCreneaux():
    Promise<void> {

    /*
     * Les écritures passent par AllServices :
     * le store est déjà à jour.
     */
    this.modeCreneau = null;
  }

  public async CreerPeriodique(
    data: CreneauPeriodique
  ): Promise<void> {

    const jourSemaine =
      this.convertirJourEnNumero(
        data.jour
      );

    const dateCourante =
      this.parseDateLocal(
        data.dateDebut
      );

    const dateFin =
      this.parseDateLocal(
        data.dateFin
      );

    if (
      !dateCourante ||
      !dateFin ||
      jourSemaine < 0
    ) {
      return;
    }

    const avertissements:
      string[] = [];

    while (
      dateCourante <= dateFin
    ) {
      if (
        dateCourante.getDay() ===
        jourSemaine
      ) {
        const dateDuCreneau =
          new Date(dateCourante);

        const club =
          this.clubs.find(
            item =>
              Number(item.id) ===
              Number(this.selectedClubId)
          ) as
            ClubTerritorial |
            undefined;

        const estVacances =
          club
            ? this.checksiVacances(
                dateDuCreneau,
                club
              )
            : false;

        const estJourFerie =
          club
            ? this.checksiFerie(
                dateDuCreneau,
                club
              )
            : false;

        const doitCreer =
          (
            estJourFerie &&
            Boolean(data.joursFeries)
          ) ||
          (
            estVacances &&
            Boolean(data.vacances)
          ) ||
          (
            !estJourFerie &&
            !estVacances
          );

        const existeDeja =
          this.creneaux.some(
            creneau =>
              Number(creneau.club) ===
                Number(
                  this.selectedClubId
                ) &&
              this.sameDay(
                this.parseDateLocal(
                  creneau.date
                ),
                dateDuCreneau
              )
          );

        if (existeDeja) {
          avertissements.push(
            `Un créneau existe déjà le ${dateDuCreneau.toLocaleDateString()}.`
          );
        }

        if (doitCreer) {
          try {
            await firstValueFrom(
              this.services.createCreneau({
                id: 0,

                date:
                  this.normaliserDateApi(
                    dateDuCreneau
                  ),

                heure_debut:
                  data.heureDebut,

                heure_fin:
                  data.heureFin,

                club:
                  this.selectedClubId,

                gymnase:
                  data.gymnase,

                notes:
                  data.notes,

                creneau_confirme:
                  Boolean(
                    (
                      data as
                        CreneauPeriodique & {
                          creneau_confirme?:
                            boolean;
                        }
                    ).creneau_confirme
                  ),

                un_club:
                  Boolean(
                    (
                      data as
                        CreneauPeriodique & {
                          un_club?:
                            boolean;
                        }
                    ).un_club
                  )
              } as Partial<Creneau>)
            );
          } catch (error) {
            console.error(
              `Erreur de création du créneau du ${this.toApiDate(dateDuCreneau)}`,
              error
            );
          }
        }
      }

      dateCourante.setDate(
        dateCourante.getDate() + 1
      );
    }

    this.modeCreneau = null;

    if (
      avertissements.length > 0
    ) {
      window.alert(
        avertissements.join('\n')
      );
    }
  }

  private normaliserDateApi(
  value: Date | string
): Date {

  const date =
    this.parseDateLocal(value);

  if (!date) {
    throw new Error(
      `Date de créneau invalide : ${value}`
    );
  }

  /*
   * Midi évite qu'une conversion UTC fasse basculer
   * la date sur le jour précédent.
   */
  date.setHours(
    12,
    0,
    0,
    0
  );

  return date;
}

  public convertirJourEnNumero(
    jour: string
  ): number {

    const jours = [
      'dimanche',
      'lundi',
      'mardi',
      'mercredi',
      'jeudi',
      'vendredi',
      'samedi'
    ];

    return jours.indexOf(
      jour.toLowerCase()
    );
  }

  public resetFilters(): void {
    this.filterDateDebut = null;
    this.filterDateFin = null;
    this.filterGymnase = null;
  }

  public majFiltres(
    filtre: FiltreCalendrierValue
  ): void {

    this.matchsFiltres =
      this.matchs.filter(
        match =>
          this.matchCorrespondAuFiltre(
            match,
            filtre
          )
      );
  }

  public majFiltresCalendrier(
    filtre: FiltreCalendrierValue
  ): void {

    this.filtreCalendrierActif = {
      ...filtre
    };

    this.rafraichirCalendrierFiltre();
  }

  private rafraichirCalendrierFiltre():
    void {

    const filtre =
      this.filtreCalendrierActif;

    const dateDebut =
      this.parseDateLocal(
        filtre.dateDebut
      );

    const dateFin =
      this.parseDateLocal(
        filtre.dateFin
      );

    this.calendrierCompletFiltres =
      this.calendrierComplet
        .filter(
          jour => {
            if (
              dateDebut &&
              jour.date < dateDebut
            ) {
              return false;
            }

            if (
              dateFin &&
              jour.date > dateFin
            ) {
              return false;
            }

            return true;
          }
        )
        .map(
          jour => {
            const matchs =
              filtre.afficherMatchs
                ? jour.matchs.filter(
                    match =>
                      this.matchCorrespondAuFiltre(
                        match,
                        filtre
                      )
                  )
                : [];

            const evenements =
              filtre.afficherEvenements
                ? jour.evenements.filter(
                    evenement => {
                      if (!filtre.clubId) {
                        return true;
                      }

                      const club =
                        this.clubs.find(
                          item =>
                            Number(item.id) ===
                            Number(filtre.clubId)
                        ) as
                          ClubTerritorial |
                          undefined;

                      return this.evenementConcerneClub(
                        evenement,
                        club
                      );
                    }
                  )
                : [];

            const indisponibilites =
              filtre.afficherIndisponibilites
                ? jour.indisponibilites.filter(
                    indisponibilite => {
                      if (
                        filtre.clubId &&
                        Number(
                          indisponibilite.club
                        ) !==
                          Number(
                            filtre.clubId
                          )
                      ) {
                        return false;
                      }

                      if (
                        filtre.equipeId &&
                        Number(
                          indisponibilite.equipe
                        ) !==
                          Number(
                            filtre.equipeId
                          )
                      ) {
                        return false;
                      }

                      return true;
                    }
                  )
                : [];

            return {
              ...jour,
              matchs,
              evenements,
              indisponibilites
            };
          }
        )
        .filter(
          jour =>
            !filtre.uniquementAvecContenu ||
            jour.matchs.length > 0 ||
            jour.evenements.length > 0 ||
            jour.indisponibilites.length > 0
        );
  }

  private matchCorrespondAuFiltre(
    match: MatchAvecCreneau,
    filtre: FiltreCalendrierValue
  ): boolean {

    if (
      filtre.categorieId &&
      Number(
        filtre.categorieId
      ) !==
        Number(match.categorie)
    ) {
      return false;
    }

    if (
      filtre.equipeId &&
      Number(filtre.equipeId) !==
        Number(match.domicile) &&
      Number(filtre.equipeId) !==
        Number(match.exterieur)
    ) {
      return false;
    }

    if (
      filtre.planifie !== null &&
      filtre.planifie !== undefined
    ) {
      const estPlanifie =
        Number(
          match.creneau_choisi
        ) > 0;

      if (
        estPlanifie !==
        filtre.planifie
      ) {
        return false;
      }
    }

    if (filtre.clubId) {
      const equipeDomicile =
        this.equipesEngagees.find(
          equipe =>
            Number(equipe.id) ===
            Number(match.domicile)
        );

      const equipeExterieure =
        this.equipesEngagees.find(
          equipe =>
            Number(equipe.id) ===
            Number(match.exterieur)
        );

      if (
        Number(
          equipeDomicile?.club
        ) !==
          Number(filtre.clubId) &&
        Number(
          equipeExterieure?.club
        ) !==
          Number(filtre.clubId)
      ) {
        return false;
      }
    }

    return true;
  }

  public resetFiltresCreneauxProposes():
    void {

    this.filtreCreneauProposeClub = null;
    this.filtreCreneauProposeDateDebut = null;
    this.filtreCreneauProposeDateFin = null;
  }

  public isCreneauConfirme(
    creneau: Creneau
  ): boolean {

    const typed =
      creneau as CreneauAvecConfirmation;

    return (
      typed.creneau_confirme === true ||
      (
        typed.creneau_confirme ===
          undefined &&
        typed.confirme === true
      )
    );
  }

  public isCreneauUnClub(
    creneau: Creneau
  ): boolean {

    return (
      (
        creneau as
          CreneauAvecConfirmation
      ).un_club === true
    );
  }

  public async toggleCreneauConfirme(
    creneau: Creneau
  ): Promise<void> {

    const original =
      creneau as
        CreneauAvecConfirmation;

    const payload:
      CreneauAvecConfirmation = {
      ...original,

      creneau_confirme:
        !this.isCreneauConfirme(
          creneau
        )
    };

    delete payload.confirme;

    try {
      await firstValueFrom(
        this.services.updateCreneau(
          creneau.id,
          payload
        )
      );
    } catch (error) {
      console.error(
        'Erreur lors de la confirmation du créneau',
        error
      );
    }
  }

  public ouvrirAjoutIndisponibilite(
    type:
      TypeIndisponibilite = 'club'
  ): void {

    const bornes =
      this.getBornesSaison();

    this.nouvelleIndisponibilite = {
      type,
      equipe:
        type === 'equipe'
          ? (
              this.equipesEngageesFiltres[0]
                ?.id ??
              null
            )
          : null,
      date_debut:
        bornes
          ? this.toApiDate(
              bornes.debut
            )
          : '',
      date_fin: null,
      motif: ''
    };

    this.modeAjoutIndisponibilite = true;
  }

  public fermerAjoutIndisponibilite():
    void {

    this.modeAjoutIndisponibilite = false;
  }

  public async ajouterIndisponibilite():
    Promise<void> {

    const form =
      this.nouvelleIndisponibilite;

    if (!form.date_debut) {
      window.alert(
        'La date de début est obligatoire.'
      );
      return;
    }

    if (
      form.date_fin &&
      form.date_fin <
        form.date_debut
    ) {
      window.alert(
        'La date de fin doit être postérieure à la date de début.'
      );
      return;
    }

    if (
      form.type === 'equipe' &&
      !form.equipe
    ) {
      window.alert(
        'Sélectionnez une équipe.'
      );
      return;
    }

    this.indisponibiliteSaving =
      true;

    try {
      /*
       * AllServices écrit dans /api/calendrier puis
       * ajoute la ligne créée dans le store.
       * La souscription au store reconstruit ensuite
       * automatiquement indisponibilites et calendrierComplet.
       */
      await firstValueFrom(
        this.services
          .createIndisponibilite({
            club:
              this.selectedClubId,

            equipe:
              form.type === 'equipe'
                ? Number(form.equipe)
                : null,

            type:
              form.type,

            date_debut:
              form.date_debut,

            date_fin:
              form.date_fin ||
              null,

            motif:
              form.motif.trim() ||
              (
                form.type === 'equipe'
                  ? 'Équipe indisponible'
                  : 'Club indisponible'
              )
          })
      );

      this.fermerAjoutIndisponibilite();
    } catch (error) {
      console.error(
        'Erreur lors de la création de l’indisponibilité',
        error
      );

      window.alert(
        'Impossible d’enregistrer l’indisponibilité dans le calendrier.'
      );
    } finally {
      this.indisponibiliteSaving =
        false;
    }
  }

  public async supprimerIndisponibilite(
    indisponibilite:
      Indisponibilite
  ): Promise<void> {

    const confirmation =
      window.confirm(
        `Supprimer l’indisponibilité « ${indisponibilite.motif} » ?`
      );

    if (!confirmation) {
      return;
    }

    this.indisponibiliteDeletingId =
      indisponibilite.id;

    try {
      /*
       * Suppression de la ligne ptd_calendrier.
       * AllServices retire ensuite cette ligne du store.
       */
      await firstValueFrom(
        this.services
          .deleteIndisponibilite(
            indisponibilite.id
          )
      );
    } catch (error) {
      console.error(
        'Erreur lors de la suppression de l’indisponibilité',
        error
      );

      window.alert(
        'Impossible de supprimer l’indisponibilité du calendrier.'
      );
    } finally {
      this.indisponibiliteDeletingId =
        null;
    }
  }

  public getCibleIndisponibilite(
    indisponibilite:
      Indisponibilite
  ): string {

    if (
      indisponibilite.type ===
        'equipe' &&
      indisponibilite.equipe
    ) {
      return this.getEquipeNom(
        indisponibilite.equipe
      );
    }

    return this.getNomClub(
      indisponibilite.club
    );
  }

  public getPeriodeIndisponibilite(
    indisponibilite:
      Indisponibilite
  ): string {

    const debut =
      this.parseDateLocal(
        indisponibilite.date_debut
      );

    const fin =
      this.parseDateLocal(
        indisponibilite.date_fin
      );

    if (!debut) {
      return 'Date inconnue';
    }

    if (
      !fin ||
      this.sameDay(debut, fin)
    ) {
      return debut.toLocaleDateString(
        'fr-FR'
      );
    }

    return (
      `${debut.toLocaleDateString('fr-FR')}` +
      ` → ${fin.toLocaleDateString('fr-FR')}`
    );
  }

  public ouvrirArbitrageModal(
    match: MatchAvecCreneau
  ): void {

    this.arbitrageModalMatch =
      match;

    this.arbitrageClubSelectionne =
      match.arbitre
        ? Number(match.arbitre)
        : null;

    this.arbitrageModalMessage =
      null;
  }

  public fermerArbitrageModal():
    void {

    if (this.arbitrageSaving) {
      return;
    }

    this.arbitrageModalMatch =
      null;

    this.arbitrageClubSelectionne =
      null;

    this.arbitrageModalMessage =
      null;
  }

  public get clubsArbitresDisponibles():
    Club[] {

    const match =
      this.arbitrageModalMatch;

    if (!match) {
      return [];
    }

    const clubsParticipants =
      new Set<number>();

    const clubDomicile =
      this.getClubEquipe(
        match.domicile
      );

    const clubExterieur =
      this.getClubEquipe(
        match.exterieur
      );

    if (clubDomicile !== null) {
      clubsParticipants.add(
        clubDomicile
      );
    }

    if (clubExterieur !== null) {
      clubsParticipants.add(
        clubExterieur
      );
    }

    return this.clubs
      .filter(
        club =>
          !clubsParticipants.has(
            Number(club.id)
          )
      )
      .sort(
        (a, b) =>
          a.nom.localeCompare(
            b.nom,
            'fr-FR'
          )
      );
  }

  public estMatchDeMonClub(
    match: MatchAvecCreneau
  ): boolean {

    const clubDomicile =
      this.getClubEquipe(
        match.domicile
      );

    const clubExterieur =
      this.getClubEquipe(
        match.exterieur
      );

    return (
      Number(clubDomicile) ===
        Number(this.selectedClubId) ||
      Number(clubExterieur) ===
        Number(this.selectedClubId)
    );
  }

  public estArbitreDeMonClub(
    match: MatchAvecCreneau
  ): boolean {

    return (
      Number(match.arbitre) > 0 &&
      Number(match.arbitre) ===
        Number(this.selectedClubId)
    );
  }

  public arbitrageEnAttente(
    match: MatchAvecCreneau
  ): boolean {

    return (
      Number(match.arbitre) > 0 &&
      match.requete_arbitre === true
    );
  }

  public arbitrageConfirme(
    match: MatchAvecCreneau
  ): boolean {

    return (
      Number(match.arbitre) > 0 &&
      match.requete_arbitre === false
    );
  }

  public getLibelleArbitrage(
    match: MatchAvecCreneau
  ): string {

    if (this.arbitrageConfirme(match)) {
      return 'Arbitre confirmé';
    }

    if (this.arbitrageEnAttente(match)) {
      return 'Arbitre proposé';
    }

    return this.estMatchDeMonClub(match)
      ? 'Demander un arbitre'
      : 'Se proposer';
  }

  public getSousLibelleArbitrage(
    match: MatchAvecCreneau
  ): string {

    if (Number(match.arbitre) > 0) {
      return this.getNomArbitre(
        match
      );
    }

    return this.estMatchDeMonClub(match)
      ? 'Choisir un club'
      : 'Arbitrer ce match';
  }

  public getIconeArbitrage(
    match: MatchAvecCreneau
  ): string {

    if (this.arbitrageConfirme(match)) {
      return '✓';
    }

    if (this.arbitrageEnAttente(match)) {
      return '?';
    }

    return 'AR';
  }

  public getNomArbitre(
    match: MatchAvecCreneau
  ): string {

    if (!match.arbitre) {
      return 'Aucun arbitre';
    }

    return this.getNomClub(
      Number(match.arbitre)
    );
  }

  public getClubEquipe(
    equipeId: number
  ): number | null {

    const equipe =
      this.equipesEngagees.find(
        item =>
          Number(item.id) ===
          Number(equipeId)
      );

    return equipe
      ? Number(equipe.club)
      : null;
  }

  public async envoyerDemandeArbitrage():
    Promise<void> {

    const match =
      this.arbitrageModalMatch;

    if (!match) {
      return;
    }

    if (!this.estMatchDeMonClub(match)) {
      this.arbitrageModalMessage =
        'Seul un club participant peut envoyer une demande d’arbitrage.';

      return;
    }

    const arbitre =
      Number(
        this.arbitrageClubSelectionne
      );

    if (!arbitre) {
      this.arbitrageModalMessage =
        'Sélectionnez le club auquel envoyer la demande.';

      return;
    }

    const clubAutorise =
      this.clubsArbitresDisponibles.some(
        club =>
          Number(club.id) ===
          arbitre
      );

    if (!clubAutorise) {
      this.arbitrageModalMessage =
        'Le club arbitre ne peut pas être l’un des clubs participant au match.';

      return;
    }

    const updated =
      await this.mettreAJourArbitrage(
        match,
        {
          arbitre,
          requete_arbitre: true
        }
      );

    if (updated) {
      this.fermerArbitrageModal();
    }
  }

  public async seProposerArbitrage():
    Promise<void> {

    const match =
      this.arbitrageModalMatch;

    if (!match) {
      return;
    }

    if (this.estMatchDeMonClub(match)) {
      this.arbitrageModalMessage =
        'Un club ne peut pas arbitrer une rencontre à laquelle il participe.';

      return;
    }

    if (Number(match.arbitre) > 0) {
      this.arbitrageModalMessage =
        'Un arbitre est déjà proposé ou confirmé pour ce match.';

      return;
    }

    const updated =
      await this.mettreAJourArbitrage(
        match,
        {
          arbitre:
            this.selectedClubId,
          requete_arbitre: true
        }
      );

    if (updated) {
      this.fermerArbitrageModal();
    }
  }

  public async validerArbitrage(
    match: MatchAvecCreneau
  ): Promise<void> {

    const updated =
      await this.mettreAJourArbitrage(
        match,
        {
          arbitre:
            Number(match.arbitre) ||
            this.selectedClubId,
          requete_arbitre: false
        }
      );

    if (
      updated &&
      Number(
        this.arbitrageModalMatch?.id
      ) === Number(match.id)
    ) {
      this.fermerArbitrageModal();
    }
  }

  public async refuserArbitrage(
    match: MatchAvecCreneau
  ): Promise<void> {

    const updated =
      await this.mettreAJourArbitrage(
        match,
        {
          arbitre: null,
          requete_arbitre: false
        }
      );

    if (
      updated &&
      Number(
        this.arbitrageModalMatch?.id
      ) === Number(match.id)
    ) {
      this.fermerArbitrageModal();
    }
  }

  public async retirerArbitre(
    match: MatchAvecCreneau
  ): Promise<void> {

    if (
      !this.estMatchDeMonClub(match) &&
      !this.estArbitreDeMonClub(match)
    ) {
      return;
    }

    const confirmation =
      window.confirm(
        this.arbitrageConfirme(match)
          ? 'Retirer l’arbitre confirmé de cette rencontre ?'
          : 'Annuler cette proposition d’arbitrage ?'
      );

    if (!confirmation) {
      return;
    }

    const updated =
      await this.mettreAJourArbitrage(
        match,
        {
          arbitre: null,
          requete_arbitre: false
        }
      );

    if (updated) {
      this.fermerArbitrageModal();
    }
  }

  private async mettreAJourArbitrage(
    match: MatchAvecCreneau,
    modification: {
      arbitre:
        number |
        null;
      requete_arbitre: boolean;
    }
  ): Promise<boolean> {

    if (this.arbitrageSaving) {
      return false;
    }

    const {
      creneau:
        _creneauFront,
      ...matchPersistable
    } = match;

    this.arbitrageSaving = true;
    this.arbitrageModalMessage = null;

    try {
      await firstValueFrom(
        this.services.updateMatch(
          match.id,
          {
            ...matchPersistable,
            ...modification
          }
        )
      );

      return true;
    } catch (error: any) {
      console.error(
        'Erreur lors de la mise à jour de l’arbitrage',
        error
      );

      const message =
        error?.error?.message ??
        error?.message ??
        'Impossible de mettre à jour l’arbitrage.';

      this.arbitrageModalMessage =
        message;

      this.errorMessage =
        message;

      return false;
    } finally {
      this.arbitrageSaving = false;
    }
  }

  public getDateArbitrage(
    match: MatchAvecCreneau
  ): string {

    return this.getDateMatch(match);
  }

  public getDateMatch(
    match: MatchAvecCreneau
  ): string {

    if (!match.creneau?.date) {
      return '—';
    }

    const date =
      this.parseDateLocal(
        match.creneau.date
      );

    return date
      ? date.toLocaleDateString()
      : '—';
  }

  public getCategorieNom(
    id: number
  ): string {

    return (
      this.categories.find(
        categorie =>
          Number(categorie.id) ===
          Number(id)
      )?.nom ??
      'N/C'
    );
  }

  public getEquipeNom(
    id: number
  ): string {

    return (
      this.equipesEngagees.find(
        equipe =>
          Number(equipe.id) ===
          Number(id)
      )?.nom ??
      'N/C'
    );
  }

  public getNomClub(
    id: number
  ): string {

    return (
      this.clubs.find(
        club =>
          Number(club.id) ===
          Number(id)
      )?.nom ??
      'N/C'
    );
  }

  public getNomClubCreneau(
    creneau: Creneau
  ): string {

    return this.getNomClub(
      creneau.club
    );
  }

public getGymnase(
  match: MatchAvecCreneau
): string {

  if (!match.creneau) {
    return '—';
  }

  return this.getGymnaseList(
    match.creneau.gymnase
  );
}

public getGymnaseList(
  reference:
    number |
    string |
    null |
    undefined
): string {

  if (
    reference === null ||
    reference === undefined ||
    reference === ''
  ) {
    return '—';
  }

  const valeur =
    String(reference).trim();

  if (!valeur) {
    return '—';
  }

  /*
   * Cas normal : le varchar contient l'identifiant
   * du gymnase, par exemple "3".
   */
  const id =
    Number(valeur);

  if (Number.isFinite(id)) {
    const gymnaseParId =
      this.gymnases.find(
        gymnase =>
          Number(gymnase.id) === id
      );

    if (gymnaseParId?.nom) {
      return gymnaseParId.nom;
    }
  }  const gymnaseParNom =
    this.gymnases.find(
      gymnase =>
        gymnase.nom
          .trim()
          .toLocaleLowerCase('fr-FR') ===
        valeur.toLocaleLowerCase('fr-FR')
    );

  return (
    gymnaseParNom?.nom ??
    valeur
  );
}

  public getMatchsPourCreneau(
    creneauId: number
  ): MatchAvecCreneau[] {

    return this.matchs.filter(
      match =>
        Number(
          match.creneau_choisi
        ) ===
        Number(creneauId)
    );
  }

  public aDesMatchs(
    creneauId: number
  ): boolean {

    return (
      this.getMatchsPourCreneau(
        creneauId
      ).length > 0
    );
  }

  public ModifierNomGymnase(
    gymnase: Gymnase
  ): void {

    this.editgymnase = {
      ...gymnase
    };

    this.histogymnase =
      JSON.stringify(gymnase);
  }

  public RetourGymnase(): void {
    this.editgymnase = null;
    this.histogymnase = '';
  }

  public async ValiderGymnase():
    Promise<void> {

    if (!this.editgymnase) {
      return;
    }

    if (
      this.histogymnase ===
      JSON.stringify(
        this.editgymnase
      )
    ) {
      this.RetourGymnase();
      return;
    }

    try {
      if (
        Number(this.editgymnase.id) > 0
      ) {
        await firstValueFrom(
          this.services.updateGymnase(
            this.editgymnase.id,
            this.editgymnase
          )
        );
      } else {
        await firstValueFrom(
          this.services.createGymnase({
            ...this.editgymnase,
            club:
              this.selectedClubId
          })
        );
      }

      this.RetourGymnase();
    } catch (error) {
      console.error(
        'Erreur lors de l’enregistrement du gymnase',
        error
      );
    }
  }

  public CreerGymnase(): void {
    this.editgymnase = {
      id: 0,
      nom: '',
      club:
        this.selectedClubId
    };
  }

  public async SupprimerGymnase(
    gymnase: Gymnase
  ): Promise<void> {

    if (
      !window.confirm(
        `Supprimer le gymnase « ${gymnase.nom} » ?`
      )
    ) {
      return;
    }

    try {
      await firstValueFrom(
        this.services.deleteGymnase(
          gymnase.id
        )
      );
    } catch (error) {
      console.error(
        'Erreur lors de la suppression du gymnase',
        error
      );
    }
  }

  public mapCalendriers(
    calendriers: any[]
  ): CalendrierTerritorial[] {

    return calendriers.map(
      calendrier => ({
        ...calendrier,

        date_debut:
          this.parseDateLocal(
            calendrier.date_debut
          ),

        date_fin:
          calendrier.date_fin
            ? this.parseDateLocal(
                calendrier.date_fin
              )
            : null,

        zone:
          calendrier.zone === null ||
          calendrier.zone === undefined ||
          String(calendrier.zone).trim() === ''
            ? null
            : String(
                calendrier.zone
              )
                .trim()
                .toUpperCase()
      })
    );
  }

  private enrichirCalendrier():
    CalendrierComplet[] {

    const bornes =
      this.getBornesSaison();

    if (!bornes) {
      return [];
    }

    const calendrierComplet:
      CalendrierComplet[] = [];

    const date =
      new Date(bornes.debut);

    /*
     * Les lignes ayant club ou equipe sont des indisponibilités.
     * Elles ne doivent surtout pas être affichées une seconde fois
     * comme jours fériés ou vacances.
     */
const calendriersGeneraux =
  this.calendriers.filter(
    calendrier =>
      !calendrier.club &&
      !calendrier.equipe
  );

    while (
      date <= bornes.fin
    ) {
      const jour =
        new CalendrierComplet();

      jour.date =
        new Date(date);

      const feries =
        calendriersGeneraux.filter(
          calendrier =>
            calendrier.date_debut &&
            !calendrier.date_fin &&
            this.sameDay(
              date,
              calendrier.date_debut
            )
        );

      for (const ferie of feries) {
        jour.evenements.push({
          id: ferie.id,
          type: 'jour férié',
          pays: Number(ferie.pays),
          zone:
            ferie.zone ?? null,
          priorite: 3,
          libelle:
            ferie.motif ||
            `Jour férié – ${this.getTerritoireLibelle(
              Number(ferie.pays),
              ferie.zone
            )}`
        });
      }

      const vacances =
        this.calendriers.filter(
          calendrier =>
            calendrier.date_debut &&
            calendrier.date_fin &&
            this.plageDay(
              date,
              calendrier.date_debut,
              calendrier.date_fin
            )
        );

      for (
        const vacance of vacances
      ) {
        jour.evenements.push({
          id: vacance.id,
          type: 'vacances',
          pays: Number(vacance.pays),
          zone:
            vacance.zone ?? null,
          priorite: 3,
          libelle:
            vacance.motif ||
            `Vacances – ${this.getTerritoireLibelle(
              Number(vacance.pays),
              vacance.zone
            )}`
        });
      }

      jour.matchs =
        this.matchs.filter(
          match =>
            match.creneau?.date &&
            this.sameDay(
              date,
              this.parseDateLocal(
                match.creneau.date
              )
            )
        );

      jour.indisponibilites =
        this.indisponibilites.filter(
          indisponibilite =>
            this.dateDansPeriode(
              date,
              indisponibilite.date_debut,
              indisponibilite.date_fin
            )
        );

      calendrierComplet.push(
        jour
      );

      date.setDate(
        date.getDate() + 1
      );
    }

    return calendrierComplet;
  }

  private getBornesSaison():
    {
      debut: Date;
      fin: Date;
    } | null {

    const saison =
      this.selectedSaison;

    if (
      !saison?.date_debut ||
      !saison?.date_fin
    ) {
      return null;
    }

    const debut =
      this.parseDateLocal(
        saison.date_debut
      );

    const fin =
      this.parseDateLocal(
        saison.date_fin
      );

    if (!debut || !fin) {
      return null;
    }

    return {
      debut,
      fin
    };
  }

  public getPaysLibelle(
    pays: number
  ): string {

    switch (Number(pays)) {
      case 1:
        return 'France';

      case 2:
        return 'Belgique';

      default:
        return `Pays ${pays}`;
    }
  }

  public getZoneLibelle(
    zone:
      string |
      null |
      undefined
  ): string {

    switch (
      String(zone ?? '')
        .trim()
        .toUpperCase()
    ) {
      case 'A':
        return 'Zone A';

      case 'B':
        return 'Zone B';

      case 'C':
        return 'Zone C';

      default:
        return 'Toutes zones';
    }
  }

  public getTerritoireLibelle(
    pays: number,
    zone:
      string |
      null |
      undefined
  ): string {

    const paysLibelle =
      this.getPaysLibelle(pays);

    const zoneNormalisee =
      String(zone ?? '')
        .trim()
        .toUpperCase();

    if (
      Number(pays) !== 1 ||
      !zoneNormalisee
    ) {
      return paysLibelle;
    }

    return (
      `${paysLibelle} – ` +
      this.getZoneLibelle(
        zoneNormalisee
      )
    );
  }

  private evenementConcerneClub(
    evenement: Evenement,
    club:
      ClubTerritorial |
      undefined
  ): boolean {

    if (!club) {
      return false;
    }

    if (
      Number(evenement.pays) !==
      Number(club.pays)
    ) {
      return false;
    }

    const zoneEvenement =
      String(
        evenement.zone ?? ''
      )
        .trim()
        .toUpperCase();

    /*
     * Pas de zone sur l'événement :
     * il concerne tout le pays.
     */
    if (!zoneEvenement) {
      return true;
    }

    return (
      String(
        club.zone ?? ''
      )
        .trim()
        .toUpperCase() ===
      zoneEvenement
    );
  }

  public isWeekend(
    date: Date
  ): boolean {

    const day =
      date.getDay();

    return (
      day === 0 ||
      day === 6
    );
  }

  public sameDay(
    firstDate:
      Date | null,
    secondDate:
      Date | null
  ): boolean {

    if (
      !firstDate ||
      !secondDate
    ) {
      return false;
    }

    return (
      firstDate.getFullYear() ===
        secondDate.getFullYear() &&
      firstDate.getMonth() ===
        secondDate.getMonth() &&
      firstDate.getDate() ===
        secondDate.getDate()
    );
  }

  public plageDay(
    dateValue: Date,
    startValue: Date,
    endValue: Date
  ): boolean {

    const clean = (
      value: Date
    ) =>
      new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );

    const date =
      clean(dateValue);

    const debut =
      clean(startValue);

    const fin =
      clean(endValue);

    return (
      date >= debut &&
      date <= fin
    );
  }

  public checksiVacances(
    date: Date,
    club: ClubTerritorial
  ): boolean {

    const jour =
      this.calendrierComplet.find(
        item =>
          this.sameDay(
            date,
            item.date
          )
      );

    return Boolean(
      jour?.evenements.some(
        evenement =>
          evenement.type ===
            'vacances' &&
          this.evenementConcerneClub(
            evenement,
            club
          )
      )
    );
  }

  public checksiFerie(
    date: Date,
    club: ClubTerritorial
  ): boolean {

    const jour =
      this.calendrierComplet.find(
        item =>
          this.sameDay(
            date,
            item.date
          )
      );

    return Boolean(
      jour?.evenements.some(
        evenement =>
          evenement.type ===
            'jour férié' &&
          this.evenementConcerneClub(
            evenement,
            club
          )
      )
    );
  }

  public EvaluerCreneau(
    creneaux: Creneau[],
    selectedMatch: Match
  ): CreneauScore[] {

    const clubDom =
      this.equipesEngagees.find(
        equipe =>
          Number(equipe.id) ===
          Number(
            selectedMatch.domicile
          )
      )?.club;

    const clubExt =
      this.equipesEngagees.find(
        equipe =>
          Number(equipe.id) ===
          Number(
            selectedMatch.exterieur
          )
      )?.club;

    const clubDomicile =
      this.clubs.find(
        club =>
          Number(club.id) ===
          Number(clubDom)
      ) as ClubTerritorial | undefined;

    const clubExterieur =
      this.clubs.find(
        club =>
          Number(club.id) ===
          Number(clubExt)
      ) as ClubTerritorial | undefined;

    const dureeMatch =
      this.categories.find(
        categorie =>
          Number(categorie.id) ===
          Number(
            selectedMatch.categorie
          )
      )?.duree ?? 0;

    return creneaux.map(
      creneau => {
        let score = 0;

        const motifs:
          string[] = [];

        const dateCreneau =
          this.parseDateLocal(
            creneau.date
          );

        if (!dateCreneau) {
          return {
            ...creneau,
            score: 100,
            motif:
              '<ul><li>Date du créneau invalide</li></ul>'
          };
        }

        const datePlus1 =
          new Date(dateCreneau);

        datePlus1.setDate(
          datePlus1.getDate() + 1
        );

        const dateMoins1 =
          new Date(dateCreneau);

        dateMoins1.setDate(
          dateMoins1.getDate() - 1
        );

        const jourCreneau =
          this.calendrierComplet.find(
            jour =>
              this.sameDay(
                jour.date,
                dateCreneau
              )
          );

        const jourPlus1 =
          this.calendrierComplet.find(
            jour =>
              this.sameDay(
                jour.date,
                datePlus1
              )
          );

        const jourMoins1 =
          this.calendrierComplet.find(
            jour =>
              this.sameDay(
                jour.date,
                dateMoins1
              )
          );

        jourCreneau?.matchs
          .filter(
            match =>
              Number(
                match.creneau_choisi
              ) ===
              Number(creneau.id)
          )
          .forEach(
            match => {
              motifs.push(
                `Match déjà présent : ${this.getEquipeNom(match.domicile)} – ${this.getEquipeNom(match.exterieur)}`
              );
            }
          );

        if (
          dateCreneau.getDay() !== 0 &&
          dateCreneau.getDay() !== 6
        ) {
          score += 4;
          motifs.push(
            'Créneau en semaine'
          );
        }

        jourCreneau?.evenements
          .forEach(
            evenement => {
              const concerneDom =
                this.evenementConcerneClub(
                  evenement,
                  clubDomicile
                );

              const concerneExt =
                this.evenementConcerneClub(
                  evenement,
                  clubExterieur
                );

              if (
                concerneDom &&
                concerneExt
              ) {
                score += 6;

                motifs.push(
                  `${evenement.type} pour les deux équipes`
                );
              } else if (
                concerneDom ||
                concerneExt
              ) {
                score += 3;

                motifs.push(
                  `${evenement.type} pour une équipe`
                );
              }
            }
          );

        const indisposDomicile =
          jourCreneau
            ?.indisponibilites
            .filter(
              indisponibilite =>
                Number(
                  indisponibilite.club
                ) ===
                  Number(clubDom) &&
                (
                  indisponibilite.type ===
                    'club' ||
                  Number(
                    indisponibilite.equipe
                  ) ===
                    Number(
                      selectedMatch.domicile
                    )
                )
            ) ?? [];

        const indisposExterieur =
          jourCreneau
            ?.indisponibilites
            .filter(
              indisponibilite =>
                Number(
                  indisponibilite.club
                ) ===
                  Number(clubExt) &&
                (
                  indisponibilite.type ===
                    'club' ||
                  Number(
                    indisponibilite.equipe
                  ) ===
                    Number(
                      selectedMatch.exterieur
                    )
                )
            ) ?? [];

        if (
          indisposDomicile.length > 0
        ) {
          score += 8;
          motifs.push(
            'Indisponibilité déclarée pour l’équipe à domicile'
          );
        }

        if (
          indisposExterieur.length > 0
        ) {
          score += 8;
          motifs.push(
            'Indisponibilité déclarée pour l’équipe à l’extérieur'
          );
        }

        const debutMin =
          this.timeStringToMinutes(
            creneau.heure_debut
          );

        const finMin =
          this.timeStringToMinutes(
            creneau.heure_fin
          );

        const minutesCreneau =
          finMin - debutMin;

        let minutesOccupees = 0;

        jourCreneau?.matchs
          .forEach(
            match => {
              minutesOccupees +=
                this.categories.find(
                  categorie =>
                    Number(
                      categorie.id
                    ) ===
                    Number(
                      match.categorie
                    )
                )?.duree ?? 0;
            }
          );

        const analyserJourVoisin = (
          matchs: Match[],
          libelle: string,
          penalite: number
        ) => {
          matchs.forEach(
            match => {
              const equipeDomMatch =
                this.equipesEngagees.find(
                  equipe =>
                    Number(equipe.id) ===
                    Number(
                      match.domicile
                    )
                );

              const equipeExtMatch =
                this.equipesEngagees.find(
                  equipe =>
                    Number(equipe.id) ===
                    Number(
                      match.exterieur
                    )
                );

              const clubsDuMatch = [
                Number(
                  equipeDomMatch?.club
                ),
                Number(
                  equipeExtMatch?.club
                )
              ];

              if (
                clubsDuMatch.includes(
                  Number(clubDom)
                ) ||
                clubsDuMatch.includes(
                  Number(clubExt)
                )
              ) {
                score += penalite;

                motifs.push(
                  `Un club est déjà engagé ${libelle}`
                );
              }
            }
          );
        };

        analyserJourVoisin(
          jourMoins1?.matchs ?? [],
          'la veille',
          1
        );

        analyserJourVoisin(
          jourPlus1?.matchs ?? [],
          'le lendemain',
          1
        );

        if (
          minutesCreneau -
            minutesOccupees <
          dureeMatch
        ) {
          score += 4;

          motifs.push(
            'Durée disponible insuffisante'
          );
        }

        return {
          ...creneau,
          score,

          motif:
            `<ul>${
              motifs
                .map(
                  motif =>
                    `<li>${motif}</li>`
                )
                .join('')
            }</ul>`
        };
      }
    );
  }

  public timeStringToMinutes(
    timeStr: string
  ): number {

    if (!timeStr) {
      return 0;
    }

    const [
      hours = 0,
      minutes = 0,
      seconds = 0
    ] = timeStr
      .split(':')
      .map(Number);

    return (
      hours * 60 +
      minutes +
      seconds / 60
    );
  }

  public trackById(
    index: number,
    item: { id: number }
  ): number {

    return item.id;
  }

  /*
   * Conservé comme utilitaire de compatibilité.
   * Il n'effectue plus aucun appel HTTP séparé.
   */
  private chargerIndisponibilites():
    void {

    this.indisponibilites =
      this.services
        .extraireIndisponibilites(
          this.calendriers as any
        );
  }

  private dateDansPeriode(
    date: Date,
    dateDebut:
      Date | string,
    dateFin?:
      Date | string | null
  ): boolean {

    const debut =
      this.parseDateLocal(
        dateDebut
      );

    const fin =
      this.parseDateLocal(
        dateFin
      ) ??
      debut;

    if (!debut || !fin) {
      return false;
    }

    return (
      date >= debut &&
      date <= fin
    );
  }

  private getDateTime(
    value: Date | string
  ): number {

    return (
      this.parseDateLocal(value)
        ?.getTime() ??
      Infinity
    );
  }

  private parseDateLocal(
    value:
      Date |
      string |
      null |
      undefined
  ): Date | null {

    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate()
      );
    }

    /*
     * Une date PostgreSQL simple est interprétée
     * localement pour éviter le décalage UTC.
     */
    const simpleDate =
      value.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (simpleDate) {
      return new Date(
        Number(simpleDate[1]),
        Number(simpleDate[2]) - 1,
        Number(simpleDate[3])
      );
    }

    const parsed =
      new Date(value);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate()
    );
  }

  private toApiDate(
    value: Date | string
  ): string {

    const date =
      this.parseDateLocal(value);

    if (!date) {
      return '';
    }

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        date.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  public ProposerMatch() {
    // Implementation for proposing a match
  }
}