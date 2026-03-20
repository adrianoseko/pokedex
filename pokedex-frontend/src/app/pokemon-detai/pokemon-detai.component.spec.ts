import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PokemonDetailComponent } from './pokemon-detai.component';

describe('PokemonDetailComponent', () => {
  let fixture: ComponentFixture<PokemonDetailComponent> | null = null;
  let component: PokemonDetailComponent | null = null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PokemonDetailComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
      fixture = null;
    }
    component = null;
    // Ensure TestBed is reset between tests to avoid test leakage
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
