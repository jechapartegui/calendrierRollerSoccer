import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Calendrier, Categorie, Club, Creneau, EquipeEngagee, Gymnase, Match } from 'src/app/class';
import { DbService } from 'src/app/db.service';
import { CreneauPeriodique } from 'src/app/formulaire-creneau/formulaire-creneau/formulaire-creneau.component';
import { CreneauScore } from 'src/app/match-planning/match-planning.component';
export type MatchAvecCreneau = Match & { creneau?: Creneau };
export class CalendrierComplet {
  date:Date;
  evenements:Evenement[] = [];
  matchs:Match[]= [];
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
  editgymnase: Gymnase = null;
  histogymnase:string = "";
  creneauxFiltres: Creneau[] = [];
  gymnases: Gymnase[] = [];
  gymnasesFiltres: Gymnase[] = [];
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
  this.Calendrier = this.mapCalendriers(this.Calendrier);
  this.creneauxFiltres = this.creneaux.filter(x => x.club == this.db.selectedClub);
   this.creneaux.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Infinity;
    const dateB = b.date ? new Date(b.date).getTime() : Infinity;
    return dateA - dateB;
  });
  this.creneauxFiltres.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Infinity;
    const dateB = b.date ? new Date(b.date).getTime() : Infinity;
    return dateA - dateB;
  });
  this.gymnases = await firstValueFrom(this.db.getGymnases());
  this.gymnasesFiltres = this.gymnases.filter(x => x.club == this.db.selectedClub);
   this.gymnasesFiltres.sort((a,b) => a.nom > b.nom ? 1 : -1)
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
   const dateA = a.creneau?.date ? new Date(a.creneau.date).getTime() : Infinity;
  const dateB = b.creneau?.date ? new Date(b.creneau.date).getTime() : Infinity;
    return dateA - dateB;
  });
}

mapCalendriers(calendriers: any[]): any[] {
  return calendriers.map(c => ({
    ...c,
    date_debut: new Date(c.date_debut),
    date_fin: c.date_fin ? new Date(c.date_fin) : null
  }));
}


private enrichirCalendrier(): CalendrierComplet[] {
  const debut = new Date(2025, 8, 1); // 1er septembre 2025
  const fin = new Date(2026, 5, 30);  // 30 juin 2026
  let calcomp: CalendrierComplet[] = [];

  let date = new Date(debut);
  while (date <= fin) {
    let unjour: CalendrierComplet = new CalendrierComplet();
    unjour.date = new Date(date);
    unjour.evenements = [];

    // 1. Jours fériés sans date_fin
    const feries = this.Calendrier.filter(x => this.sameDay(date, x.date_debut) && !x.date_fin);
    for (const f of feries) {
      const ev: Evenement = {
        id: f.id,
        type: "jour férié",
        zone: f.pays,
        priorite: 3,
        libelle: "Jour férié dans la zone " + this.getZoneLibelle(f.pays)
      };
      unjour.evenements.push(ev);
    }

    // 2. Vacances avec une plage (date_debut à date_fin)
    const vacances = this.Calendrier.filter(x => x.date_debut && x.date_fin && this.plageDay(date, x.date_debut, x.date_fin));
    for (const v of vacances) {
      const ev: Evenement = {
        id: v.id,
        type: "vacances",
        zone: v.pays,
        priorite: 3,
        libelle: "Vacances dans la zone " + this.getZoneLibelle(v.pays)
      };
      unjour.evenements.push(ev);
    }
    const matchs = this.matchs.filter(x => x.creneau && this.sameDay(date, new Date(x.creneau.date)) );
    for (const ev of matchs) {
      
      unjour.matchs.push(ev);
    }
    calcomp.push(unjour);
    date.setDate(date.getDate() + 1); // jour suivant
  }

  return calcomp;
}

