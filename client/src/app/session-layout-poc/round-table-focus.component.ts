import { Component } from '@angular/core';

import { EstimateCard, SessionLayoutPocState } from './session-layout-poc.data';

@Component({
  selector: 'app-round-table-focus',
  templateUrl: './round-table-focus.component.html',
  styleUrl: './session-layout-poc.component.css',
})
export class RoundTableFocusComponent {
  readonly state = new SessionLayoutPocState();

  selectEstimate(card: EstimateCard): void {
    this.state.selectEstimate(card);
  }
}
