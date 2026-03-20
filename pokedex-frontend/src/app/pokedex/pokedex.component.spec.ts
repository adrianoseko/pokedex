import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PokedexComponent } from './pokedex.component';

describe('PokedexComponent', () => {
  // Keep explicit nullable types to make lifecycle clear in tests
  let fixture: ComponentFixture<PokedexComponent> | null = null;
  let component: PokedexComponent | null = null;

  // Use waitForAsync to explicitly indicate async setup and handle compile errors
  beforeEach(
    waitForAsync(async () => {
      try {
        await TestBed.configureTestingModule({
          declarations: [PokedexComponent],
        }).compileComponents();
      } catch (error) {
        // Surface setup errors to the test runner
        fail(error as Error);
      }
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(PokedexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Ensure proper cleanup to avoid leaking state between tests
    if (fixture) {
      fixture.destroy();
      fixture = null;
    }

    component = null;

    // Reset TestBed to ensure isolation for subsequent specs
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
