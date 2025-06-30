// filter-by-gymnase.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Creneau } from './class';

@Pipe({ name: 'filterByGymnase' })
export class FilterByGymnasePipe implements PipeTransform {
  transform(
    items: Creneau[],
    gymnaseId: number | null
  ): Creneau[] {
    if (gymnaseId == null) {
      return items;
    }
    return items.filter(c => Number(c.gymnase) === Number(gymnaseId));
  }
}
