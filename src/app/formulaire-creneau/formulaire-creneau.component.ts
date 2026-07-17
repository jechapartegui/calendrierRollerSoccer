import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

import {
  Creneau,
  Gymnase
} from 'src/app/class';

import {
  firstValueFrom
} from 'rxjs';

import {
  AllServices
} from 'src/app/services';

import {
  PoseTaDateStore
} from 'src/app/store/pose-ta-date.store';

export interface IndisponibiliteCreneau {
  id?: number;

  date?: Date | string;
  date_debut?: Date | string;
  date_fin?: Date | string | null;

  club?: number | null;
  equipe?: number | null;

  libelle?: string;
  motif?: string;
}

export interface ContrainteDateCreneau {
  type:
    | 'calendrier'
    | 'indisponibilite'
    | 'creneau'
    | 'match';

  niveau:
    | 'info'
    | 'warning'
    | 'danger';

  titre: string;
  description: string;
}

export class CreneauPeriodique {
  jour = 'dimanche';

  heureDebut = '';
  heureFin = '';

  gymnase: number | null = null;

  vacances = false;
  joursFeries = false;

  dateDebut: Date = new Date();
  dateFin: Date = new Date();

  notes = '';

  creneau_confirme = false;
  un_club = false;
}

@Component({
  selector: 'app-formulaire-creneau',
  templateUrl: './formulaire-creneau.component.html',
  styleUrls: ['./formulaire-creneau.component.css']
})
export class FormulaireCreneauComponent
  implements OnInit {

  @Input()
  mode:
    | 'periodique'
    | 'unique'
    | null = null;

  @Input()
  gymnases: Gymnase[] = [];

  @Input()
  liste_creneaux: Creneau[] = [];

  /*
   * Cet input est déjà prêt pour la future table
   * d'indisponibilités.
   *
   * Le formulaire fonctionne même s'il n'est pas renseigné.
   */
  @Input()
  indisponibilites:
    IndisponibiliteCreneau[] = [];

  @Output()
  cancel =
    new EventEmitter<void>();

  @Output()
  done =
    new EventEmitter<void>();

  @Output()
  creneaux =
    new EventEmitter<CreneauPeriodique>();

  public dateStr = '';

  public jour = 'dimanche';
  
  public heureDebut = '';
  public heureFin = '';

  public gymnase:
    number | null = null;

  public vacances = false;
  public joursFeries = false;

  public notes = '';

  public minDateStr = this.store.snapshot.selectedSaison?.date_debut;
  public maxDateStr = this.store.snapshot.selectedSaison?.date_fin;

  public creneau_confirme = false;
  public un_club = false;

  public saving = false;
  public errorMessage:
    string | null = null;

  constructor(
    private readonly services:
      AllServices,

    public readonly store:
      PoseTaDateStore
  ) {}

  public ngOnInit(): void {
    const saison =
      this.store.snapshot
        .selectedSaison;

    this.minDateStr =
      this.toInputDate(
        saison?.date_debut
      );

    this.maxDateStr =
      this.toInputDate(
        saison?.date_fin
      );

    /*
     * En l'absence exceptionnelle de dates,
     * on laisse les champs utilisables.
     */
    if (!this.minDateStr) {
      this.minDateStr =
        this.toInputDate(
          new Date()
        );
    }

    if (!this.maxDateStr) {
      const dateFin =
        new Date();

      dateFin.setFullYear(
        dateFin.getFullYear() + 1
      );

      this.maxDateStr =
        this.toInputDate(dateFin);
    }

    if (
      this.gymnases.length > 0 &&
      this.gymnase === null
    ) {
      this.gymnase =
        Number(this.gymnases[0].id);
    }
  }

  public get selectedClubId():
    number {

    return (
      this.store.selectedClubId ??
      0
    );
  }

  public get selectedSaisonId():
    number {

    return (
      this.store.selectedSaisonId ??
      0
    );
  }

  public get dateSelectionnee():
    Date | null {

    return this.parseInputDate(
      this.dateStr
    );
  }

  public get dateSelectionneeLibelle():
    string {

    const date =
      this.dateSelectionnee;

    if (!date) {
      return '';
    }

    return date.toLocaleDateString(
      'fr-FR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  }

  /**
   * Panel de contraintes affiché quand une date
   * est sélectionnée.
   *
   * Il regroupe :
   * - vacances et jours fériés ;
   * - indisponibilités fournies par le parent ;
   * - créneaux déjà proposés ce jour-là ;
   * - matchs déjà prévus pour le club.
   */
  public get contraintesDateSelectionnee():
    ContrainteDateCreneau[] {

    const date =
      this.dateSelectionnee;

    if (!date) {
      return [];
    }

    const contraintes:
      ContrainteDateCreneau[] = [];

    this.ajouterContraintesCalendrier(
      contraintes,
      date
    );

    this.ajouterIndisponibilites(
      contraintes,
      date
    );

    this.ajouterCreneauxExistants(
      contraintes,
      date
    );

    this.ajouterMatchsExistants(
      contraintes,
      date
    );

    return contraintes;
  }

  public async valider():
    Promise<void> {

    this.errorMessage = null;

    const erreur =
      this.validerChampsCommuns();

    if (erreur) {
      this.errorMessage = erreur;
      return;
    }

    if (
      this.mode === 'periodique'
    ) {
      this.validerPeriodique();
      return;
    }

    if (
      this.mode === 'unique'
    ) {
      await this.validerUnique();
    }
  }

  private validerChampsCommuns():
    string | null {

    if (!this.selectedClubId) {
      return 'Aucun club sélectionné.';
    }

    if (!this.selectedSaisonId) {
      return 'Aucune saison sélectionnée.';
    }

    if (!this.heureDebut) {
      return 'L’heure de début est obligatoire.';
    }

    if (!this.heureFin) {
      return 'L’heure de fin est obligatoire.';
    }

    if (
      this.timeToMinutes(
        this.heureFin
      ) <=
      this.timeToMinutes(
        this.heureDebut
      )
    ) {
      return 'L’heure de fin doit être postérieure à l’heure de début.';
    }

    if (!this.gymnase) {
      return 'Le gymnase est obligatoire.';
    }

    return null;
  }

  private validerPeriodique():
    void {

    const dateDebut =
      this.parseInputDate(
        this.minDateStr
      );

    const dateFin =
      this.parseInputDate(
        this.maxDateStr
      );

    if (!dateDebut || !dateFin) {
      this.errorMessage =
        'La période est invalide.';

      return;
    }

    if (dateFin < dateDebut) {
      this.errorMessage =
        'La date de fin doit être postérieure à la date de début.';

      return;
    }

    const data =
      new CreneauPeriodique();

    data.gymnase =
      this.gymnase;

    data.dateDebut =
      dateDebut;

    data.dateFin =
      dateFin;

    data.heureDebut =
      this.heureDebut;

    data.heureFin =
      this.heureFin;

    data.jour =
      this.jour;

    data.notes =
      this.notes.trim();

    data.vacances =
      this.vacances;

    data.joursFeries =
      this.joursFeries;

    data.creneau_confirme =
      this.creneau_confirme;

    data.un_club =
      this.un_club;

    /*
     * La création multiple reste gérée par MainComponent,
     * puisqu'il possède déjà la logique vacances/jours fériés.
     */
    this.creneaux.emit(data);
  }

  private async validerUnique():
    Promise<void> {

    const date =
      this.dateSelectionnee;

    if (!date) {
      this.errorMessage =
        'La date est obligatoire.';

      return;
    }

    const creneauxExistants =
      this.getCreneauxClubPourDate(
        date
      );

    if (
      creneauxExistants.length > 0
    ) {
      const confirmation =
        window.confirm(
          `${creneauxExistants.length} créneau(x) existe(nt) déjà pour votre club à cette date. Créer ce créneau supplémentaire ?`
        );

      if (!confirmation) {
        return;
      }
    }

    const payload = {
      id: 0,

      date:
        this.normaliserDateApi(
          date
        ),

      heure_debut:
        this.heureDebut,

      heure_fin:
        this.heureFin,

      club:
        this.selectedClubId,

      gymnase:
        Number(this.gymnase),

      notes:
        this.notes.trim(),

      saison:
        this.selectedSaisonId,

      creneau_confirme:
        this.creneau_confirme,

      un_club:
        this.un_club
    };

    this.saving = true;

    try {
      /*
       * AllServices ajoute le résultat au store.
       * Il n'est donc plus nécessaire de relire toute la table.
       */
      await firstValueFrom(
        this.services.createCreneau(
          payload
        )
      );

      this.done.emit();
    } catch (error: any) {
      console.error(
        'Erreur de création du créneau',
        error
      );

      this.errorMessage =
        error?.error?.message ??
        error?.message ??
        'Impossible de créer le créneau.';
    } finally {
      this.saving = false;
    }
  }

  public annuler():
    void {

    this.cancel.emit();
  }

  private ajouterContraintesCalendrier(
    contraintes:
      ContrainteDateCreneau[],

    date: Date
  ): void {

    const calendriers =
      this.store.snapshot
        .calendriers as any[];

    const club =
      this.store.snapshot
        .selectedClub as any;

    calendriers
      .filter(
        calendrier =>
          this.dateDansPeriode(
            date,
            calendrier.date_debut,
            calendrier.date_fin
          )
      )
      .filter(
        calendrier =>
          this.calendrierConcerneClub(
            calendrier,
            club
          )
      )
      .forEach(
        calendrier => {
          const estPeriode =
            Boolean(
              calendrier.date_fin
            );

          contraintes.push({
            type: 'calendrier',

            niveau:
              estPeriode
                ? 'warning'
                : 'danger',

            titre:
              estPeriode
                ? 'Période particulière'
                : 'Jour férié ou événement',

            description:
              calendrier.motif ??
              calendrier.libelle ??
              (
                estPeriode
                  ? 'Période de vacances ou d’indisponibilité générale.'
                  : 'Cette date contient un événement bloquant.'
              )
          });
        }
      );
  }

  private ajouterIndisponibilites(
    contraintes:
      ContrainteDateCreneau[],

    date: Date
  ): void {

    const equipesDuClub =
      new Set(
        this.store.snapshot
          .equipesEngagees
          .filter(
            equipe =>
              Number(equipe.club) ===
              Number(this.selectedClubId)
          )
          .map(
            equipe =>
              Number(equipe.id)
          )
      );

    this.indisponibilites
      .filter(
        indisponibilite =>
          this.dateDansPeriode(
            date,

            indisponibilite
              .date_debut ??
            indisponibilite.date,

            indisponibilite
              .date_fin
          )
      )
      .filter(
        indisponibilite => {
          if (
            indisponibilite.club &&
            Number(
              indisponibilite.club
            ) !==
            Number(
              this.selectedClubId
            )
          ) {
            return false;
          }

          if (
            indisponibilite.equipe &&
            !equipesDuClub.has(
              Number(
                indisponibilite.equipe
              )
            )
          ) {
            return false;
          }

          return true;
        }
      )
      .forEach(
        indisponibilite => {
          contraintes.push({
            type:
              'indisponibilite',

            niveau:
              'danger',

            titre:
              indisponibilite.equipe
                ? 'Équipe indisponible'
                : 'Club indisponible',

            description:
              indisponibilite.libelle ??
              indisponibilite.motif ??
              'Une indisponibilité a été déclarée à cette date.'
          });
        }
      );
  }

  private ajouterCreneauxExistants(
    contraintes:
      ContrainteDateCreneau[],

    date: Date
  ): void {

    const creneauxClub =
      this.getCreneauxClubPourDate(
        date
      );

    if (
      creneauxClub.length === 0
    ) {
      return;
    }

    contraintes.push({
      type: 'creneau',
      niveau: 'warning',
      titre:
        'Créneau déjà proposé',

      description:
        `${creneauxClub.length} créneau(x) de votre club existe(nt) déjà à cette date.`
    });
  }

  private ajouterMatchsExistants(
    contraintes:
      ContrainteDateCreneau[],

    date: Date
  ): void {

    const snapshot =
      this.store.snapshot;

    const equipesDuClub =
      new Set(
        snapshot.equipesEngagees
          .filter(
            equipe =>
              Number(equipe.club) ===
              Number(this.selectedClubId)
          )
          .map(
            equipe =>
              Number(equipe.id)
          )
      );

    const creneauxParId =
      new Map(
        snapshot.creneaux.map(
          creneau => [
            Number(creneau.id),
            creneau
          ]
        )
      );

    const matchsDuClub =
      snapshot.matchs.filter(
        match => {
          const concerneClub =
            equipesDuClub.has(
              Number(match.domicile)
            ) ||
            equipesDuClub.has(
              Number(match.exterieur)
            );

          if (!concerneClub) {
            return false;
          }

          const creneau =
            creneauxParId.get(
              Number(
                match.creneau_choisi
              )
            );

          return Boolean(
            creneau &&
            this.sameDay(
              date,
              this.parseDate(
                creneau.date
              )
            )
          );
        }
      );

    if (
      matchsDuClub.length === 0
    ) {
      return;
    }

    contraintes.push({
      type: 'match',
      niveau: 'warning',
      titre:
        'Match déjà programmé',

      description:
        `${matchsDuClub.length} match(s) de votre club est/sont déjà prévu(s) à cette date.`
    });
  }

  private getCreneauxClubPourDate(
    date: Date
  ): Creneau[] {

    return this.liste_creneaux.filter(
      creneau =>
        Number(creneau.club) ===
          Number(this.selectedClubId) &&
        this.sameDay(
          date,
          this.parseDate(
            creneau.date
          )
        )
    );
  }

  private calendrierConcerneClub(
    calendrier: any,
    club: any
  ): boolean {

    if (!club) {
      return false;
    }

    /*
     * Événement réservé à un club précis.
     */
    if (
      calendrier.club &&
      Number(calendrier.club) !==
      Number(club.id)
    ) {
      return false;
    }

    const paysCalendrier =
      this.toNullableNumber(
        calendrier.pays
      );

    const zoneCalendrier =
      this.toNullableNumber(
        calendrier.zone
      );

    /*
     * Pays renseigné :
     * le club doit appartenir au même pays.
     */
    if (
      paysCalendrier !== null &&
      paysCalendrier > 0 &&
      Number(club.pays) !==
      paysCalendrier
    ) {
      return false;
    }

    /*
     * Pas de zone :
     * l'événement concerne tout le pays.
     *
     * Zone renseignée :
     * le club doit être dans cette zone.
     */
    if (
      zoneCalendrier !== null &&
      zoneCalendrier > 0 &&
      Number(club.zone) !==
      zoneCalendrier
    ) {
      return false;
    }

    return true;
  }

  private dateDansPeriode(
    date: Date,
    debutValue:
      Date | string | null | undefined,
    finValue?:
      Date | string | null
  ): boolean {

    const debut =
      this.parseDate(debutValue);

    if (!debut) {
      return false;
    }

    const fin =
      this.parseDate(finValue) ??
      debut;

    const dateNettoyee =
      this.cleanDate(date);

    return (
      dateNettoyee >=
        this.cleanDate(debut) &&
      dateNettoyee <=
        this.cleanDate(fin)
    );
  }

  private sameDay(
    first:
      Date | null,
    second:
      Date | null
  ): boolean {

    if (!first || !second) {
      return false;
    }

    return (
      first.getFullYear() ===
        second.getFullYear() &&
      first.getMonth() ===
        second.getMonth() &&
      first.getDate() ===
        second.getDate()
    );
  }

  private parseInputDate(
    value: string
  ): Date | null {

    if (!value) {
      return null;
    }

    const match =
      value.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (!match) {
      return null;
    }

    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
      0
    );
  }

  private parseDate(
    value:
      Date |
      string |
      null |
      undefined
  ): Date | null {

    if (!value) {
      return null;
    }

    if (
      value instanceof Date
    ) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        12
      );
    }

    const simpleDate =
      value.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (simpleDate) {
      return new Date(
        Number(simpleDate[1]),
        Number(simpleDate[2]) - 1,
        Number(simpleDate[3]),
        12
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
      parsed.getDate(),
      12
    );
  }

  private normaliserDateApi(
    date: Date
  ): Date {

    const normalized =
      new Date(date);

    normalized.setHours(
      12,
      0,
      0,
      0
    );

    return normalized;
  }

  private cleanDate(
    value: Date
  ): Date {

    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  private toInputDate(
    value:
      Date |
      string |
      null |
      undefined
  ): string {

    const date =
      this.parseDate(value);

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

  private timeToMinutes(
    value: string
  ): number {

    const [
      hours = 0,
      minutes = 0
    ] = value
      .split(':')
      .map(Number);

    return (
      hours * 60 +
      minutes
    );
  }

  private toNullableNumber(
    value: unknown
  ): number | null {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const numberValue =
      Number(value);

    return Number.isFinite(
      numberValue
    )
      ? numberValue
      : null;
  }
}