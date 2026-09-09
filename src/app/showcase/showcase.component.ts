import { Component } from '@angular/core';

interface CategoryCard {
  name: string;
  years: string;
  duration: string;
  description: string;
}

interface HonourSeason {
  season: string;
  results: { label: string; club: string }[];
}

interface MediaChannel {
  name: string;
  detail: string;
  url: string;
  tag: string;
}

@Component({
  selector: 'app-showcase',
  templateUrl: './showcase.component.html',
  styleUrls: ['./showcase.component.css']
})
export class ShowcaseComponent {
  mobileMenuOpen = false;

  readonly categories: CategoryCard[] = [
    {
      name: 'U11',
      years: '2017 et plus jeunes',
      duration: '2 × 15 min',
      description: 'Découvrir le jeu collectif, prendre confiance en roller et commencer à jouer avec le ballon.'
    },
    {
      name: 'U15',
      years: '2013 — 2016',
      duration: '2 × 20 min',
      description: 'Une vraie étape de progression : technique, lecture du jeu, vitesse et premiers projets compétitifs.'
    },
    {
      name: 'U19',
      years: '2009 — 2012',
      duration: '2 × 20 min',
      description: 'Le jeu accélère. Les collectifs se structurent et se rapprochent du rythme des catégories adultes.'
    },
    {
      name: 'Adultes',
      years: 'À partir de la catégorie senior',
      duration: '2 × 25 min',
      description: 'Loisir, Nationale 1 ou Élite : plusieurs portes d’entrée pour jouer à son niveau et progresser.'
    }
  ];

  readonly honours: HonourSeason[] = [
    {
      season: '2025 — 2026',
      results: [
        { label: 'Élite adultes', club: 'Savigny-sur-Orge' },
        { label: 'Nationale 1', club: 'Pontault-Combault' },
        { label: 'U19', club: 'Savigny-sur-Orge' },
        { label: 'U14', club: 'US Ivry Roller' }
      ]
    },
    {
      season: '2024 — 2025',
      results: [
        { label: 'Élite adultes', club: 'Savigny-sur-Orge' },
        { label: 'Nationale 1', club: 'R2R Argenteuil' },
        { label: 'U19', club: 'Savigny-sur-Orge' },
        { label: 'U14', club: 'RER Argenteuil' }
      ]
    }
  ];

  readonly mediaChannels: MediaChannel[] = [
    {
      name: 'UMS Easy Riders',
      detail: 'Pontault-Combault · matchs et compétitions',
      url: 'https://www.youtube.com/@umseasy-riders7746',
      tag: 'YouTube'
    },
    {
      name: 'Gino Roller Soccer',
      detail: 'Matchs français et belges, caméra au plus près du jeu',
      url: 'https://www.youtube.com/@Gino_Roller_Soccer',
      tag: 'YouTube'
    },
    {
      name: 'Savigny Roller Soccer',
      detail: 'Pumas · championnat de France et vie du club',
      url: 'https://www.youtube.com/@Savigny_Roller_Soccer_Club_91',
      tag: 'YouTube'
    },
    {
      name: 'Diffusion RollerSoccer',
      detail: 'Des rencontres pour découvrir la discipline en conditions réelles',
      url: 'https://www.youtube.com/@DiffusionRollerSoccer',
      tag: 'YouTube'
    }
  ];

  toggleMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMenu(): void {
    this.mobileMenuOpen = false;
  }
}
