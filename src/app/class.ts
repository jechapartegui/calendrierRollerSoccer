// models.ts

export class Calendrier {
  id: number = 0;
  date_debut: Date = new Date();
  date_fin?: Date;
  pays: number = 1;
  motif: string = '';
}

export class Categorie {
  id: number = 0;
  nom: string = '';
  duree:number=0;
}

export class Club {
  id: number = 0;
  nom: string = '';
  code: string = '';
  pays: number = 1;
}

export class Creneau {
  id: number = 0;
  date: Date = new Date();
  heure_debut: string = ''; // format HH:mm:ss
  heure_fin: string = '';   // format HH:mm:ss
  club: number = 0;
  gymnase: string = '';
}

export class EquipeEngagee {
  id: number = 0;
  nom: string = '';
  club: number = 0;
  categorie: number = 0;
}

export class Match {
  id: number = 0;
  domicile: number = 0;
  exterieur: number = 0;
  categorie: number = 0;
  club_recevant: number = 0;
  creneau_choisi?: number;
}
