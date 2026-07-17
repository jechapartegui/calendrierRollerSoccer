import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Categorie,
  Creneau,
  EquipeEngagee,
  Match,
  ReferenceGymnase
} from '../class';
import { DbService } from '../db.service';
import { PoseTaDateStore } from '../store/pose-ta-date.store';

/*
 * Creneau possède déjà creneau_confirme et un_club.
 * Il ne faut pas les redéclarer avec une optionalité différente.
 */
export interface CreneauPlanning extends Creneau {}

export interface CreneauScore extends CreneauPlanning {
  score: number;
  motif: string;
}

export type MatchPlanning = Match & {
  creneau?: CreneauPlanning;
  saison?: number;
  arbitre?: number | null;
  requete_arbitre?: boolean;
};

@Component({
  selector: 'app-match-planning',
  templateUrl: './match-planning.component.html',
  styleUrls: ['./match-planning.component.css']
})
export class MatchPlanningComponent implements OnInit, OnChanges {
  @Input() matchs: MatchPlanning[] = [];
  @Input() creneaux: CreneauPlanning[] = [];
  @Input() categorie: Categorie[] = [];
  @Input() equipesEngagees: EquipeEngagee[] = [];
  @Input() getGymnaseList!: (reference: ReferenceGymnase) => string;
  @Input() getNomClub?: (id: number) => string;
  @Input() evaluerCreneau!: (creneaux: Creneau[], match: Match) => CreneauScore[];
  @Output() done = new EventEmitter<void>();

  matchsFiltres: MatchPlanning[] = [];
  selectedMatch?: MatchPlanning;
  creneauxFiltres: CreneauScore[] = [];
  creneauxIncompatibles: CreneauScore[] = [];

  filtreSansCreneau = true;
  filtreCategorie: number | null = null;
  recherche = '';
  saving = false;
  errorMessage: string | null = null;

