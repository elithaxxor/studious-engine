const { execSync } = require('child_process');
const files = ['background.js','content.js','main.js','popup.js','ffmpeg-worker.js'];
for (const f of files) {
  try {
    execSync(`node --check ${f}`, { stdio: 'inherit' });
  } catch (e) {
    console.error('Syntax check failed for', f);
    process.exit(1);
  }
}
console.log('All syntax checks passed');

