const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const server = spawn(process.execPath, [path.join(root, 'server', 'ai-server.cjs')], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const expo = spawn(npmCommand, ['run', 'expo:start', '--', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  server.kill();
  expo.kill();
  process.exitCode = code;
}

server.on('error', (error) => {
  console.error('Não foi possível iniciar a API da NutriIA:', error.message);
  stop(1);
});
expo.on('error', (error) => {
  console.error('Não foi possível iniciar o Expo:', error.message);
  stop(1);
});
server.on('exit', (code) => {
  if (!stopping && code !== 0) console.error(`A API da NutriIA encerrou com cÃ³digo ${code}; o Expo continuarÃ¡.`);
});
expo.on('exit', (code) => stop(code || 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
