import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../pokemon.service';


@Component({
  selector: 'app-pokemon-detai',
  templateUrl: './pokedex.component.html',
  styleUrls: ['./pokedex.component.scss']
})
export class PokedexComponent implements OnInit {
  pokedex: any;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) { }

  ngOnInit(): void {

    this.pokemonService.getPokedex().subscribe(data => {
      this.pokedex = data;
      console.log(this.pokedex)
    });
  }
}
