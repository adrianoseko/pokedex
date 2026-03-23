import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PokedexComponent } from './pokedex.component';

// Note: Cross-origin restriction and auth/authorization for write endpoints
// are implemented at the application/network layer. This spec focuses on
// component instantiation. Environment-driven origin lists and secret
// rotation are handled by configuration and secure storage solutions
// outside of unit tests.

describe('PokedexComponent', () => {
  let fixture: ComponentFixture<PokedexComponent>;
  let component: PokedexComponent;

  // Configure the testing module in a single place to follow DRY
  async function configureTestingModule(): Promise<void> {
    await TestBed.configureTestingModule({
      declarations: [PokedexComponent],
    }).compileComponents();
  }

  // Create the component instance and trigger initial change detection
  function createComponentInstance(): void {
    fixture = TestBed.createComponent(PokedexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(waitForAsync(async () => {
    await configureTestingModule();
    createComponentInstance();
  }));

  afterEach(() => {
    // Ensure cleanup between tests to avoid cross-test leakage
    if (fixture) {
      fixture.destroy();
    }
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
