import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import {
  Categorie,
  Club,
  EquipeEngagee
} from 'src/app/class';

export type FiltreCalendrierMode =
  | 'matchs'
  | 'calendrier';

export interface FiltreCalendrierValue {
  clubId: number | null;
  categorieId: number | null;
  equipeId: number | null;
  planifie: boolean | null;

  dateDebut: string | null;
  dateFin: string | null;

  afficherMatchs: boolean;
  afficherEvenements: boolean;
  afficherIndisponibilites: boolean;
  uniquementAvecContenu: boolean;
}

@Component({
  selector: 'app-filtre-calendrier',
  templateUrl:
    './filtre-calendrier.component.html',
  styleUrls: [
    './filtre-calendrier.component.css'
  ]
})
export class FiltreCalendrierComponent {

  @Input()
  mode:
    FiltreCalendrierMode = 'matchs';

  @Input()
  clubs: Club[] = [];

  @Input()
  categories: Categorie[] = [];

  @Input()
  equipes: EquipeEngagee[] = [];

  /*
   * L'input permet au filtre de connaître le nombre
   * de contraintes disponibles, sans lui imposer
   * la structure exacte du futur modèle back.
   */
  @Input()
  indisponibilites: unknown[] = [];

  @Output()
  filtreChange =
    new EventEmitter<
      FiltreCalendrierValue
    >();

  public selectedClub:
    number | null = null;

  public selectedCategorie:
    number | null = null;

  public selectedEquipe:
    number | null = null;

  public selectedPlanifie:
    boolean | null = null;

  public dateDebut:
    string | null = null;

  public dateFin:
    string | null = null;

  public afficherMatchs = true;
  public afficherEvenements = true;
  public afficherIndisponibilites = true;
  public uniquementAvecContenu = false;

  public get isCalendrierMode():
    boolean {

    return this.mode === 'calendrier';
  }

  public get equipesFiltrees():
    EquipeEngagee[] {

    return this.equipes
      .filter(
        equipe =>
          !this.selectedClub ||
          Number(equipe.club) ===
            Number(
              this.selectedClub
            )
      )
      .filter(
        equipe =>
          !this.selectedCategorie ||
          Number(equipe.categorie) ===
            Number(
              this.selectedCategorie
            )
      )
      .sort(
        (a, b) =>
          a.nom.localeCompare(b.nom)
      );
  }

  public onChange():
    void {

    if (
      this.selectedEquipe &&
      !this.equipesFiltrees.some(
        equipe =>
          Number(equipe.id) ===
          Number(this.selectedEquipe)
      )
    ) {
      this.selectedEquipe = null;
    }

    this.filtreChange.emit(
      this.getValue()
    );
  }

  public reset():
    void {

    this.selectedClub = null;
    this.selectedCategorie = null;
    this.selectedEquipe = null;
    this.selectedPlanifie = null;

    this.dateDebut = null;
    this.dateFin = null;

    this.afficherMatchs = true;
    this.afficherEvenements = true;
    this.afficherIndisponibilites = true;
    this.uniquementAvecContenu = false;

    this.onChange();
  }

  public getCategorieNom(
    categorieId:
      number | null
  ): string {

    if (!categorieId) {
      return '?';
    }

    return (
      this.categories.find(
        categorie =>
          Number(categorie.id) ===
          Number(categorieId)
      )?.nom ??
      '?'
    );
  }

  private getValue():
    FiltreCalendrierValue {

    return {
      clubId:
        this.selectedClub,

      categorieId:
        this.selectedCategorie,

      equipeId:
        this.selectedEquipe,

      planifie:
        this.selectedPlanifie,

      dateDebut:
        this.dateDebut,

      dateFin:
        this.dateFin,

      afficherMatchs:
        this.isCalendrierMode
          ? this.afficherMatchs
          : true,

      afficherEvenements:
        this.isCalendrierMode
          ? this.afficherEvenements
          : true,

      afficherIndisponibilites:
        this.isCalendrierMode
          ? this.afficherIndisponibilites
          : true,

      uniquementAvecContenu:
        this.isCalendrierMode
          ? this.uniquementAvecContenu
          : false
    };
  }
}
