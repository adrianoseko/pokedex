import { NgModule, Type } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { AppComponent } from './app.component';
import { PokemonListComponent } from './pokemon-list/pokemon-list.component';
import { PokemonDetailComponent } from './pokemon-detai/pokemon-detai.component';
import { PokedexComponent } from './pokedex/pokedex.component';

/**
 * Root application module.
 *
 * Declarations and imports are grouped into well-named constants to improve
 * readability, maintenance and to make future testing/extensions easier.
 */
const DECLARATIONS: Array<Type<any>> = [
  AppComponent,
  PokemonListComponent,
  PokemonDetailComponent,
  PokedexComponent
];

const FRAMEWORK_MODULES: Array<any> = [
  BrowserModule,
  AppRoutingModule,
  HttpClientModule
];

const UI_MODULES: Array<any> = [
  TableModule,
  ButtonModule,
  CardModule
];

const IMPORTS: Array<any> = [
  ...FRAMEWORK_MODULES,
  ...UI_MODULES
];

@NgModule({
  declarations: DECLARATIONS,
  imports: IMPORTS,
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
