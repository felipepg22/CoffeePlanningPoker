import { Routes } from '@angular/router';

import { RoomWorkflowComponent } from './rooms/components/room-workflow.component';

export const routes: Routes = [
  { path: '', component: RoomWorkflowComponent },
  { path: 'rooms/:roomCode', component: RoomWorkflowComponent },
  { path: '**', redirectTo: '' },
];
