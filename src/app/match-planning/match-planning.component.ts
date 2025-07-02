import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Categorie, Creneau, EquipeEngagee } from '../class';
import { CalendrierComplet, MatchAvecCreneau } from '../main/main/main.component';
import { DbService } from '../db.service';
import { firstValueFrom } from 'rxjs';



export interface CreneauScore extends Creneau {
  score: number;
  motif: string;
}

@Component({
  selector: 'app-match-planning',
  templateUrl: './match-planning.component.html',
  styleUrls: ['./match-planning.component.css']
})
export class MatchPlanningComponent implements OnInit {
@Input() matchs: MatchAvecCreneau[] = []; // toutes les données originales
  @Input() getGymnaseList!: (id: number) => string;
matchsFiltres: MatchAvecCreneau[] = []; // résultat du filtrage (modifiable)
@Input() categorie:Categorie[]=[];
 @Input()  creneaux: Creneau[] = [];
@Input()   equipesEngagees: EquipeEngagee[] = [];
  @Output() done = new EventEmitter<void>();
  @Input() evaluerCreneau!: (c: Creneau[], matchs:MatchAvecCreneau) => CreneauScore[];

  filtreSansCreneau: boolean = true;
  selectedMatch?: MatchAvecCreneau;
  creneauxFiltres: CreneauScore[] = [];
    constructor(private db: DbService) {}

  ngOnInit() {
    this.loadData();
  }

  toggleRight() {
   this.selectedMatch = undefined;
    this.creneauxFiltres = [];
  }

  loadData() {
    // charger les matchs, creneaux et équipes depuis le backend si besoin
    // ici simulé, donc ensuite filtrage
    this.matchsFiltres = this.matchs.filter(m => {
      const estClub = this.isEquipeDuClub(m.domicile) || this.isEquipeDuClub(m.exterieur);
      return this.filtreSansCreneau ? m.creneau_choisi === 0 && estClub : estClub;
    });
  }

    getCategorieNom(id: number): string {
    return this.categorie.find(c => c.id === id)?.nom || 'N/C';
  }

  getEquipeNom(id: number): string {
    return this.equipesEngagees.find(e => e.id === id)?.nom || 'N/C';
  }


  isEquipeDuClub(id: number): boolean {
    return this.equipesEngagees.find(eq => eq.id === id).club == this.db.selectedClub;
  }

  selectMatch(match: MatchAvecCreneau) {
    this.selectedMatch = match;
    const creneauxClub = this.creneaux.filter(c => c.club === match.club_recevant);
    this.creneauxFiltres = this.evaluerCreneau(creneauxClub, this.selectedMatch);
  }

  scoreCreneau(c: Creneau): CreneauScore {
    const score = Math.floor(Math.random() * 11);
    const motif = score === 0 ? 'Très bon créneau' : score <= 4 ? 'Acceptable' : 'À éviter';
    return { ...c, score, motif };
  }

  async validerCreneau(creneauId: number) {
    if (!this.selectedMatch) return;
    // ici faire un appel API pour update le match avec le creneau sélectionné
    this.selectedMatch.creneau_choisi = creneauId;
    await firstValueFrom(this.db.updateMatch(this.selectedMatch));
    this.selectedMatch = undefined;
    this.loadData();
    this.done.emit();

  }

  

  async retirerCreneau() {
    if (!this.selectedMatch) return;
    this.selectedMatch.creneau_choisi = 0;
    await firstValueFrom(this.db.updateMatch(this.selectedMatch));
    this.selectedMatch = undefined;
    this.loadData();
    this.done.emit();
  }

  get creneauxRecommandes(): CreneauScore[] {
  return this.creneauxFiltres.filter(x => x.score === 0);
}
get creneauxNonRecommandes(): CreneauScore[] {
  return this.creneauxFiltres.filter(x => x.score >= 1 && x.score <= 4);
}
get creneauxDeconseilles(): CreneauScore[] {
  return this.creneauxFiltres.filter(x => x.score > 4);
}


}