import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ng = fileURLToPath(new URL(`../node_modules/.bin/ng${process.platform === 'win32' ? '.cmd' : ''}`, import.meta.url));
const host = '127.0.0.1';
let isShuttingDown = false;

const commands = [
  {
    locale: 'en-US',
    args: [
      'serve',
      '--configuration',
      'en-US',
      '--host',
      host,
      '--port',
      '4200',
      '--proxy-config',
      'scripts/locale-dev-proxy.conf.mjs',
    ],
  },
  {
    locale: 'pt-BR',
    args: ['serve', '--configuration', 'pt-BR', '--host', host, '--port', '4201'],
  },
  {
    locale: 'es-ES',
    args: ['serve', '--configuration', 'es-ES', '--host', host, '--port', '4202'],
  },
];

const children = commands.map(({ locale, args }) => {
  const child = spawn(ng, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    if (code && code !== 0) {
      console.error(`${locale} dev server exited with code ${code}.`);
    } else if (signal) {
      console.error(`${locale} dev server stopped by ${signal}.`);
    } else {
      console.error(`${locale} dev server stopped.`);
    }

    shutdown();
    process.exitCode = code && code !== 0 ? code : 1;
  });

  child.on('error', (error) => {
    if (isShuttingDown) {
      return;
    }

    console.error(`${locale} dev server failed to start: ${error.message}`);
    shutdown();
    process.exitCode = 1;
  });

  return child;
});

console.log('Serving localized app variants from http://localhost:4200');
console.log('Internal locale dev servers: pt-BR -> 4201, es-ES -> 4202');

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}
