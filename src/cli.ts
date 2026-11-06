#!/usr/bin/env node

import * as path from 'node:path';
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import { installSkill, portSkill, auditSkill } from './index.js';
import { detectActiveAgent } from './detectors/environment.js';
import { AgentTarget } from './types.js';

const VERSION = '1.0.0';

const HELP_TEXT = `
  ⚡ skill-port v${VERSION}
  Universal Cross-LLM Agent Skill Porter & Transpiler

  USAGE:
    npx skill-port <command> [options]

  COMMANDS:
    install <url|path>     Port & install a skill into your AI agent environment
    port <url|path>        Transpile a skill and output to a destination folder
    audit <url|path>       Audit a skill for vendor lock-ins and portability score
    detect                 Detect current AI agent runtime and environment
    targets                List all supported AI agent targets
    list                   List installed skills in current workspace
    help, --help, -h       Display this help message

  OPTIONS:
    --to <agent>           Target agent: antigravity, claude, openai, chatgpt, cursor, windsurf, copilot, universal
    --global               Install globally (e.g. ~/.gemini/config/skills)
    --dest <path>          Output directory for generated files
    --force, -y            Overwrite existing files without prompting
    --no-inline            Do not inline dependent skill bodies; preserve external references
    --dry-run              Print the transpiled files without writing to disk
    --verbose              Print detailed transformation logs

  ALIASES:
    skill-port, skillport, agent-port

  EXAMPLES:
    # Port & install a skill from a repository into current agent:
    npx skill-port install https://github.com/<owner>/<repo>/tree/main/skills/<skill-name>

    # Force install without prompt in automated agent sessions:
    npx skill-port install ./skills/code-reviewer --force

    # Port a skill for OpenAI / ChatGPT:
    npx skill-port port ./skills/code-reviewer --to openai --dest ./openai-export

    # Check a skill for proprietary lock-in:
    npx skill-port audit ./skills/code-reviewer
`;

