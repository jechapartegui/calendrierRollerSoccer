import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Creneau } from 'src/app/class';
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
  heureDebut: string = '';
  heureFin: string = '';
  gymnase: string = '';
  vacances: boolean = false;
  joursFeries: boolean = false;

  constructor(private db: DbService) {}

  async valider() {
    const club = this.db.selectedClub;

    if (this.mode === 'periodique') {
      const data = {
        date: this.date,
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
      const creneau: Creneau = {
        id:0,
        date: this.date,
        heure_debut: this.heureDebut,
        heure_fin: this.heureFin,
        gymnase: this.gymnase,
        club: club
      };
      await this.db.createCreneau(creneau);
    }

    this.done.emit();
  }

  annuler() {
    this.cancel.emit();
  }
}