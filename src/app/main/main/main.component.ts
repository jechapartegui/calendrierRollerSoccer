import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Calendrier, Categorie, Club, Creneau, EquipeEngagee, Match } from 'src/app/class';
import { DbService } from 'src/app/db.service';
type MatchAvecCreneau = Match & { creneau?: Creneau };
type CalendrierComplet ={
  date:Date;
  evenements:Evenement[];
  matchs:Match[];
}
type Evenement={
  id:number;
  type:"match" | "jour férié" | "vacances"
  libelle:string;
  zone:number; //1 IDF 2 BXL 3 Cabries
  priorite:number; // 1 Mineur 2 Critique 3 Bloquant
}
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})

export class MainComponent implements OnInit {
  activeTab = 'equipes';

  equipesEngagees: EquipeEngagee[] = [];
  equipesEngageesFiltres: EquipeEngagee[] = [];
  categories: Categorie[] = [];
  clubs: Club[] = [];
  creneaux: Creneau[] = [];
  creneauxFiltres: Creneau[] = [];
  matchs: MatchAvecCreneau[] = [];
  calendrierComplet: CalendrierComplet[];
  Calendrier:Calendrier[];

  // Ajout équipe
  modeAjoutEquipe = false;
  nouvelleEquipe: EquipeEngagee = { id: 0, nom: '', categorie: 0, club:this.db.selectedClub};

  // Créneau
  modeCreneau: 'unique' | 'periodique' | null = null;

  // Filtres
  matchsFiltres: MatchAvecCreneau[] = [];

  constructor(private db: DbService,private router:Router) {}

  async ngOnInit() {
    if(!this.db.selectedClub || this.db.selectedClub<1){
      this.router.navigate(['/']);
      return;
    }
    await this.chargerTout();
  }

async chargerTout() {
  this.equipesEngagees = await firstValueFrom(this.db.getEquipes());
  this.equipesEngageesFiltres = this.equipesEngagees.filter(x => x.club == this.db.selectedClub);
  this.categories = await firstValueFrom(this.db.getCategories());
  this.clubs = await firstValueFrom(this.db.getClubs());
  this.creneaux = await firstValueFrom(this.db.getCreneaux());
  this.Calendrier = await firstValueFrom(this.db.getCalendriers());
  this.creneauxFiltres = this.creneaux.filter(x => x.club == this.db.selectedClub);
 this.creneauxFiltres.sort((a, b) => {
    const dateA = a.date?.getTime() ?? Infinity; // Infinity si pas de date
    const dateB = b.date?.getTime() ?? Infinity;
    return dateA - dateB;
  });
  const matchsBruts = await firstValueFrom(this.db.getMatchs());

  this.matchs = await this.enrichirEtTrierMatchs(matchsBruts);
  this.matchsFiltres = [...this.matchs]; // si tu filtres ailleurs
  this.calendrierComplet = await this.enrichirCalendrier();
}
private enrichirEtTrierMatchs(matchs: Match[]): MatchAvecCreneau[] {
  const enrichis: MatchAvecCreneau[] = matchs.map(m => ({
    ...m,
    creneau: this.creneaux.find(c => c.id === m.creneau_choisi)
  }));

  return enrichis.sort((a, b) => {
    const dateA = a.creneau?.date?.getTime() ?? Infinity; // Infinity si pas de date
    const dateB = b.creneau?.date?.getTime() ?? Infinity;
    return dateA - dateB;
  });
}

private enrichirCalendrier() : CalendrierComplet[]{
const debut = new Date(2025, 8, 1); // 1er septembre 2025 (mois 8 car indexé à 0)
const fin = new Date(2026, 4, 31);  // 31 mai 2026
let calcomp :CalendrierComplet[] = [];
const toutesLesDates: Date[] = [];

let date = new Date(debut);
while (date <= fin) {
  let unjour:CalendrierComplet={date:date, evenements:[], matchs:[]};
  if(this.Calendrier.find(x => x.date_debut ==  date && !x.date_fin )){
    let ev:Evenement={
      id:this.Calendrier.find(x => x.date_debut ==  date).id,
      type : "jour férié",
      zone : this.Calendrier.find(x => x.date_debut ==  date).pays,
      priorite:3,
      libelle: "Jour férié dans la zone " + (this.Calendrier.find(x => x.date_debut ==  date).pays == 1 ? "IDF" : this.Calendrier.find(x => x.date_debut ==  date).pays == 2 ? "Belge" : "Sud")
    }
    unjour.evenements.push(ev);
  }
    if(this.Calendrier.find(x => x.date_debut && x.date_fin && x.date_debut>= date && date <= x.date_fin )){
    let ev:Evenement={
      id:this.Calendrier.find(x => x.date_debut && x.date_fin && x.date_debut>= date && date <= x.date_fin ).id,
      type : "vacances",
      zone : this.Calendrier.find(x => x.date_debut && x.date_fin && x.date_debut>= date && date <= x.date_fin ).pays,
      priorite:3,
      libelle: "Vacances dans la zone " + (this.Calendrier.find(x => x.date_debut ==  date).pays == 1 ? "IDF" : this.Calendrier.find(x => x.date_debut ==  date).pays == 2 ? "Belge" : "Sud")
    }
    unjour.evenements.push(ev);
  }
  calcomp.push(unjour);
  date.setDate(date.getDate() + 1);    // on passe au jour suivant
}
return calcomp;
}


