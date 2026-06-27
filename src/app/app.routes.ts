import { Routes } from '@angular/router';

import { RoomWorkflowComponent } from './rooms/components/room-workflow.component';
import { SessionLayoutPocComponent } from './session-layout-poc/session-layout-poc.component';

export const routes: Routes = [
  { path: '', component: RoomWorkflowComponent },
  { path: 'layout-poc', component: SessionLayoutPocComponent },
  { path: 'rooms/:roomCode', component: RoomWorkflowComponent },
  { path: ':locale/layout-poc', component: SessionLayoutPocComponent },
  { path: ':locale', component: RoomWorkflowComponent },
  { path: ':locale/rooms/:roomCode', component: RoomWorkflowComponent },
  { path: '**', redirectTo: '' },
];
