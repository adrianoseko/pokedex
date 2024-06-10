import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PokemonListComponent } from './pokemon-list/pokemon-list.component';
import { PokemonDetailComponent } from './pokemon-detai/pokemon-detai.component';
import { PokedexComponent } from './pokedex/pokedex.component';

const routes: Routes = [
  { path: '', component: PokedexComponent },
  { path: 'pokemon-list', component: PokemonListComponent },
  { path: 'pokemon/:id', component: PokemonDetailComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
