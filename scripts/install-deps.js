const { spawnSync } = require('child_process');

// Auto-detect pip executable based on OS (Windows uses 'pip', macOS/Linux uses 'pip3')
const pipCmd = process.platform === 'win32' ? 'pip' : 'pip3';

console.log(`[TCS] Installing Python requirements via ${pipCmd}...`);
const pipResult = spawnSync(pipCmd, ['install', '-r', 'backend/requirements.txt'], {
  stdio: 'inherit',
  shell: true
});

if (pipResult.error) {
  console.error(`[TCS] Failed to run ${pipCmd}:`, pipResult.error);
}

console.log('[TCS] Installing Frontend dependencies...');
const npmResult = spawnSync('npm', ['--prefix', 'frontend', 'install'], {
  stdio: 'inherit',
  shell: true
});

if (npmResult.error) {
  console.error('[TCS] Failed to run npm install in frontend:', npmResult.error);
}
