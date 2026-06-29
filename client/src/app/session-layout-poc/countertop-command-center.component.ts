import { Component } from '@angular/core';

import { EstimateCard, SessionLayoutPocState } from './session-layout-poc.data';

@Component({
  selector: 'app-countertop-command-center',
  templateUrl: './countertop-command-center.component.html',
  styleUrl: './session-layout-poc.component.css',
})
export class CountertopCommandCenterComponent {
  readonly state = new SessionLayoutPocState();

  selectEstimate(card: EstimateCard): void {
    this.state.selectEstimate(card);
  }
}
