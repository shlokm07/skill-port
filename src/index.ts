import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AgentTarget, PortOptions, SkillManifest, TranspiledSkill, PortabilityAudit } from './types.js';
import { resolveSkill } from './fetcher/github.js';
import { auditSkillPortability } from './transformers/universal-transpiler.js';
import { generateAntigravity } from './generators/antigravity.js';
import { generateClaude } from './generators/claude.js';
import { generateOpenAI } from './generators/openai.js';
import { generateCursor } from './generators/cursor.js';
import { generateWindsurf } from './generators/windsurf.js';
import { generateCopilot } from './generators/copilot.js';
import { generateUniversal } from './generators/universal.js';
import { detectActiveAgent } from './detectors/environment.js';

export * from './types.js';
export * from './parser/frontmatter.js';
export * from './parser/skill-parser.js';
export * from './transformers/universal-transpiler.js';
export * from './detectors/environment.js';
export * from './fetcher/github.js';

/**
 * Transpiles a skill from its source into the target LLM agent format
 */
export async function portSkill(source: string | SkillManifest, options: PortOptions): Promise<TranspiledSkill> {
  const manifest = typeof source === 'string' ? await resolveSkill(source) : source;

  const target = options.to.toLowerCase() as AgentTarget;

  switch (target) {
    case 'antigravity':
    case 'gemini':
      return generateAntigravity(manifest, options);

    case 'claude':
      return generateClaude(manifest, options);

    case 'openai':
    case 'chatgpt':
      return generateOpenAI(manifest, options);

    case 'cursor':
      return generateCursor(manifest, options);

    case 'windsurf':
      return generateWindsurf(manifest, options);

    case 'copilot':
      return generateCopilot(manifest, options);

    case 'universal':
    default:
      return generateUniversal(manifest, options);
  }
}

/**
 * Ports and installs a skill directly onto the filesystem for the specified or detected AI agent
 */
export async function installSkill(
  source: string | SkillManifest,
  options: Partial<PortOptions> = {}
): Promise<{ transpiled: TranspiledSkill; writtenPaths: string[] }> {
  const target = options.to || detectActiveAgent();
  const fullOptions: PortOptions = {
    to: target,
    global: options.global ?? false,
    outDir: options.outDir,
    inlineDependencies: options.inlineDependencies ?? true,
    includeOriginalManifest: options.includeOriginalManifest ?? true,
    verbose: options.verbose ?? false,
  };

  const transpiled = await portSkill(source, fullOptions);
  const writtenPaths: string[] = [];

  const baseDir = fullOptions.outDir ? path.resolve(fullOptions.outDir) : process.cwd();

  for (const file of transpiled.files) {
    let destPath = file.relativePath;

    // Handle home directory expansion for global configs
    if (destPath.startsWith('~')) {
      destPath = path.join(os.homedir(), destPath.slice(1));
    } else {
      destPath = path.resolve(baseDir, destPath);
    }

    const parentDir = path.dirname(destPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(destPath, file.content, 'utf-8');
    writtenPaths.push(destPath);
  }

  return { transpiled, writtenPaths };
}

/**
 * Runs a portability audit against a skill
 */
export async function auditSkill(source: string | SkillManifest): Promise<PortabilityAudit> {
  const manifest = typeof source === 'string' ? await resolveSkill(source) : source;
  return auditSkillPortability(manifest);
}

