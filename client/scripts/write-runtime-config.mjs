import { writeFileSync } from 'node:fs';

const roomHubUrl = process.env['ROOM_HUB_URL']?.trim() || 'http://localhost:5050/hubs/rooms';

const config = `window.coffeePlanningPokerConfig = window.coffeePlanningPokerConfig || {};
window.coffeePlanningPokerConfig.roomHubUrl = ${JSON.stringify(roomHubUrl)};
`;

writeFileSync(new URL('../public/app-config.js', import.meta.url), config);
