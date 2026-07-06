import { writeFileSync } from 'node:fs';

const roomHubUrl = process.env['ROOM_HUB_URL']?.trim();
const renderServiceType = process.env['RENDER_SERVICE_TYPE']?.trim();
const isRenderStaticBuild = renderServiceType === 'static';

if (!roomHubUrl && isRenderStaticBuild) {
  fail('ROOM_HUB_URL must be set on the Render Static Site.');
}

if (roomHubUrl) {
  validateRoomHubUrl(roomHubUrl, isRenderStaticBuild);
}

const config = roomHubUrl
  ? `window.coffeePlanningPokerConfig = window.coffeePlanningPokerConfig || {};
window.coffeePlanningPokerConfig.roomHubUrl = ${JSON.stringify(roomHubUrl)};
`
  : 'window.coffeePlanningPokerConfig = window.coffeePlanningPokerConfig || {};\n';

writeFileSync(new URL('../public/app-config.js', import.meta.url), config);

function validateRoomHubUrl(value, requireHostedUrl) {
  let url;

  try {
    url = new URL(value);
  } catch {
    fail(`ROOM_HUB_URL must be an absolute URL. Received: ${JSON.stringify(value)}`);
  }

  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const normalizedPath = url.pathname.replace(/\/+$/, '');

  if (normalizedPath !== '/hubs/rooms') {
    fail(`ROOM_HUB_URL must end with /hubs/rooms. Received: ${value}`);
  }

  if (requireHostedUrl && isLocalhost) {
    fail('ROOM_HUB_URL must be set on the Render Static Site. It is still using localhost.');
  }

  if (!isLocalhost && url.protocol !== 'https:') {
    fail(`ROOM_HUB_URL must use https outside local development. Received: ${value}`);
  }
}

function fail(message) {
  console.error(message);
  console.error('Expected example: ROOM_HUB_URL=https://<api-service>.onrender.com/hubs/rooms');
  process.exit(1);
}
