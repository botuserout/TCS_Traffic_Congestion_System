const { spawn } = require('child_process');

// Auto-detect Python executable based on OS (Windows uses 'python', macOS/Linux uses 'python3')
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

console.log(`[TCS] Launching Flask backend server using ${pythonCmd}...`);

const child = spawn(pythonCmd, ['backend/server.py'], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
