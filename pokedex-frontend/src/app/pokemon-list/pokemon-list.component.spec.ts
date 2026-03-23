import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PokemonListComponent } from './pokemon-list.component';

describe('PokemonListComponent', () => {
  let fixture: ComponentFixture<PokemonListComponent>;
  let component: PokemonListComponent;

  const configureTestingModule = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      declarations: [PokemonListComponent],
    }).compileComponents();
  };

  const createComponent = (): void => {
    fixture = TestBed.createComponent(PokemonListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(waitForAsync(() => configureTestingModule()));

  beforeEach(() => {
    createComponent();
  });

  it('should create the PokemonListComponent', () => {
    expect(component).toBeTruthy();
  });
});
