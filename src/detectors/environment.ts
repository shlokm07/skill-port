import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AgentTarget } from '../types.js';

/**
 * Detects the AI agent environment active in the current workspace or machine
 */
export function detectActiveAgent(startDir: string = process.cwd()): AgentTarget {
  // 1. Check environment variables
  if (process.env.ANTIGRAVITY_APP_DATA || process.env.GEMINI_CLI || process.env.AGY_PROJECT) {
    return 'antigravity';
  }
  if (process.env.CLAUDE_CODE || process.env.CLAUDE_PROJECT_ROOT) {
    return 'claude';
  }
  if (process.env.CURSOR_PROJECT_DIR || process.env.CURSOR_VERSION) {
    return 'cursor';
  }

  // 2. Check workspace markers walking up
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  while (current && current !== root) {
    // Antigravity / Gemini markers
    if (fs.existsSync(path.join(current, '.agents')) || fs.existsSync(path.join(current, 'GEMINI.md'))) {
      return 'antigravity';
    }

    // Claude Code markers
    if (fs.existsSync(path.join(current, '.claude')) || fs.existsSync(path.join(current, 'CLAUDE.md'))) {
      return 'claude';
    }

    // Cursor markers
    if (fs.existsSync(path.join(current, '.cursor')) || fs.existsSync(path.join(current, '.cursorrules'))) {
      return 'cursor';
    }

    // Windsurf markers
    if (fs.existsSync(path.join(current, '.windsurf')) || fs.existsSync(path.join(current, '.windsurfrules'))) {
      return 'windsurf';
    }

    current = path.dirname(current);
  }

  // 3. Check home directory defaults
  const home = os.homedir();
  if (fs.existsSync(path.join(home, '.gemini'))) {
    return 'antigravity';
  }
  if (fs.existsSync(path.join(home, '.claude'))) {
    return 'claude';
  }

  // Default to universal
  return 'universal';
}

