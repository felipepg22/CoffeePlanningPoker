import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commands = [
  ['pt-BR', ['run', 'start:pt-BR', '--', '--host', '127.0.0.1']],
  ['es-ES', ['run', 'start:es-ES', '--', '--host', '127.0.0.1']],
  ['en-US', ['run', 'start:en-US', '--', '--host', '127.0.0.1']],
];

const children = commands.map(([locale, args]) => {
  const child = spawn(npm, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (code && code !== 0) {
      console.error(`${locale} dev server exited with code ${code}.`);
      shutdown();
    }
    if (signal) {
      console.error(`${locale} dev server stopped by ${signal}.`);
    }
  });

  return child;
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}
