import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormulaireCreneauComponent } from './formulaire-creneau.component';

describe('FormulaireCreneauComponent', () => {
  let component: FormulaireCreneauComponent;
  let fixture: ComponentFixture<FormulaireCreneauComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FormulaireCreneauComponent]
    });
    fixture = TestBed.createComponent(FormulaireCreneauComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
