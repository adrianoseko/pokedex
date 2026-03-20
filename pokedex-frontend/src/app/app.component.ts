import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  /**
   * Application title shown in the root component.
   * Marked readonly and explicitly typed to improve clarity and immutability.
   */
  public readonly title: string = 'pokedex-frontend';

  constructor() {}

  /**
   * Lifecycle hook reserved for future initialization logic.
   * Left intentionally empty to preserve original behavior.
   */
  ngOnInit(): void {}
}
