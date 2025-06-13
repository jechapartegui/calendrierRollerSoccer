import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Club } from 'src/app/class';
import { DbService } from 'src/app/db.service';

@Component({
  selector: 'app-club',
  templateUrl: './club.component.html',
  styleUrls: ['./club.component.css']
})
export class ClubComponent implements OnInit {
    constructor(private dbService: DbService, private router: Router) {}
  ngOnInit(): void {
    this.dbService.getListeClub().subscribe({
      next: (data) => this.clubs = data,
      error: (err) => console.error('Erreur de chargement des clubs', err)
    });
  }

  seConnecter(): void {
      this.dbService.validerCode(this.selectedclub,this.clubCode).subscribe({
      next: (data) => {
        if(data){
          //stocker que mon club c'est selectedClub!!
          this.dbService.selectedClub = this.selectedclub;
          this.router.navigate(['/main'])
        }
      },
      error: (err) => console.error('Erreur de chargement des clubs', err)
    });
  }

  public clubs:Club[];
  public selectedclub:number;
  clubCode: string;

}
