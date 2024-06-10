import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PokemonService } from '../pokemon.service';


@Component({
  selector: 'app-pokemon-detai',
  templateUrl: './pokemon-detai.component.html',
  styleUrls: ['./pokemon-detai.component.scss']
})
export class PokemonDetailComponent implements OnInit {
  pokemon: any;

  constructor(
    private route: ActivatedRoute,
    private pokemonService: PokemonService
  ) { }

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id');
    this.pokemonService.getPokemon(id).subscribe(data => {
      this.pokemon = data;
    });
  }
  addInPokeDex() {
    let pokemon = {
      id: this.pokemon.id,
      name: this.pokemon.name,
      height: this.pokemon.height,
      weight: this.pokemon.weight,
      image: this.pokemon.sprites.front_default,
      url: '',
      base_experience: this.pokemon.base_experience,
      type: ''
    };

    this.pokemonService.postPokemon(pokemon).subscribe(data => {
      console.log(data);
    });

  }
}
