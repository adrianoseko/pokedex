import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PokemonListComponent } from './pokemon-list/pokemon-list.component';
import { PokemonDetailComponent } from './pokemon-detai/pokemon-detai.component';
import { PokedexComponent } from './pokedex/pokedex.component';

/**
 * Centralized route path constants to avoid string duplication and
 * make future refactors (e.g. renaming paths) safer.
 */
export enum RoutePath {
  Root = '',
  PokemonList = 'pokemon-list',
  PokemonDetail = 'pokemon/:id'
}

/**
 * Application route definitions. Kept immutable to prevent accidental
 * runtime modification.
 */
const APP_ROUTES: Routes = [
  { path: RoutePath.Root, component: PokedexComponent },
  { path: RoutePath.PokemonList, component: PokemonListComponent },
  { path: RoutePath.PokemonDetail, component: PokemonDetailComponent }
];

Object.freeze(APP_ROUTES);

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
