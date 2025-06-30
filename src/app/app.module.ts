import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AllServices } from './services';
import { ClubComponent } from './club/club/club.component';
import { FormsModule } from '@angular/forms';
import { DbService } from './db.service';
import { HttpClientModule } from '@angular/common/http';
import { MainComponent } from './main/main/main.component';
import { FormulaireCreneauComponent } from './formulaire-creneau/formulaire-creneau/formulaire-creneau.component';
import { FiltreCalendrierComponent } from './filtre-calendrier/filtre-calendrier/filtre-calendrier.component';
import { MatchPlanningComponent } from './match-planning/match-planning.component';
import { DatePipe } from '@angular/common';
import { FilterByDatePipe } from './filterDate.pipe';
import { FilterByGymnasePipe } from './filterGymnase.pipe';

@NgModule({
  declarations: [
    AppComponent,
    ClubComponent,
    MainComponent,
    FormulaireCreneauComponent,
    FiltreCalendrierComponent, MatchPlanningComponent, FilterByDatePipe,
    FilterByGymnasePipe,
  ],
  imports: [
    BrowserModule, HttpClientModule,
    AppRoutingModule, FormsModule
  ],
  providers: [DbService, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
