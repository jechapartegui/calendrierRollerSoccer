import {
  LOCALE_ID,
  NgModule
} from '@angular/core';

import {
  DatePipe,
  registerLocaleData
} from '@angular/common';

import localeFr from '@angular/common/locales/fr';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ClubComponent } from './club/club.component';
import { FormsModule } from '@angular/forms';
import { DbService } from './db.service';
import { HttpClientModule } from '@angular/common/http';
import { MainComponent } from './main/main.component';
import { FormulaireCreneauComponent } from './formulaire-creneau/formulaire-creneau.component';
import { FiltreCalendrierComponent } from './filtre-calendrier/filtre-calendrier.component';
import { MatchPlanningComponent } from './match-planning/match-planning.component';
import { FilterByDatePipe } from './filterDate.pipe';
import { FilterByGymnasePipe } from './filterGymnase.pipe';
import { ShowcaseComponent } from './showcase/showcase.component';

registerLocaleData(localeFr, 'fr-FR');

@NgModule({
  declarations: [
    AppComponent,
    ClubComponent,
    MainComponent,
    FormulaireCreneauComponent,
    FiltreCalendrierComponent,
    MatchPlanningComponent,
    FilterByDatePipe,
    FilterByGymnasePipe,
    ShowcaseComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    DatePipe,
    DbService,
    {
      provide: LOCALE_ID,
      useValue: 'fr-FR'
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