  constructor(
    private readonly db: DbService,
    private readonly store: PoseTaDateStore
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['matchs'] ||
      changes['creneaux'] ||
      changes['equipesEngagees'] ||
      changes['categorie']
    ) {
      this.loadData();

      if (this.selectedMatch) {
        const updated = this.matchs.find(
          match => Number(match.id) === Number(this.selectedMatch?.id)
        );

        if (updated) {
          this.selectedMatch = updated;
          this.chargerCreneauxPourMatch(updated);
        }
      }
    }
  }

  get selectedClubId(): number {
    return this.store.selectedClubId ?? 0;
  }

  get matchsDuClubCount(): number {
    return this.matchs.filter(match => this.matchConcerneClub(match)).length;
  }

  get matchsAPlanifierCount(): number {
    return this.matchs.filter(
      match => this.matchConcerneClub(match) && Number(match.creneau_choisi) <= 0
    ).length;
  }

  get matchsPlanifiesCount(): number {
    return this.matchsDuClubCount - this.matchsAPlanifierCount;
  }

  get creneauxConfirmesCount(): number {
    return this.creneaux.filter(creneau => this.estCreneauConfirme(creneau)).length;
  }

  get currentCreneau(): CreneauPlanning | undefined {
    if (!this.selectedMatch || Number(this.selectedMatch.creneau_choisi) <= 0) {
      return undefined;
    }

    return this.creneaux.find(
      creneau => Number(creneau.id) === Number(this.selectedMatch?.creneau_choisi)
    );
  }

  get creneauxRecommandes(): CreneauScore[] {
    return this.creneauxFiltres
      .filter(creneau => Number(creneau.score) === 0)
      .sort((a, b) => this.compareCreneaux(a, b));
  }

  get creneauxAcceptables(): CreneauScore[] {
    return this.creneauxFiltres
      .filter(creneau => Number(creneau.score) >= 1 && Number(creneau.score) <= 4)
      .sort((a, b) => this.compareCreneaux(a, b));
  }

  get creneauxDeconseilles(): CreneauScore[] {
    return this.creneauxFiltres
      .filter(creneau => Number(creneau.score) > 4)
      .sort((a, b) => this.compareCreneaux(a, b));
  }

  get nombreCreneauxEligibles(): number {
    return this.creneauxFiltres.length;
  }

  get hasCreneaux(): boolean {
    return this.creneauxFiltres.length > 0 || this.creneauxIncompatibles.length > 0;
  }

  loadData(): void {
    const recherche = this.recherche.trim().toLowerCase();

    this.matchsFiltres = this.matchs
      .filter(match => this.matchConcerneClub(match))
      .filter(match => !this.filtreSansCreneau || Number(match.creneau_choisi) <= 0)
      .filter(
        match =>
          !this.filtreCategorie ||
          Number(match.categorie) === Number(this.filtreCategorie)
      )
      .filter(match => {
        if (!recherche) {
          return true;
        }

        const texte = [
          this.getCategorieNom(match.categorie),
          this.getEquipeNom(match.domicile),
          this.getEquipeNom(match.exterieur),
          this.getClubNom(this.getClubRecevant(match))
        ]
          .join(' ')
          .toLowerCase();

        return texte.includes(recherche);
      })
      .sort((a, b) => {
        const aPlanifie = Number(a.creneau_choisi) > 0;
        const bPlanifie = Number(b.creneau_choisi) > 0;

        if (aPlanifie !== bPlanifie) {
          return aPlanifie ? 1 : -1;
        }

        return (
          this.getCategorieNom(a.categorie).localeCompare(
            this.getCategorieNom(b.categorie)
          ) ||
          this.getEquipeNom(a.domicile).localeCompare(
            this.getEquipeNom(b.domicile)
          )
        );
      });
  }

  selectMatch(match: MatchPlanning): void {
    this.errorMessage = null;
    this.selectedMatch = match;
    this.chargerCreneauxPourMatch(match);
  }

  retourListe(): void {
    this.selectedMatch = undefined;
    this.creneauxFiltres = [];
    this.creneauxIncompatibles = [];
    this.errorMessage = null;
    this.loadData();
  }

  private chargerCreneauxPourMatch(match: MatchPlanning): void {
    const clubRecevant = this.getClubRecevant(match);
    const creneauxClub = this.creneaux.filter(
      creneau => Number(creneau.club) === Number(clubRecevant)
    );

    if (typeof this.evaluerCreneau !== 'function') {
      this.creneauxFiltres = [];
      this.creneauxIncompatibles = [];
      this.errorMessage = 'La fonction d’évaluation des créneaux est indisponible.';
      return;
    }

    const evalues = this.evaluerCreneau(creneauxClub, match);

    this.creneauxFiltres = evalues.filter(creneau =>
      this.creneauRespecteRegleUnClub(creneau, match)
    );

    this.creneauxIncompatibles = evalues
      .filter(creneau => !this.creneauRespecteRegleUnClub(creneau, match))
      .map(creneau => ({
        ...creneau,
        motif: this.ajouterMotif(
          creneau.motif,
          this.getMotifIncompatibilite(creneau, match)
        )
      }))
      .sort((a, b) => this.compareCreneaux(a, b));
  }

  async validerCreneau(creneauId: number): Promise<void> {
    if (!this.selectedMatch || this.saving) {
      return;
    }

    const creneau = this.creneaux.find(
      item => Number(item.id) === Number(creneauId)
    );

    if (!creneau) {
      this.errorMessage = 'Le créneau sélectionné est introuvable.';
      return;
    }

    if (!this.creneauRespecteRegleUnClub(creneau, this.selectedMatch)) {
      this.errorMessage = this.getMotifIncompatibilite(creneau, this.selectedMatch);
      return;
    }

    if (!this.estCreneauConfirme(creneau)) {
      const continuer = window.confirm(
        'Ce créneau est encore provisoire. Voulez-vous tout de même y positionner le match ?'
      );

      if (!continuer) {
        return;
      }
    }

    const selectedMatch = this.selectedMatch;
    const { creneau: _ancienCreneau, ...payload } = {
      ...selectedMatch,
      creneau_choisi: creneauId,
      saison: this.store.selectedSaisonId
    };

    this.saving = true;
    this.errorMessage = null;

    try {
      const response: any = await firstValueFrom(
        this.db.updateMatch(payload as Match)
      );

      const updatedMatch: MatchPlanning = {
        ...selectedMatch,
        ...payload,
        ...(response?.data ?? {}),
        creneau
      };

      this.remplacerMatch(updatedMatch);
      this.retourListe();
      this.done.emit();
    } catch (error: any) {
      console.error('Erreur de planification du match', error);
      this.errorMessage =
        error?.error?.message ??
        error?.message ??
        'Impossible de planifier le match.';
    } finally {
      this.saving = false;
    }
  }

  async retirerCreneau(): Promise<void> {
    if (!this.selectedMatch || this.saving) {
      return;
    }

    const selectedMatch = this.selectedMatch;
    const { creneau: _ancienCreneau, ...payload } = {
      ...selectedMatch,
      creneau_choisi: 0,
      saison: this.store.selectedSaisonId
    };

    this.saving = true;
    this.errorMessage = null;

    try {
      const response: any = await firstValueFrom(
        this.db.updateMatch(payload as Match)
      );

      const updatedMatch: MatchPlanning = {
        ...selectedMatch,
        ...payload,
        ...(response?.data ?? {}),
        creneau: undefined
      };

      this.remplacerMatch(updatedMatch);
      this.retourListe();
      this.done.emit();
    } catch (error: any) {
      console.error('Erreur lors du retrait du créneau', error);
      this.errorMessage =
        error?.error?.message ??
        error?.message ??
        'Impossible de retirer le créneau.';
    } finally {
      this.saving = false;
    }
  }

  private remplacerMatch(updatedMatch: MatchPlanning): void {
    this.matchs = this.matchs.map(match =>
      Number(match.id) === Number(updatedMatch.id) ? updatedMatch : match
    );

    const snapshot = this.store.snapshot;
    const { creneau: _creneau, ...matchPersistable } = updatedMatch;

    this.store.setApplicationData({
      calendriers: snapshot.calendriers,
      categories: snapshot.categories,
      creneaux: snapshot.creneaux,
      equipesEngagees: snapshot.equipesEngagees,
      matchs: snapshot.matchs.map(match =>
        Number(match.id) === Number(updatedMatch.id)
          ? (matchPersistable as Match)
          : match
      ),
      gymnases: snapshot.gymnases
    });
  }

  getCategorieNom(id: number): string {
    return this.categorie.find(item => Number(item.id) === Number(id))?.nom ?? 'N/C';
  }

  getEquipeNom(id: number): string {
    return (
      this.equipesEngagees.find(equipe => Number(equipe.id) === Number(id))?.nom ??
      'N/C'
    );
  }

  getClubNom(id: number): string {
    return typeof this.getNomClub === 'function' ? this.getNomClub(id) : `Club #${id}`;
  }

  isEquipeDuClub(equipeId: number): boolean {
    const equipe = this.equipesEngagees.find(
      item => Number(item.id) === Number(equipeId)
    );

    return Number(equipe?.club) === Number(this.selectedClubId);
  }

  matchConcerneClub(match: MatchPlanning): boolean {
    return this.isEquipeDuClub(match.domicile) || this.isEquipeDuClub(match.exterieur);
  }

  getClubRecevant(match: MatchPlanning): number {
    if (Number(match.club_recevant) > 0) {
      return Number(match.club_recevant);
    }

    return this.getClubEquipe(match.domicile) ?? 0;
  }

  getClubEquipe(equipeId: number): number | null {
    const equipe = this.equipesEngagees.find(
      item => Number(item.id) === Number(equipeId)
    );

    return equipe ? Number(equipe.club) : null;
  }

  estCreneauConfirme(creneau: CreneauPlanning | null | undefined): boolean {
    if (!creneau) {
      return false;
    }

    const value = creneau.creneau_confirme as unknown;
    return value === true || value === 1 || value === 'true';
  }

  estCreneauUnClub(creneau: CreneauPlanning | null | undefined): boolean {
    if (!creneau) {
      return false;
    }

    const value = creneau.un_club as unknown;
    return value === true || value === 1 || value === 'true';
  }

  getNombreMatchsCreneau(creneauId: number): number {
    return this.matchs.filter(
      match => Number(match.creneau_choisi) === Number(creneauId)
    ).length;
  }

  trackById(index: number, item: { id: number }): number {
    return item.id;
  }

  private creneauRespecteRegleUnClub(
    creneau: CreneauPlanning,
    match: MatchPlanning
  ): boolean {
    if (!this.estCreneauUnClub(creneau)) {
      return true;
    }

    if (Number(match.creneau_choisi) === Number(creneau.id)) {
      return true;
    }

    const clubVisiteurSelectionne = this.getClubVisiteur(
      match,
      Number(creneau.club)
    );

    const autresMatchs = this.matchs.filter(
      item =>
        Number(item.creneau_choisi) === Number(creneau.id) &&
        Number(item.id) !== Number(match.id)
    );

    if (autresMatchs.length === 0) {
      return true;
    }

    const clubsVisiteursExistants = autresMatchs
      .map(item => this.getClubVisiteur(item, Number(creneau.club)))
      .filter((clubId): clubId is number => clubId !== null);

    if (clubsVisiteursExistants.length === 0 || clubVisiteurSelectionne === null) {
      return false;
    }

    return clubsVisiteursExistants.every(
      clubId => Number(clubId) === Number(clubVisiteurSelectionne)
    );
  }

  private getClubVisiteur(
    match: MatchPlanning,
    clubRecevant: number
  ): number | null {
    const clubDomicile = this.getClubEquipe(match.domicile);
    const clubExterieur = this.getClubEquipe(match.exterieur);

    if (clubDomicile === clubRecevant && clubExterieur !== clubRecevant) {
      return clubExterieur;
    }

    if (clubExterieur === clubRecevant && clubDomicile !== clubRecevant) {
      return clubDomicile;
    }

    return clubExterieur ?? clubDomicile;
  }

  private getMotifIncompatibilite(
    creneau: CreneauPlanning,
    match: MatchPlanning
  ): string {
    const clubVisiteur = this.getClubVisiteur(match, Number(creneau.club));

    const autresClubs = [
      ...new Set(
        this.matchs
          .filter(
            item =>
              Number(item.creneau_choisi) === Number(creneau.id) &&
              Number(item.id) !== Number(match.id)
          )
          .map(item => this.getClubVisiteur(item, Number(creneau.club)))
          .filter((clubId): clubId is number => clubId !== null)
      )
    ];

    const clubsLibelles = autresClubs
      .map(clubId => this.getClubNom(clubId))
      .join(', ');

    return (
      'Ce créneau est limité à un seul club visiteur' +
      (clubsLibelles ? ` et il est déjà utilisé par ${clubsLibelles}.` : '.') +
      (clubVisiteur
        ? ` Le club attendu pour ce match est ${this.getClubNom(clubVisiteur)}.`
        : '')
    );
  }

  private ajouterMotif(motifHtml: string | null | undefined, motif: string): string {
    const existing = motifHtml?.trim() ?? '';

    if (!existing) {
      return `<ul><li>${motif}</li></ul>`;
    }

    if (existing.includes('</ul>')) {
      return existing.replace('</ul>', `<li>${motif}</li></ul>`);
    }

    return `${existing}<ul><li>${motif}</li></ul>`;
  }

  private compareCreneaux(a: CreneauScore, b: CreneauScore): number {
    const aConfirme = this.estCreneauConfirme(a);
    const bConfirme = this.estCreneauConfirme(b);

    if (aConfirme !== bConfirme) {
      return aConfirme ? -1 : 1;
    }

    return this.getDateTimestamp(a.date) - this.getDateTimestamp(b.date);
  }

  private getDateTimestamp(value: Date | string): number {
    const date = value instanceof Date ? value : new Date(value);
    const timestamp = date.getTime();
    return Number.isNaN(timestamp) ? Infinity : timestamp;
  }
}
