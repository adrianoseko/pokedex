/**
 * Unit tests for PokemonService
 * Purpose: Keep the test minimal while improving readability and test hygiene.
 * - Explicitly provide the service to the TestBed so DI is clear
 * - Type the test variable and reset the TestBed after each test to avoid cross-test leakage
 */

import { TestBed } from '@angular/core/testing';
import { PokemonService } from './pokemon.service';

describe('PokemonService', () => {
  let pokemonService: PokemonService | null = null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [PokemonService],
    }).compileComponents();

    pokemonService = TestBed.inject(PokemonService);
  });

  afterEach(() => {
    // Reset the TestBed to ensure no shared state between tests
    TestBed.resetTestingModule();
    pokemonService = null;
  });

  it('should be created', () => {
    expect(pokemonService).toBeTruthy();
  });
});
