import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Calendrier, Creneau } from 'src/app/class';
import { firstValueFrom } from 'rxjs';
import { DbService } from 'src/app/db.service';

export class CreneauPeriodique{
  jour = 'dimanche';
  heureDebut: string = '';
  heureFin: string = '';
  gymnase: string = '';
  vacances: boolean = false;
  joursFeries: boolean = false;
  dateDebut:Date;
  dateFin:Date;
}
@Component({
  selector: 'app-formulaire-creneau',
  templateUrl: './formulaire-creneau.component.html',
  styleUrls: ['./formulaire-creneau.component.css']
})
export class FormulaireCreneauComponent {
  @Input() mode: 'periodique' | 'unique' | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();
  @Output() creneaux = new EventEmitter<CreneauPeriodique>();

  date: Date;
  jour = 'dimanche';
  heureDebut: string = '';
  heureFin: string = '';
  gymnase: string = '';
  vacances: boolean = false;
  joursFeries: boolean = false;
minDateStr = '2025-09-01';
maxDateStr = '2026-05-31';

  constructor(private db: DbService) {}

  async valider() {
    const club = this.db.selectedClub;

    if (this.mode === 'periodique') {
      const data =  new CreneauPeriodique();
      data.gymnase = this.gymnase;
      data.dateDebut = new Date(this.minDateStr);
      data.dateFin = new Date(this.maxDateStr);

      data.heureDebut = this.heureDebut;
      data.heureFin = this.heureFin;
      data.jour = this.jour;
      data.vacances = this.vacances;
      data.joursFeries = this.joursFeries;
      this.creneaux.emit(data);
    }

    if (this.mode === 'unique') {
      const dateObj = new Date(this.date);
      dateObj.setHours(12, 0, 0, 0);
      const creneau: Creneau = {
        id:0,
        date: dateObj,
        heure_debut: this.heureDebut,
        heure_fin: this.heureFin,
        gymnase: this.gymnase,
        club: club
      };
      await firstValueFrom(this.db.createCreneau(creneau));
    }

    this.done.emit();
  }
  

  annuler() {
    this.cancel.emit();
  }
}