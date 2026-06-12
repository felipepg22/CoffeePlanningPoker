import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { RoomGateway } from './app/rooms/services/room-gateway';
import { SignalRRoomGateway } from './app/rooms/services/signalr-room.gateway';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    { provide: RoomGateway, useExisting: SignalRRoomGateway },
  ],
}).catch((error: unknown) => console.error(error));
