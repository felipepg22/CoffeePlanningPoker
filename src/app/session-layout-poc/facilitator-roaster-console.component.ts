import { Component } from '@angular/core';

import { EstimateCard, SessionLayoutPocState } from './session-layout-poc.data';

@Component({
  selector: 'app-facilitator-roaster-console',
  templateUrl: './facilitator-roaster-console.component.html',
  styleUrl: './session-layout-poc.component.css',
})
export class FacilitatorRoasterConsoleComponent {
  readonly state = new SessionLayoutPocState();

  selectEstimate(card: EstimateCard): void {
    this.state.selectEstimate(card);
  }
}
