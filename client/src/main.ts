import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { RoomGateway } from './app/rooms/services/room-gateway';
import { SignalRRoomGateway } from './app/rooms/services/signalr-room.gateway';

registerLocaleData(localeEn, 'en-US');
registerLocaleData(localePt, 'pt-BR');
registerLocaleData(localeEs, 'es-ES');

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    { provide: RoomGateway, useExisting: SignalRRoomGateway },
  ],
}).catch((error: unknown) => console.error(error));
