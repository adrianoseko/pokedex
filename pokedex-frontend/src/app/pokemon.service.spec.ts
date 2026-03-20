import { TestBed } from '@angular/core/testing';
import { PokemonService } from './pokemon.service';

describe('PokemonService', () => {
  let service!: PokemonService;

  beforeEach((): void => {
    // Register the provider explicitly so tests do not depend on the service's
    // providedIn configuration. This makes the test setup more explicit and
    // easier to reason about.
    TestBed.configureTestingModule({ providers: [PokemonService] });

    service = TestBed.inject(PokemonService);
  });

  it('should be created', (): void => {
    expect(service).toBeTruthy();
  });
});
