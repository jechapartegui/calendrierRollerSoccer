export type DateMetier = Date | string;
export type ZoneFrance = 'A' | 'B' | 'C' | string;
export type ReferenceGymnase = number | string | null;

export class Saison {
  id: number = 0;
  nom: string = '';

  /*
   * Conservés pour compatibilité avec les écrans existants.
   * Selon la version du back, nom ou libelle peut être renseigné.
   */
  libelle?: string;
  active?: boolean;

  date_debut: string | null = null;
  date_fin: string | null = null;
}

export class Calendrier {
  id: number = 0;
  date_debut: DateMetier = '';
  date_fin: DateMetier | null = null;
  pays: number = 1;
  motif: string = '';
  equipe: number | null = null;
  saison?: number;
  club: number | null = null;
  heure_debut: string | null = null;
  heure_fin: string | null = null;
  zone: ZoneFrance | null = null;
}

export class Categorie {
  id: number = 0;
  nom: string = '';
  duree: number = 10;
  saison?: number;
}

export class Club {
  id: number = 0;
  nom: string = '';
  code: string = '';
  pays: number = 1;
  zone: ZoneFrance | null = null;
}

export class Creneau {
  id: number = 0;
  date: DateMetier = '';
  heure_debut: string = '';
  heure_fin: string = '';
  club: number = 0;

  /*
   * La BDD reste inchangée : le champ est actuellement susceptible
   * d'arriver sous forme d'identifiant numérique, de texte numérique
   * ou de libellé historique.
   */
  gymnase: ReferenceGymnase = null;

  notes: string = '';
  saison?: number;

  /*
   * Optionnels côté TypeScript pour rester compatible avec
   * les anciennes lignes et les objets créés avant leur ajout.
   */
  creneau_confirme?: boolean;
  un_club?: boolean;
}

export class Gymnase {
  id: number = 0;
  nom: string = '';
  club: number = 0;
}

export class EquipeEngagee {
  id: number = 0;
  nom: string = '';
  club: number = 0;
  categorie: number = 0;

  /*
   * Optionnel pour permettre les objets de formulaire :
   * { id, nom, club, categorie }.
   * Le service ajoute la saison avant l'envoi au back.
   */
  saison?: number;
}

export class Match {
  id: number = 0;
  domicile: number = 0;
  exterieur: number = 0;
  categorie: number = 0;
  club_recevant: number = 0;
  creneau_choisi: number | null = null;
  arbitre: number | null = null;
  saison?: number;
  requete_arbitre?: boolean;
}