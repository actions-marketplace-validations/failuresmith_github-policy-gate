import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const siteDir = join(root, 'site');
const outDir = join(root, 'site-dist');
const assetsDir = join(outDir, 'assets');

mkdirSync(assetsDir, { recursive: true });

cpSync(join(siteDir, 'index.html'), join(outDir, 'index.html'));
cpSync(join(siteDir, 'styles.css'), join(outDir, 'styles.css'));
cpSync(join(siteDir, 'favicon.svg'), join(outDir, 'favicon.svg'));
cpSync(
  join(root, 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.min.css'),
  join(assetsDir, 'bootstrap.min.css'),
);

if (!existsSync(join(assetsDir, 'main.js'))) {
  throw new Error('Missing built site entrypoint at site-dist/assets/main.js');
}