  getCategorieNom(id: number): string {
    return this.categories.find(c => c.id === id)?.nom || 'N/C';
  }

  getEquipeNom(id: number): string {
    return this.equipesEngagees.find(e => e.id === id)?.nom || 'N/C';
  }

  getNomClub(id: number): string {
    return this.clubs.find(c => c.id === id)?.nom || 'N/C';
  }

  getGymnase(m: Match): string {
    const c = this.creneaux.find(c => c.id === m.creneau_choisi);
    return c?.gymnase || '—';
  }

  getDateDuMatch(m: Match): string {
    const c = this.creneaux.find(c => c.id === m.creneau_choisi);
    return c?.date.toDateString() || '—';
  }

  async creerEquipe() {
    if (!this.nouvelleEquipe.nom || !this.nouvelleEquipe.categorie) return;
    let cat = this.nouvelleEquipe.categorie;
    const e = await firstValueFrom(this.db.createEquipe(this.nouvelleEquipe));
    this.equipesEngagees.push(e);
    this.equipesEngagees = await firstValueFrom(this.db.getEquipes());
    this.equipesEngageesFiltres = this.equipesEngagees.filter(x => x.club== this.db.selectedClub);
    this.nouvelleEquipe = { id: 0, nom: '', categorie: 0, club:this.db.selectedClub };
    this.modeAjoutEquipe = false;
    await this.genererMatchsPourCategorie(cat);
    this.matchs = await firstValueFrom(this.db.getMatchs());
    this.matchsFiltres = [...this.matchs];
  }

  async supprimerEquipe(e: EquipeEngagee) {
    // Supprimer les matchs liés
    const matchsASupprimer = this.matchs.filter(m => m.domicile === e.id || m.exterieur === e.id);
    for (let m of matchsASupprimer) {
      await firstValueFrom(this.db.deleteMatch(m.id));
    }
    // Supprimer l'équipe
await firstValueFrom(this.db.deleteEquipe(e.id));

    this.equipesEngagees = this.equipesEngagees.filter(eq => eq.id !== e.id);
    this.matchs = await firstValueFrom(this.db.getMatchs());
    this.matchsFiltres = [...this.matchs];
  }

  async genererMatchsPourCategorie(categorieId: number) {
  const equipes = this.equipesEngagees.filter(
    e => Number(e.categorie) === Number(categorieId)
  );

  // Générer un set des matchs déjà existants (clef : "domicile-exterieur")
  const existingMatchKeys = new Set(
    this.matchs
      .filter(m => Number(m.categorie) === Number(categorieId))
      .map(m => `${m.domicile}-${m.exterieur}`)
  );

  for (let i = 0; i < equipes.length; i++) {
    for (let j = 0; j < equipes.length; j++) {
      if (i !== j) {
        const key = `${equipes[i].id}-${equipes[j].id}`;

        if (!existingMatchKeys.has(key)) {
          existingMatchKeys.add(key); // ajoute à la liste pour éviter les doublons pendant la boucle
          await firstValueFrom(this.db.createMatch({
            id: 0,
            categorie: categorieId,
            domicile: equipes[i].id,
            exterieur: equipes[j].id,
            creneau_choisi: 0,
            club_recevant: equipes[i].club // tu as fait une erreur ici : `=` au lieu de `===` dans le find
          }));
        }
      }
    }
  }
}


  getMatchsPourCreneau(cId: number): Match[] {
    return this.matchs.filter(m => m.creneau_choisi === cId);
  }

  aDesMatchs(cId: number): boolean {
    return this.getMatchsPourCreneau(cId).length > 0;
  }

  async confirmerSuppressionCreneau(c: Creneau) {
    const liés = this.getMatchsPourCreneau(c.id);
    for (let m of liés) {
      m.creneau_choisi = 0;
      await this.db.updateMatch(m);
    }
    await this.db.deleteCreneau(c.id);
    this.creneaux = await firstValueFrom(this.db.getCreneaux());
  }

  modifierCreneau(c: Creneau) {
    // Tu pourrais ici ouvrir un mode édition si besoin
    this.modeCreneau = 'unique';
    
    // Et passer les données à un composant ou form
  }

  async rafraichirCreneaux() {
    this.creneaux = await firstValueFrom(this.db.getCreneaux());
    this.matchs = await firstValueFrom(this.db.getMatchs());
    this.matchsFiltres = [...this.matchs];
    this.modeCreneau = null;
  }

  majFiltres(filtre: any) {
    this.matchsFiltres = this.matchs.filter(m => {
      if (filtre.categorieId && filtre.categorieId != m.categorie) return false;
      if (filtre.equipeId && filtre.equipeId != m.domicile && filtre.equipeId != m.exterieur) return false;
      if (filtre.clubId && filtre.clubId != this.equipesEngagees.find(x => x.id == m.domicile).club && filtre.clubId != this.equipesEngagees.find(x => x.id == m.exterieur).club) return false;
      return true;
    });
  }
}
