import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Categorie, Club, Creneau, EquipeEngagee, Match } from 'src/app/class';
import { DbService } from 'src/app/db.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})

export class MainComponent implements OnInit {
  activeTab = 'equipes';

  equipesEngagees: EquipeEngagee[] = [];
  categories: Categorie[] = [];
  clubs: Club[] = [];
  creneaux: Creneau[] = [];
  matchs: Match[] = [];

  // Ajout équipe
  modeAjoutEquipe = false;
  nouvelleEquipe: EquipeEngagee = { id: 0, nom: '', categorie: 0, club:this.db.selectedClub};

  // Créneau
  modeCreneau: 'unique' | 'periodique' | null = null;

  // Filtres
  matchsFiltres: Match[] = [];

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
    this.categories = await firstValueFrom(this.db.getCategories());
    this.clubs = await firstValueFrom(this.db.getClubs());
    this.creneaux = await firstValueFrom(this.db.getCreneaux());
    this.matchs = await firstValueFrom(this.db.getMatchs());
    this.matchsFiltres = [...this.matchs];
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
    console.log(filtre);
    this.matchsFiltres = this.matchs.filter(m => {
      if (filtre.categories?.length && !filtre.categories.includes(m.categorie)) return false;
      if (filtre.equipes?.length && !filtre.equipes.includes(m.domicile) && !filtre.equipes.includes(m.exterieur)) return false;
      if (filtre.clubs?.length && !filtre.clubs.includes(m.club_recevant)) return false;
      return true;
    });
  }
}
