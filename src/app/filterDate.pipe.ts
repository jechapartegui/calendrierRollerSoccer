// filter-by-date.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Creneau } from './class';

@Pipe({ name: 'filterByDate' })
export class FilterByDatePipe implements PipeTransform {
  transform(
    items: Creneau[],
    dateDebut: string | null,
    dateFin:   string | null
  ): Creneau[] {
    if (!dateDebut && !dateFin) {
      return items;
    }
    const dDeb = dateDebut ? new Date(dateDebut) : null;
    const dFin = dateFin   ? new Date(dateFin)   : null;

    return items.filter(c => {
      const d = new Date(c.date);
      if (dDeb && d < dDeb) { return false; }
      if (dFin && d > dFin) { return false; }
      return true;
    });
  }
}
