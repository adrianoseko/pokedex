import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../pokemon.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-pokemon-detai',
  templateUrl: './pokedex.component.html',
  styleUrls: ['./pokedex.component.scss']
})
export class PokedexComponent implements OnInit, OnDestroy {
  // Use a typed shape when the data structure is known. Using a generic Record for safety.
  pokedex: Record<string, unknown> | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pokemonService: PokemonService
  ) {}

  ngOnInit(): void {
    this.loadPokedex();
  }

  private loadPokedex(): void {
    this.pokemonService
      .getPokedex()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: unknown) => {
          this.pokedex = data as Record<string, unknown>;
          // preserve original behavior of logging the loaded pokedex
          console.info(this.pokedex);
        },
        error: (err: unknown) => {
          // Better error handling / logging without changing behavior
          console.error('Error loading pokedex:', err);
        }
      });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}
