import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltreCalendrierComponent } from './filtre-calendrier.component';

describe('FiltreCalendrierComponent', () => {
  let component: FiltreCalendrierComponent;
  let fixture: ComponentFixture<FiltreCalendrierComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FiltreCalendrierComponent]
    });
    fixture = TestBed.createComponent(FiltreCalendrierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
