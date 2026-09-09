import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClubComponent } from './club/club.component';
import { MainComponent } from './main/main.component';
import { ShowcaseComponent } from './showcase/showcase.component';

const routes: Routes = [
  { path: '', component: ShowcaseComponent },
  { path: 'clubs', component: ClubComponent },
  { path: 'main', component: MainComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { anchorScrolling: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
