import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';

import { Club } from 'src/app/class';
import {
  AllServices,
  Saison
} from 'src/app/services';

@Component({
  selector: 'app-club',
  templateUrl: './club.component.html',
  styleUrls: ['./club.component.css']
})
export class ClubComponent implements OnInit {

  public clubs: Club[] = [];
  public saisons: Saison[] = [];

  public selectedClubId: number | null = null;
  public selectedSaisonId: number | null = null;

  public clubCode = '';

  public loading = false;
  public connecting = false;
  public showCode = false;

  public errorMessage = '';

  constructor(
    private readonly services: AllServices,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.chargerDonneesConnexion();
  }

  public chargerDonneesConnexion(): void {
    this.loading = true;
    this.errorMessage = '';

    this.services
      .loadConnectionData()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: ({ clubs, saisons }) => {
          this.clubs = clubs;
          this.saisons = saisons;

          this.restaurerSelection();
          this.selectionnerSaisonParDefaut();
        },

        error: error => {
          console.error(
            'Erreur lors du chargement des données de connexion',
            error
          );

          this.errorMessage =
            'Impossible de charger la liste des clubs et des saisons.';
        }
      });
  }

  public async seConnecter(): Promise<void> {
    this.errorMessage = '';

    if (!this.formulaireValide) {
      this.errorMessage =
        'Sélectionne un club, une saison et renseigne le code du club.';
      return;
    }

    const club = this.clubs.find(
      item =>
        Number(item.id) === Number(this.selectedClubId)
    );

    const saison = this.saisons.find(
      item =>
        Number(item.id) === Number(this.selectedSaisonId)
    );

    if (!club || !saison) {
      this.errorMessage =
        'Le club ou la saison sélectionné(e) est introuvable.';
      return;
    }

    this.connecting = true;

    try {
      /*
       * 1. Validation du code du club.
       */
      const validation = await firstValueFrom(
        this.services.validerCode(
          Number(club.id),
          this.clubCode.trim()
        )
      );

      if (validation.valid !== true) {
        this.errorMessage =
          'Le code du club est incorrect.';
        return;
      }

      /*
       * 2. Enregistrement du club et de la saison
       * dans le store et dans sessionStorage.
       */
      this.services.setSelection(
        club,
        saison
      );

      /*
       * 3. Chargement complet des données de la saison.
       *
       * Les clubs et les saisons sont déjà chargés.
       * On récupère ici les données métier :
       * calendrier, catégories, créneaux, équipes,
       * matchs et gymnases.
       */
      await firstValueFrom(
        this.services.loadApplicationData()
      );

      /*
       * 4. Navigation uniquement lorsque le store
       * est complètement alimenté.
       */
      const navigationOk = await this.router.navigate(
        ['/main'],
        {
          replaceUrl: true
        }
      );

      if (!navigationOk) {
        this.errorMessage =
          'La navigation vers l’écran principal a été refusée.';
      }
    } catch (error) {
      console.error(
        'Erreur pendant la connexion au club',
        error
      );

      this.errorMessage =
        'Une erreur est survenue pendant le chargement des données.';
    } finally {
      this.connecting = false;
    }
  }

  public toggleCodeVisibility(): void {
    this.showCode = !this.showCode;
  }

  public get formulaireValide(): boolean {
    return (
      this.selectedClubId !== null &&
      this.selectedSaisonId !== null &&
      this.clubCode.trim().length > 0 &&
      !this.loading &&
      !this.connecting
    );
  }

  public getSaisonLabel(
    saison: Saison
  ): string {
    if (saison.nom) {
      return saison.nom;
    }

    if (saison.libelle) {
      return saison.libelle;
    }

    if (
      saison.date_debut &&
      saison.date_fin
    ) {
      const anneeDebut =
        new Date(saison.date_debut).getFullYear();

      const anneeFin =
        new Date(saison.date_fin).getFullYear();

      return `${anneeDebut}-${anneeFin}`;
    }

    return `Saison ${saison.id}`;
  }

  private restaurerSelection(): void {
    const selectedClub =
      this.services.selectedClub;

    const selectedSaison =
      this.services.selectedSaison;

    if (
      selectedClub &&
      this.clubs.some(
        club =>
          Number(club.id) ===
          Number(selectedClub.id)
      )
    ) {
      this.selectedClubId =
        Number(selectedClub.id);
    }

    if (
      selectedSaison &&
      this.saisons.some(
        saison =>
          Number(saison.id) ===
          Number(selectedSaison.id)
      )
    ) {
      this.selectedSaisonId =
        Number(selectedSaison.id);
    }
  }

  private selectionnerSaisonParDefaut(): void {
    if (this.selectedSaisonId !== null) {
      return;
    }

    /*
     * On privilégie la saison marquée active.
     */
    const saisonActive =
      this.saisons.find(
        saison => saison.active === true
      );

    if (saisonActive) {
      this.selectedSaisonId =
        Number(saisonActive.id);

      return;
    }

    /*
     * Sinon, on prend la saison ayant la date
     * de début la plus récente.
     */
    const saisonsAvecDate = this.saisons
      .filter(saison => saison.date_debut)
      .sort((a, b) => {
        const dateA =
          new Date(a.date_debut as string).getTime();

        const dateB =
          new Date(b.date_debut as string).getTime();

        return dateB - dateA;
      });

    if (saisonsAvecDate.length > 0) {
      this.selectedSaisonId =
        Number(saisonsAvecDate[0].id);

      return;
    }

    /*
     * Dernier repli : l'identifiant le plus élevé.
     */
    const derniereSaison = [...this.saisons]
      .sort(
        (a, b) =>
          Number(b.id) - Number(a.id)
      )[0];

    if (derniereSaison) {
      this.selectedSaisonId =
        Number(derniereSaison.id);
    }
  }
}