private getZoneLibelle(pays: number): string {
  switch (pays) {
    case 0: return "France";
    case 1: return "zone C France : Ile de France";
    case 2: return "Belge";
    case 3: return "zone B France : Sud";
    default: return "Zone A";
  }
}
isWeekend(date: Date): boolean {
  const day = date.getDay(); // 0 = dimanche, 6 = samedi
  return day === 0 || day === 6;
}



 sameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}
 plageDay(d1: Date, d2: Date, d3: Date): boolean {
  // On "nettoie" les 3 dates pour ne garder que jour/mois/année
  const clean = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const date = clean(d1);
  const debut = clean(d2);
  const fin = clean(d3);

  return date >= debut && date <= fin;
}


 getDateMatch(m: Match): string {
     const c = this.creneaux.find(c => c.id === m.creneau_choisi);
     if(c){
      return new Date(c.date).toLocaleDateString();
     } else {
      return "-";
     }
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
    if (!c) return '—';
    if (c.gymnase) {
      const gymnase = this.gymnases.find(g => g.id === c.gymnase);
      return gymnase ? gymnase.nom : '—';
    } else {
      return "-"
    }
  }
  getGymnaseList(id:number){
        const gymnase = this.gymnases.find(g => g.id === id);
      return gymnase ? gymnase.nom : '—';
  }
  updateCreneau(c:Creneau){
    this.db.updateCreneau(c).subscribe({
      next: () => {
        console.log("Créneau mis à jour");
      },
      error: (err) => {
        console.error("Erreur lors de la mise à jour du créneau", err);
      }
    });
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

checksiVacances(date:Date, pays:number) : boolean {
let cc = this.calendrierComplet.find(x => this.sameDay(date, x.date))

  if(cc.evenements.find(x => x.type == "vacances" && x.zone == pays)){
   return true;
  } else {
  return false;
  }
}
checksiFerie(date:Date, pays:number) : boolean {
let cc = this.calendrierComplet.find(x => this.sameDay(date, x.date))
  if(cc.evenements.find(x => x.type == "jour férié" && ((x.zone == pays) || (x.zone == 0 && pays != 2)))){
   return true;
  } else {
  return false;
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
    let msg = "Créneau supprimé";
    if(liés.length>0){
      msg ="Créneau supprimé, matchs sur le créneau à replanifier";
    }
    for (let m of liés) {
      m.creneau_choisi = 0;
      await firstValueFrom(this.db.updateMatch(m));
    }
    await firstValueFrom(this.db.deleteCreneau(c.id));
    
    window.alert(msg);
    this.chargerTout();
  }

  modifierCreneau(c: Creneau) {
    // Tu pourrais ici ouvrir un mode édition si besoin
    this.modeCreneau = 'unique';
    
    // Et passer les données à un composant ou form
  }

  async rafraichirCreneaux() {
    this.modeCreneau = null;
    this.chargerTout();
  }
  CreerPeriodique(data:CreneauPeriodique){
      const jourSemaine = this.convertirJourEnNumero(data.jour); // 0 = dimanche, 1 = lundi, etc.
  const dateCourante = new Date(data.dateDebut);
  const dateFin = new Date(data.dateFin);

  while (dateCourante <= dateFin) {
    if (dateCourante.getDay() === jourSemaine) {
const creerCreneau = async () => {
  const nouveauCreneau: Creneau = {
    id: 0,
    date: new Date(dateCourante),
    heure_debut: data.heureDebut,
    heure_fin: data.heureFin,
    club: this.db.selectedClub,
    gymnase: data.gymnase,
    notes:'',
  };
 await firstValueFrom(this.db.createCreneau(nouveauCreneau));
};
      // TODO: vérifier si la date est dans les vacances scolaires ou jour férié
      const estVacances = this.checksiVacances(new Date(dateCourante), this.clubs.find(x => x.id == this.db.selectedClub).pays); // à implémenter
      const estJourFerie = this.checksiFerie(new Date(dateCourante), this.clubs.find(x => x.id == this.db.selectedClub).pays);; // à implémenter
      if(estVacances || estJourFerie){
        console.log(dateCourante)
      }
if (estJourFerie && estVacances && data.joursFeries && data.vacances) {
  creerCreneau();
} else if (estJourFerie && data.joursFeries) {
  creerCreneau();
} else if (estVacances && data.vacances) {
  creerCreneau();
} else if (!estJourFerie && !estVacances) {
  creerCreneau();
}

     
    }

    // Passer au jour suivant
    dateCourante.setDate(dateCourante.getDate() + 1);
  }
}

  convertirJourEnNumero(jour: string): number {
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return jours.indexOf(jour.toLowerCase());
}


  majFiltres(filtre: any) {
    this.matchsFiltres = this.matchs.filter(m => {
      if (filtre.categorieId && filtre.categorieId != m.categorie) return false;
      if (filtre.equipeId && filtre.equipeId != m.domicile && filtre.equipeId != m.exterieur) return false;
      if (filtre.clubId && filtre.clubId != this.equipesEngagees.find(x => x.id == m.domicile).club && filtre.clubId != this.equipesEngagees.find(x => x.id == m.exterieur).club) return false;
      return true;
    });
  }

 EvaluerCreneau(creneaux: Creneau[], selectedMatch: Match): CreneauScore[] {
  // Récupérer clubs et pays des équipes domicile et extérieur
  const clubDom = this.equipesEngagees.find(y => y.id === selectedMatch.domicile)?.club;
  const clubExt = this.equipesEngagees.find(y => y.id === selectedMatch.exterieur)?.club;
  const paysDom = this.clubs.find(x => x.id === clubDom)?.pays;
  const paysExt = this.clubs.find(x => x.id === clubExt)?.pays;

  // Durée nécessaire du match
  const dureeMatch = this.categories.find(x => x.id === selectedMatch.categorie)?.duree ?? 0;

  return creneaux.map(cr => {
    let score = 0;
    const motifs: string[] = [];  // tableau pour accumuler

    const dateCreneau = new Date(cr.date);
    const dateCreneauPlus1 = new Date(dateCreneau);
    dateCreneauPlus1.setDate(dateCreneauPlus1.getDate() + 1);
    const dateCreneauMoins1 = new Date(dateCreneau);
    dateCreneauMoins1.setDate(dateCreneauMoins1.getDate() - 1);

    // Trouver les jours dans le calendrier complet
    const jourCreneau = this.calendrierComplet.find(x => this.sameDay(new Date(x.date), dateCreneau));
    const jourPlus1 = this.calendrierComplet.find(x => this.sameDay(new Date(x.date), dateCreneauPlus1));
    const jourMoins1 = this.calendrierComplet.find(x => this.sameDay(new Date(x.date), dateCreneauMoins1));

    jourCreneau.matchs.forEach((m) =>{
      if(m.creneau_choisi == cr.id){
        motifs.push("Match sur le créneau : " + this.getEquipeNom(m.domicile) + " - " + this.getEquipeNom(m.exterieur) + " " + this.getCategorieNom(m.categorie) )
      }
    })
    
    // 1. Pas un week-end
    if (dateCreneau.getDay() !== 0 && dateCreneau.getDay() !== 6) {
      score += 4;
      motifs.push("Créneau en semaine");
    }

    // 2. Vacances et jours fériés
    if (jourCreneau?.evenements) {
      jourCreneau.evenements.forEach(ev => {
        if (ev.type === "jour férié" && (ev.zone === paysDom || (ev.zone === 0 && paysDom !== 2))) {
          score += 3;
      motifs.push("Jour férié équipe à domicile");
        }
        if (ev.type === "jour férié" && (ev.zone === paysExt || (ev.zone === 0 && paysExt !== 2))) {
          score += 3;
      motifs.push("Jour férié équipe à l'extérieur");
        }
        if (ev.type === "vacances" && ev.zone === paysDom) {
          score += 5;
      motifs.push("Vacances pour l'équipe à domicile");
        }
        if (ev.type === "vacances" && ev.zone === paysExt) {
          score += 5;
      motifs.push("Vacances pour l'équipe à l'extérieur");
        }
      });
    }
    

    // 3. Calcul durée du créneau en minutes
    // Supposons que heure_debut et heure_fin sont en heures décimales (ex: 14.5 = 14h30)
    const debutMin = this.timeStringToMinutes(cr.heure_debut);
    const finMin = this.timeStringToMinutes(cr.heure_fin);
    const nbMinCreneau = finMin - debutMin;

    // 4. Total des minutes occupées par des matchs ce jour-là
    let minutesOccupees = 0;

    if (jourCreneau?.matchs) {
      jourCreneau.matchs.forEach(mm => {
        const cat = this.categories.find(x => x.id === mm.categorie);
        if (cat) minutesOccupees += cat.duree;

        const clubDomMatch = this.equipesEngagees.find(y => y.id === mm.domicile)?.club;
        const clubExtMatch = this.equipesEngagees.find(y => y.id === mm.exterieur)?.club;

        if (clubDomMatch === clubDom || clubExtMatch === clubDom) {
          score += 2;
          motifs.push("Club domicile engagé dans un match le même jour");
        }
        if (clubDomMatch === clubExt || clubExtMatch === clubExt) {
          score += 2;
          motifs.push("Club extérieur engagé dans un match le même jour");
        }
      });
    }

    // 5. Match la veille
    if (jourMoins1?.matchs) {
      jourMoins1.matchs.forEach(mm => {
        const clubDomMatch = this.equipesEngagees.find(y => y.id === mm.domicile)?.club;
        const clubExtMatch = this.equipesEngagees.find(y => y.id === mm.exterieur)?.club;

        if (clubDomMatch === clubDom || clubExtMatch === clubDom) {
          score += 1;
          motifs.push("Club domicile engagé dans un match la veille");
        }
        if (clubDomMatch === clubExt || clubExtMatch === clubExt) {
          score += 1;
          motifs.push("Club extérieur engagé dans un match la veille");
        }
      });
    }

    // 6. Match le lendemain
    if (jourPlus1?.matchs) {
      jourPlus1.matchs.forEach(mm => {
        const clubDomMatch = this.equipesEngagees.find(y => y.id === mm.domicile)?.club;
        const clubExtMatch = this.equipesEngagees.find(y => y.id === mm.exterieur)?.club;

        if (clubDomMatch === clubDom || clubExtMatch === clubDom) {
          score += 1;
          motifs.push("Club domicile engagé dans un match le lendemain");
        }
        if (clubDomMatch === clubExt || clubExtMatch === clubExt) {
          score += 1;
          motifs.push("Club extérieur engagé dans un match le lendemain");
        }
      });
    }

    // 7. Vérifier s'il reste assez de temps libre dans le créneau
    const minutesRestantes = nbMinCreneau - minutesOccupees;
    if (minutesRestantes < dureeMatch) {
      score += 4;
      motifs.push("Pas assez de temps disponible dans le créneau");
    }
    const motif = `<ul>${motifs.map(m => `<li>${m}</li>`).join('')}</ul>`;

    // Retourner l'objet avec score et motif
    return { ...cr, score, motif };
  });
}
timeStringToMinutes(timeStr: string): number {
  const [h, m, s] = timeStr.split(':').map(Number);
  return h * 60 + m + s / 60;
}
ModifierNomGymnase(c:Gymnase){
  this.editgymnase = c;
  this.histogymnase = JSON.stringify(c);
}
  RetourGymnase() {
    this.editgymnase = null;
    this.histogymnase = "";
  }

  async ValiderGymnase() {
    if (this.histogymnase != JSON.stringify(this.editgymnase)) {
      if (this.editgymnase.id > 0) {
        await firstValueFrom(this.db.updateGymnase(this.editgymnase));
      } else {
        this.editgymnase.club = this.db.selectedClub;
        await firstValueFrom(this.db.createGymnase(this.editgymnase));
      }
    }
    this.editgymnase = null;
    this.chargerTout();
  }

  CreerGymnase() {
    this.editgymnase = { id: 0, nom: '', club: this.db.selectedClub };
  }
  SupprimerGymnase(c: Gymnase) {
    if (window.confirm("Voulez-vous vraiment supprimer ce gymnase ?")) {
      firstValueFrom(this.db.deleteGymnase(c.id)).then(() => {
        this.chargerTout();
      });
    }
  }

}