const SUPPORTED_TARGETS: Record<AgentTarget, string> = {
  antigravity: 'Google Antigravity / Gemini CLI (.agents/skills, progressive disclosure)',
  gemini: 'Alias for Antigravity',
  claude: 'Claude Code (.claude/skills, CLAUDE.md)',
  openai: 'OpenAI ChatGPT Custom GPTs, Assistants, openai.yaml, function calling',
  chatgpt: 'Alias for OpenAI',
  cursor: 'Cursor IDE Rules (.cursor/rules/*.mdc, .cursorrules)',
  windsurf: 'Windsurf Cascade Rules (.windsurf/rules, .windsurfrules)',
  copilot: 'GitHub Copilot (.github/skills, copilot-instructions.md)',
  universal: 'Universal portable SKILL.md specification',
};

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help') || args[0] === 'help') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
    console.log(`skill-port v${VERSION}`);
    process.exit(0);
  }

  const command = args[0];

  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--global') {
      flags.global = true;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
    } else if (arg === '--verbose') {
      flags.verbose = true;
    } else if (arg === '--force' || arg === '-y') {
      flags.force = true;
    } else if (arg === '--no-inline') {
      flags.noInline = true;
    } else if (arg === '--to' && i + 1 < args.length) {
      flags.to = args[++i];
    } else if (arg === '--dest' && i + 1 < args.length) {
      flags.dest = args[++i];
    } else if (arg.startsWith('--')) {
      flags[arg.slice(2)] = true;
    } else {
      positional.push(arg);
    }
  }

  try {
    switch (command) {
      case 'detect': {
        const detected = detectActiveAgent();
        console.log(`\n🔍 Environment Detection:`);
        console.log(`   Active AI Agent:  \x1b[32m${detected}\x1b[0m`);
        console.log(`   Platform Details: ${SUPPORTED_TARGETS[detected] || 'Universal'}\n`);
        break;
      }

      case 'targets': {
        console.log(`\n🎯 Supported AI Agent Targets:`);
        for (const [target, desc] of Object.entries(SUPPORTED_TARGETS)) {
          console.log(`   • \x1b[36m${target.padEnd(14)}\x1b[0m: ${desc}`);
        }
        console.log();
        break;
      }

      case 'list': {
        console.log(`\n📋 Installed Skills in Workspace:\n`);
        let count = 0;

        const checkDir = (dir: string, label: string) => {
          if (fs.existsSync(dir)) {
            const items = fs.readdirSync(dir);
            for (const item of items) {
              const full = path.join(dir, item);
              if (fs.statSync(full).isDirectory() || item.endsWith('.mdc') || item.endsWith('.md')) {
                console.log(`   • \x1b[32m${item}\x1b[0m (${label}) -> ${full}`);
                count++;
              }
            }
          }
        };

        checkDir('.agents/skills', 'Antigravity Workspace');
        checkDir('.claude/skills', 'Claude Code');
        checkDir('.cursor/rules', 'Cursor Rules');
        checkDir('.windsurf/rules', 'Windsurf Rules');
        checkDir('.github/skills', 'GitHub Copilot');

        if (count === 0) {
          console.log('   (No skills found in standard agent directories)');
        }
        console.log();
        break;
      }

      case 'audit': {
        const source = positional[0];
        if (!source) {
          console.error('\x1b[31mError: Missing <url|path> parameter for audit.\x1b[0m');
          process.exit(1);
        }

        console.log(`\n🔎 Auditing portability for: ${source}...`);
        const report = await auditSkill(source);

        console.log(`\n📊 Portability Score: \x1b[1m${report.score}/100\x1b[0m`);
        console.log(`\n🎯 Target Compatibility:`);
        for (const [agent, ok] of Object.entries(report.targetCompatibility)) {
          const status = ok ? '\x1b[32m✓ Compatible\x1b[0m' : '\x1b[31m✗ Adaptation Needed\x1b[0m';
          console.log(`   • ${agent.padEnd(12)}: ${status}`);
        }

        if (report.vendorLockIns.length > 0) {
          console.log(`\n⚠️  Vendor Lock-In Warnings:`);
          for (const item of report.vendorLockIns) {
            console.log(`   • [\x1b[33m${item.type}\x1b[0m] ${item.description}`);
            console.log(`     Suggestion: ${item.suggestion}`);
          }
        } else {
          console.log(`\n\x1b[32m✓ Skill is fully portable across all supported AI agents!\x1b[0m`);
        }
        console.log();
        break;
      }

      case 'port': {
        const source = positional[0];
        if (!source) {
          console.error('\x1b[31mError: Missing <url|path> parameter to port.\x1b[0m');
          process.exit(1);
        }

        const target = (flags.to as AgentTarget) || detectActiveAgent();
        console.log(`\n⚙️  Transpiling skill for target: \x1b[36m${target}\x1b[0m...`);

        const transpiled = await portSkill(source, {
          to: target,
          outDir: flags.dest as string,
          global: flags.global as boolean,
          force: flags.force as boolean,
          noInline: flags.noInline as boolean,
          verbose: flags.verbose as boolean,
        });

        console.log(`\n✨ Successfully transpiled: \x1b[32m${transpiled.skillName}\x1b[0m`);
        console.log(`\nTransformations Applied:`);
        for (const t of transpiled.transformations) {
          console.log(`   ✓ ${t}`);
        }

        if (flags.dryRun) {
          console.log(`\n[Dry Run] Generated Files:`);
          for (const f of transpiled.files) {
            console.log(`\n--- File: ${f.relativePath} (${f.description}) ---`);
            console.log(f.content);
          }
        } else if (flags.dest) {
          const outDir = path.resolve(flags.dest as string);
          for (const f of transpiled.files) {
            const targetPath = path.join(outDir, f.relativePath);
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, f.content, 'utf-8');
            console.log(`   💾 Wrote: ${targetPath}`);
          }
        }
        console.log();
        break;
      }

      case 'install': {
        const source = positional[0];
        if (!source) {
          console.error('\x1b[31mError: Missing <url|path> parameter to install.\x1b[0m');
          process.exit(1);
        }

        const target = (flags.to as AgentTarget) || detectActiveAgent();
        console.log(`\n📦 Installing & Porting skill from: ${source}`);
        console.log(`🎯 Target Agent Runtime: \x1b[36m${target}\x1b[0m (${SUPPORTED_TARGETS[target] || 'Universal'})\n`);

        const result = await installSkill(source, {
          to: target,
          global: flags.global as boolean,
          outDir: flags.dest as string,
          force: flags.force as boolean,
          noInline: flags.noInline as boolean,
          verbose: flags.verbose as boolean,
        });

        console.log(`✨ Skill \x1b[32m${result.transpiled.skillName}\x1b[0m successfully ported & installed!\n`);
        console.log(`Files Created:`);
        for (const p of result.writtenPaths) {
          console.log(`   • \x1b[34m${p}\x1b[0m`);
        }

        console.log(`\nTransformations Applied:`);
        for (const t of result.transpiled.transformations) {
          console.log(`   ✓ ${t}`);
        }

        console.log(`\n🎉 Ready to use! Trigger your skill inside ${target}.\n`);
        break;
      }

      default:
        console.error(`\x1b[31mUnknown command: "${command}"\x1b[0m\n`);
        console.log(HELP_TEXT);
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n\x1b[31mError:\x1b[0m ${err.message}\n`);
    if (flags.verbose && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
