#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distCli = path.join(__dirname, '..', 'dist', 'cli.js');
const srcCli = path.join(__dirname, '..', 'src', 'cli.js');

if (fs.existsSync(distCli)) {
  await import(pathToFileURL(distCli).href);
} else {
  await import(pathToFileURL(srcCli).href);
}
