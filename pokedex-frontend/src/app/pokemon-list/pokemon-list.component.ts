import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PokemonService } from '../pokemon.service';

interface Pokemon {
  name?: string;
  url: string;
  [key: string]: any;
}

interface RowSelectEvent<T = any> {
  data: T;
}

@Component({
  selector: 'app-pokemon-list',
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.scss']
})
export class PokemonListComponent implements OnInit, OnDestroy {
  pokemons: Pokemon[] = [];
  selectedPokemon: Pokemon | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly pokemonService: PokemonService, private readonly router: Router) {}

  ngOnInit(): void {
    this.pokemonService.getPokemons()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Pokemon[]) => {
          console.log(data);
          this.pokemons = data;
        },
        error: (err: any) => {
          console.error('Error loading pokemons', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRowSelect(event: RowSelectEvent<Pokemon>): void {
    this.selectedPokemon = event?.data ?? null;
    console.log(this.selectedPokemon);
  }

  pokemonPage(url: string): void {
    const id = this.extractIdFromUrl(url);
    if (id !== null) {
      this.router.navigate(['/pokemon', id]);
    }
  }

  private extractIdFromUrl(url: string): number | null {
    if (!url) {
      return null;
    }

    const regex = /\/(\d+)\/$/;
    const match = url.match(regex);
    if (!match || !match[1]) {
      return null;
    }

    const id = parseInt(match[1], 10);
    return Number.isNaN(id) ? null : id;
  }
}
