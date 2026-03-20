import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { PokemonService } from '../pokemon.service';

interface Pokemon {
  id: number;
  name: string;
  height?: number;
  weight?: number;
  sprites?: { front_default?: string };
  base_experience?: number;
  types?: any[];
  [key: string]: any;
}

interface PokedexEntry {
  id: number;
  name: string;
  height: number;
  weight: number;
  image: string;
  url: string;
  base_experience: number;
  type: string;
}

@Component({
  selector: 'app-pokemon-detai',
  templateUrl: './pokemon-detai.component.html',
  styleUrls: ['./pokemon-detai.component.scss']
})
export class PokemonDetailComponent implements OnInit, OnDestroy {
  pokemon: Pokemon | null = null;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pokemonService: PokemonService
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;

    if (Number.isNaN(id)) {
      console.error('PokemonDetailComponent: invalid route id param', idParam);
      return;
    }

    const sub = this.pokemonService.getPokemon(id).subscribe({
      next: (data: Pokemon) => {
        this.pokemon = data;
      },
      error: (err: any) => {
        console.error('PokemonDetailComponent: failed to load pokemon', err);
      }
    });

    this.subscriptions.add(sub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Keep public API name as original (used by template). Validates state and delegates mapping.
   */
  addInPokeDex(): void {
    if (!this.pokemon) {
      console.warn('addInPokeDex called but pokemon data is not available yet.');
      return;
    }

    const entry = this.mapToPokedexEntry(this.pokemon);

    // take(1) to ensure the observable completes and we don't leak subscriptions
    this.pokemonService.postPokemon(entry).pipe(take(1)).subscribe({
      next: (data: any) => {
        console.log(data);
      },
      error: (err: any) => {
        console.error('PokemonDetailComponent: failed to add pokemon to pokedex', err);
      }
    });
  }

  private mapToPokedexEntry(p: Pokemon): PokedexEntry {
    const image = p.sprites && p.sprites.front_default ? p.sprites.front_default : '';
    const baseExp = typeof p.base_experience === 'number' ? p.base_experience : 0;

    let type = '';
    try {
      if (p.types && Array.isArray(p.types) && p.types.length > 0) {
        // try to extract a sensible type string if the structure is standard
        const first = p.types[0];
        if (first && first.type && typeof first.type.name === 'string') {
          type = first.type.name;
        } else if (typeof first === 'string') {
          type = first;
        }
      }
    } catch (e) {
      // swallow mapping errors and default to empty type
      console.warn('PokemonDetailComponent: failed to map pokemon type', e);
      type = '';
    }

    return {
      id: p.id,
      name: p.name,
      height: p.height || 0,
      weight: p.weight || 0,
      image,
      url: '',
      base_experience: baseExp,
      type
    };
  }
}
