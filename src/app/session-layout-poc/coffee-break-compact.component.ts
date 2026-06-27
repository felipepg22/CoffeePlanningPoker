import { Component } from '@angular/core';

import { EstimateCard, SessionLayoutPocState } from './session-layout-poc.data';

@Component({
  selector: 'app-coffee-break-compact',
  templateUrl: './coffee-break-compact.component.html',
  styleUrl: './session-layout-poc.component.css',
})
export class CoffeeBreakCompactComponent {
  readonly state = new SessionLayoutPocState();

  selectEstimate(card: EstimateCard): void {
    this.state.selectEstimate(card);
  }
}
