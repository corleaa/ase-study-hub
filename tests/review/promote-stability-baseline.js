const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CURRENT_DIR = path.join(ROOT, 'test-results', 'visual-audit', 'finance-lab-stability', 'current');
const BASELINE_DIR = path.join(ROOT, 'tests', 'baselines', 'finance-lab-stability');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(target);
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

if (!fs.existsSync(CURRENT_DIR)) {
  console.error(`Current audit directory not found: ${CURRENT_DIR}`);
  process.exit(1);
}

copyRecursive(CURRENT_DIR, BASELINE_DIR);
console.log(`Baseline updated from ${CURRENT_DIR} to ${BASELINE_DIR}`);
