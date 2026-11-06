import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testFiles = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js'));

for (const file of testFiles) {
  await import(`./${file}`);
}
