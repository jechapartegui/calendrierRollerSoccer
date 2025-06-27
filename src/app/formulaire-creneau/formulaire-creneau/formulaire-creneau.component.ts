import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Calendrier, Creneau, Gymnase } from 'src/app/class';
import { firstValueFrom } from 'rxjs';
import { DbService } from 'src/app/db.service';

export class CreneauPeriodique{
  jour = 'dimanche';
  heureDebut: string = '';
  heureFin: string = '';
  gymnase: number = null;
  vacances: boolean = false;
  joursFeries: boolean = false;
  dateDebut:Date;
  dateFin:Date;
  notes: string = '';
}
@Component({
  selector: 'app-formulaire-creneau',
  templateUrl: './formulaire-creneau.component.html',
  styleUrls: ['./formulaire-creneau.component.css']
})
export class FormulaireCreneauComponent {
  @Input() mode: 'periodique' | 'unique' | null = null;
  @Input() gymnases: Gymnase[] = [];
  @Output() cancel = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();
  @Output() creneaux = new EventEmitter<CreneauPeriodique>();

  date: Date;
  jour = 'dimanche';
  heureDebut: string = '';
  heureFin: string = '';
  gymnase: number = null;
  vacances: boolean = false;
  joursFeries: boolean = false;
  notes: string = '';
minDateStr = '2025-09-01';
maxDateStr = '2026-05-31';

  constructor(private db: DbService) {}

  async valider() {
    const club = this.db.selectedClub;

    if (this.mode === 'periodique') {
      const data =  new CreneauPeriodique();
      data.gymnase = null;
      data.dateDebut = new Date(this.minDateStr);
      data.dateFin = new Date(this.maxDateStr);
      data.heureDebut = this.heureDebut;
      data.heureFin = this.heureFin;
      data.jour = this.jour;
         data.notes = this.notes;
      data.vacances = this.vacances;
      data.joursFeries = this.joursFeries;
      this.creneaux.emit(data);
    }

    if (this.mode === 'unique') {
      const dateObj = new Date(this.date);
      dateObj.setHours(12, 0, 0, 0);
      const creneau: Creneau = new Creneau();
     creneau.date = dateObj;
         creneau.heure_debut = this.heureDebut;
         creneau.heure_fin = this.heureFin;
         creneau.gymnase = null;
         creneau.notes = this.notes;
         creneau.club = club;
      await firstValueFrom(this.db.createCreneau(creneau));
    }

    this.done.emit();
  }
  

  annuler() {
    this.cancel.emit();
  }
}