import { Component, OnInit } from '@angular/core';
import { PokemonService } from '../pokemon.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pokemon-list',
  templateUrl: './pokemon-list.component.html',
  styleUrls: ['./pokemon-list.component.scss']
})
export class PokemonListComponent implements OnInit {
  pokemons: any[] = [];
  selectedPokemon: any;

  constructor(private pokemonService: PokemonService, private router: Router) { }

  ngOnInit(): void {
    this.pokemonService.getPokemons().subscribe(data => {
      console.log(data)
      this.pokemons = data;
    });
  }

  onRowSelect(event) {
    this.selectedPokemon = event.data
    console.log(this.selectedPokemon)

  }

  pokemonPage(url: string) {
    // Extrai o número do URL do Pokémon usando expressão regular
    const regex = /\/(\d+)\/$/;
    const match = url.match(regex);
    if (match && match[1]) {
      let id = parseInt(match[1]);
      this.router.navigate(['/pokemon', id]);

    }

  }


}

