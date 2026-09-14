const { execSync } = require('child_process');
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (e) {
  console.log('Failed');
}
