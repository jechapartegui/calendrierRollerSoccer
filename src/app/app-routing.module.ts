import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClubComponent } from './club/club.component';
import { MainComponent } from './main/main.component';

const routes: Routes = [
    { path: '', component: ClubComponent }, // <-- route par défaut
    { path: 'main', component: MainComponent }, // <-- route par défaut
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
