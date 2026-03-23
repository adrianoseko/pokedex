import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PokemonDetailComponent } from './pokemon-detai.component';

/**
 * Unit tests for PokemonDetailComponent
 * - uses waitForAsync for async compilation
 * - ensures proper cleanup of TestBed and fixture after each test
 */
describe('PokemonDetailComponent', () => {
  let component: PokemonDetailComponent;
  let fixture: ComponentFixture<PokemonDetailComponent>;

  beforeEach(
    waitForAsync(async () => {
      await TestBed.configureTestingModule({
        declarations: [PokemonDetailComponent]
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PokemonDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Ensure we destroy fixtures and reset the testing module to avoid test bleed
    if (fixture) {
      fixture.destroy();
    }
    TestBed.resetTestingModule();
  });

  it('should create the component', () => {
    expect(component).toBeDefined();
    expect(component).toBeTruthy();
  });
});
