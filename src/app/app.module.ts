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

@NgModule({
  declarations: [
    AppComponent,
    ClubComponent,
    MainComponent,
    FormulaireCreneauComponent,
    FiltreCalendrierComponent 
  ],
  imports: [
    BrowserModule, HttpClientModule,
    AppRoutingModule, FormsModule
  ],
  providers: [DbService],
  bootstrap: [AppComponent]
})
export class AppModule { }
