import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PokemonListComponent } from './pokemon-list.component';

describe('PokemonListComponent', () => {
  // Use definite assignment assertion since the variables are initialized in beforeEach
  let component!: PokemonListComponent;
  let fixture!: ComponentFixture<PokemonListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PokemonListComponent],
    }).compileComponents();
  });

  // Encapsulate creation logic to keep setup DRY and readable
  function initializeComponent(): void {
    fixture = TestBed.createComponent(PokemonListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    initializeComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
