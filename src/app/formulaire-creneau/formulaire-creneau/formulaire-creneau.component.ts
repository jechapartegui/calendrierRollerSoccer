import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Creneau } from 'src/app/class';
import { firstValueFrom } from 'rxjs';
import { DbService } from 'src/app/db.service';

@Component({
  selector: 'app-formulaire-creneau',
  templateUrl: './formulaire-creneau.component.html',
  styleUrls: ['./formulaire-creneau.component.css']
})
export class FormulaireCreneauComponent {
  @Input() mode: 'periodique' | 'unique' | null = null;
  @Output() cancel = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();

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
      const data = {
        jour: this.jour,
        heure_debut: this.heureDebut,
        heure_fin: this.heureFin,
        gymnase: this.gymnase,
        club: club,
        vacances: this.vacances,
        jours_feries: this.joursFeries
      };
      await this.db.procedureCreerCreneauPeriodique(data); // à implémenter
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