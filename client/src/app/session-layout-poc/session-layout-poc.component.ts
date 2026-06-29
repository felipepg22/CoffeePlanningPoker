import { Component, signal } from '@angular/core';

import { CoffeeBreakCompactComponent } from './coffee-break-compact.component';
import { CountertopCommandCenterComponent } from './countertop-command-center.component';
import { FacilitatorRoasterConsoleComponent } from './facilitator-roaster-console.component';
import { RoundTableFocusComponent } from './round-table-focus.component';

type LayoutPocId = 'countertop' | 'round-table' | 'facilitator' | 'compact';

interface LayoutPocOption {
  id: LayoutPocId;
  label: string;
}

@Component({
  selector: 'app-session-layout-poc',
  imports: [
    CoffeeBreakCompactComponent,
    CountertopCommandCenterComponent,
    FacilitatorRoasterConsoleComponent,
    RoundTableFocusComponent,
  ],
  templateUrl: './session-layout-poc.component.html',
  styleUrl: './session-layout-poc.component.css',
})
export class SessionLayoutPocComponent {
  readonly layouts: LayoutPocOption[] = [
    { id: 'countertop', label: 'Countertop' },
    { id: 'round-table', label: 'Round table' },
    { id: 'facilitator', label: 'Facilitator' },
    { id: 'compact', label: 'Compact' },
  ];
  readonly activeLayout = signal<LayoutPocId>('countertop');

  showLayout(layoutId: LayoutPocId): void {
    this.activeLayout.set(layoutId);
  }
}
