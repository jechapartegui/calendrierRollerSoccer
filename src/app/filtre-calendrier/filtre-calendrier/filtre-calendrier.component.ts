import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Categorie, Club, EquipeEngagee } from 'src/app/class';

@Component({
  selector: 'app-filtre-calendrier',
  templateUrl: './filtre-calendrier.component.html',
  styleUrls: ['./filtre-calendrier.component.css']
})

export class FiltreCalendrierComponent {
  @Input() clubs: Club[] = [];
  @Input() categories: Categorie[] = [];
  @Input() equipes: EquipeEngagee[] = [];

  @Output() filtreChange = new EventEmitter<{
    clubId: number | null;
    categorieId: number | null;
    equipeId: number | null;
  }>();

  selectedClub: number | null = null;
  selectedCategorie: number | null = null;
  selectedEquipe: number | null = null;

  onChange() {
    this.filtreChange.emit({
      clubId: this.selectedClub,
      categorieId: this.selectedCategorie,
      equipeId: this.selectedEquipe
    });
  }

  getCategorieNom(categorieId: number | null): string {
  if (!categorieId) return '?';
  return this.categories.find(c => c.id === categorieId)?.nom ?? '?';
}
}
