import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shineRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(shineRoot, '..', '..');

// Target direct known locations instantly without recursive node_modules scanning
const candidatePaths = [
  path.join(shineRoot, 'node_modules', '@openvideo', 'video-renderer', 'dist', 'renderer.js'),
  path.join(shineRoot, 'server', 'node_modules', '@openvideo', 'video-renderer', 'dist', 'renderer.js'),
  path.join(shineRoot, 'services', 'render-worker', 'node_modules', '@openvideo', 'video-renderer', 'dist', 'renderer.js'),
  path.join(repoRoot, 'node_modules', '@openvideo', 'video-renderer', 'dist', 'renderer.js'),
];

// Also check .pnpm store locations if exists
const pnpmDirs = [
  path.join(shineRoot, 'node_modules', '.pnpm'),
  path.join(repoRoot, 'node_modules', '.pnpm'),
];

for (const pDir of pnpmDirs) {
  if (fs.existsSync(pDir)) {
    try {
      const list = fs.readdirSync(pDir);
      for (const item of list) {
        if (item.startsWith('@openvideo+video-renderer@')) {
          candidatePaths.push(path.join(pDir, item, 'node_modules', '@openvideo', 'video-renderer', 'dist', 'renderer.js'));
        }
      }
    } catch (_) {}
  }
}

const found = new Set(candidatePaths.filter(p => fs.existsSync(p)));

const engineDistReplacement = `import fs from "fs";
import { createRequire } from "module";

function resolveEngineDist(pkgRoot) {
  // 1. Search upwards from pkgRoot
  let curr = pkgRoot;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(curr, "node_modules", "@openvideo", "engine-pixi", "dist");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  // 2. Search upwards from process.cwd()
  curr = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(curr, "node_modules", "@openvideo", "engine-pixi", "dist");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }

  // 3. Monorepo packages fallback
  const monorepo = path.resolve(process.cwd(), "..", "..", "packages", "engine-pixi", "dist");
  if (fs.existsSync(monorepo)) return monorepo;

  // 4. Safe fallback with directory creation to prevent sirv ENOENT scandir crash
  const nested = path.join(pkgRoot, "node_modules", "@openvideo", "engine-pixi", "dist");
  if (!fs.existsSync(nested)) {
    try {
      fs.mkdirSync(nested, { recursive: true });
    } catch (_) {}
  }
  return nested;
}

/** Absolute path to the local @openvideo/engine-pixi dist */
const ENGINE_DIST = resolveEngineDist(PKG_ROOT);`;

for (const target of found) {
  let content = fs.readFileSync(target, 'utf8');
  let changed = false;

  if (content.includes('function resolveEngineDist') || content.includes('const ENGINE_DIST = path.join(PKG_ROOT, "node_modules", "@openvideo", "engine-pixi", "dist");')) {
    content = content.replace(
      /import fs from "fs";[\s\S]*?const ENGINE_DIST = resolveEngineDist\(PKG_ROOT\);/,
      engineDistReplacement
    );
    if (!content.includes('resolveEngineDist')) {
      content = content.replace(
        '/** Absolute path to the local @openvideo/engine-pixi dist */\nconst ENGINE_DIST = path.join(PKG_ROOT, "node_modules", "@openvideo", "engine-pixi", "dist");',
        engineDistReplacement
      );
    }
    changed = true;
  }

  if (!content.includes('--disable-web-security')) {
    content = content.replace(
      '"--no-sandbox",',
      '"--no-sandbox",\n                "--disable-web-security",\n                "--disable-features=IsolateOrigins,site-per-process",\n                "--allow-running-insecure-content",'
    );
    changed = true;
  }

  if (!content.includes('chrome-channel-patch')) {
    content = content.replace(
      'headless: true,',
      'headless: true, /* chrome-channel-patch */ channel: (typeof process !== "undefined" && process.env && process.env.PLAYWRIGHT_CHROME_CHANNEL) ? process.env.PLAYWRIGHT_CHROME_CHANNEL : (fs.existsSync("/usr/bin/google-chrome") || fs.existsSync("/usr/bin/google-chrome-stable") ? "chrome" : undefined),'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(target, content, 'utf8');
    console.log(`[Patch] Successfully patched: ${target}`);
  } else {
    console.log(`[Patch] Up-to-date: ${target}`);
  }
}
