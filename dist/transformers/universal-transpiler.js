export const TRANSFORMATION_RULES = [
  // 1. Resolve Claude Code "Call the Skill tool" delegations with inlining & provenance
  {
    name: 'resolve-skill-tool-delegations',
    description: 'Converts Claude Code Skill tool meta-calls into cross-agent directives or inlined sections',
    apply: (body, manifest, target, options) => {
      let applied = false;
      const notes = [];

      const singleMatch = /Call the Skill tool with ["']([a-zA-Z0-9_-]+)["']\.?/gi;
      const multiMatch = /Call the Skill tool twice, for ["']([a-zA-Z0-9_-]+)["'] and ["']([a-zA-Z0-9_-]+)["']\.?/gi;

      let transformed = body;

      if (multiMatch.test(transformed)) {
        applied = true;
        transformed = transformed.replace(multiMatch, (match, skill1, skill2) => {
          notes.push(`Transpiled multi-skill meta-call for "${skill1}" and "${skill2}"`);
          if (options && options.noInline) {
            if (target === 'antigravity' || target === 'gemini') {
              return `Activate both the \`${skill1}\` and \`${skill2}\` skills sequentially to perform this task.`;
            }
            if (target === 'openai' || target === 'chatgpt') {
              return `Execute the workflows defined for both **${skill1}** and **${skill2}** in sequence.`;
            }
            return `Execute procedures for both \`${skill1}\` and \`${skill2}\`.`;
          }

          return `> [!NOTE] Required Skills: ${skill1}, ${skill2}\n> This workflow requires procedures from \`${skill1}\` and \`${skill2}\`.\n\nExecute the **${skill1}** and **${skill2}** procedures in sequence.`;
        });
      }

      if (singleMatch.test(transformed)) {
        applied = true;
        transformed = transformed.replace(singleMatch, (match, skillName) => {
          notes.push(`Transpiled single skill meta-call for "${skillName}"`);
          if (options && options.noInline) {
            if (target === 'antigravity' || target === 'gemini') {
              return `Activate the \`${skillName}\` skill (found in \`.agents/skills/${skillName}/SKILL.md\`) to execute this procedure.`;
            }
            if (target === 'openai' || target === 'chatgpt') {
              return `Apply the **${skillName}** skill procedure directly to accomplish this task.`;
            }
            if (target === 'cursor' || target === 'windsurf') {
              return `Refer to and enforce the \`.cursor/rules/${skillName}.mdc\` rule for this task.`;
            }
            return `Execute the \`${skillName}\` procedure.`;
          }

          // Inlined provenance section (Round 2 Q1 Recommendation a)
          return `> [!NOTE] Dependency: ${skillName}\n> This procedure incorporates the \`${skillName}\` skill specification.\n\n### Inlined Procedure: ${skillName}\nFollow the ${skillName} procedure systematically to resolve this task.`;
        });
      }

      return {
        transformed,
        applied,
        note: notes.join('; '),
      };
    },
  },

  // 2. Transpile subagent dispatching instructions
  {
    name: 'transpile-subagent-dispatch',
    description: 'Adapts subagent invocation semantics for the target LLM environment',
    apply: (body, manifest, target) => {
      const subagentRegex = /dispatch a sub-agent with a fresh context window/gi;

      if (!subagentRegex.test(body)) {
        return { transformed: body, applied: false };
      }

      let replacement = '';
      if (target === 'antigravity' || target === 'gemini') {
        replacement = 'invoke the `invoke_subagent` tool with a fresh context window';
      } else if (target === 'openai' || target === 'chatgpt') {
        replacement = 'dispatch a separate child task or sub-session if supported, or isolate memory cleanly';
      } else if (target === 'claude') {
        replacement = 'dispatch a subagent using the SubAgent tool';
      } else {
        replacement = 'run an isolated sub-process or child agent session';
      }

      return {
        transformed: body.replace(subagentRegex, replacement),
        applied: true,
        note: `Mapped subagent dispatch phrase to ${target} equivalent`,
      };
    },
  },

  // 3. Tool Action Abstraction with Platform Hinting (Round 2 Q3 Recommendation a)
  {
    name: 'abstract-tool-actions',
    description: 'Standardizes tool references into neutral action descriptions with platform hints',
    apply: (body, manifest, target) => {
      let applied = false;
      let transformed = body;

      // Platform-neutral phrasing for shell commands
      const bashPattern = /run in bash:\s*`([^`]+)`/gi;
      if (bashPattern.test(transformed)) {
        applied = true;
        const hint = target === 'antigravity' || target === 'gemini'
          ? '(use `run_command` in Antigravity)'
          : target === 'claude'
          ? '(use `bash` in Claude)'
          : '(run in your terminal)';
        transformed = transformed.replace(bashPattern, `Execute shell command: \`$1\` ${hint}`);
      }

      return {
        transformed,
        applied,
        note: applied ? 'Abstracted tool references with platform hints' : undefined,
      };
    },
  },

  // 4. Remove or normalize platform-specific XML tags
  {
    name: 'normalize-platform-tags',
    description: 'Converts Claude or XML style tags into standard markdown artifacts',
    apply: (body) => {
      let applied = false;
      let transformed = body;

      if (/<antArtifact[^>]*>/i.test(transformed)) {
        applied = true;
        transformed = transformed.replace(/<antArtifact\s+identifier="([^"]+)"\s+type="([^"]+)"(?:\s+title="([^"]+)")?[^>]*>([\s\S]*?)<\/antArtifact>/gi, (match, id, type, title, content) => {
          const header = title ? `### Artifact: ${title} (${id})\n` : `### Artifact (${id})\n`;
          return `${header}\`\`\`${type}\n${content.trim()}\n\`\`\``;
        });
      }

      if (/<antThinking>([\s\S]*?)<\/antThinking>/i.test(transformed) || /<thinking>([\s\S]*?)<\/thinking>/i.test(transformed)) {
        applied = true;
        transformed = transformed.replace(/<(?:antThinking|thinking)>([\s\S]*?)<\/(?:antThinking|thinking)>/gi, (match, inner) => {
          return `> [!NOTE] Internal Reasoning\n> ${inner.trim().replace(/\n/g, '\n> ')}`;
        });
      }

      return {
        transformed,
        applied,
        note: applied ? 'Normalized vendor XML tags to standard Markdown' : undefined,
      };
    },
  },

  // 5. Shell and OS script compatibility
  {
    name: 'normalize-shell-execution',
    description: 'Ensures script invocations have cross-platform hints',
    apply: (body) => {
      let applied = false;
      let transformed = body;

      if (/`bash\s+([^`]+)\.sh`/i.test(transformed) && !/powershell/i.test(transformed)) {
        applied = true;
        transformed = transformed.replace(/`bash\s+([^`]+)\.sh`/gi, '`bash $1.sh` (or `powershell $1.ps1` on Windows)');
      }

      return {
        transformed,
        applied,
        note: applied ? 'Added cross-platform shell compatibility hints' : undefined,
      };
    },
  },
];

export function transpileBody(body, manifest, target, options = {}) {
  let currentBody = body;
  const appliedRules = [];
  const notes = [];

  for (const rule of TRANSFORMATION_RULES) {
    const result = rule.apply(currentBody, manifest, target, options);
    if (result.applied) {
      currentBody = result.transformed;
      appliedRules.push(rule.name);
      if (result.note) {
        notes.push(result.note);
      }
    }
  }

  return {
    body: currentBody,
    appliedRules,
    notes,
  };
}

export function auditSkillPortability(manifest) {
  const lockIns = [];
  let score = 100;

  if (/Call the Skill tool with/i.test(manifest.body)) {
    score -= 25;
    lockIns.push({
      type: 'tool-call',
      description: 'Uses proprietary Claude Code "Skill" tool meta-call pattern.',
      suggestion: 'Transpile meta-calls to universal procedure references or inline the dependency.',
    });
  }

  if (/<antArtifact|<antThinking|<thinking/i.test(manifest.body)) {
    score -= 15;
    lockIns.push({
      type: 'platform-tag',
      description: 'Contains vendor-specific XML tags (<antArtifact> / <thinking>).',
      suggestion: 'Convert to standard GitHub-flavored markdown blocks and alert callouts.',
    });
  }

  if (/invoke_subagent|read_file|edit_file|run_command/i.test(manifest.body) && manifest.sourceAgent === 'antigravity') {
    score -= 10;
    lockIns.push({
      type: 'tool-call',
      description: 'Explicitly references Antigravity native tool identifiers.',
      suggestion: 'Use abstracted tool descriptions (e.g. "read the file", "run the shell command").',
    });
  }

  if ('disable-model-invocation' in manifest.rawFrontmatter) {
    score -= 10;
    lockIns.push({
      type: 'metadata',
      description: 'Contains Claude-only frontmatter field "disable-model-invocation".',
      suggestion: 'Transpile to policy schema in openai.yaml or document as slash-command only.',
    });
  }

  const clampedScore = Math.max(0, Math.min(100, score));

  return {
    score: clampedScore,
    targetCompatibility: {
      claude: true,
      antigravity: clampedScore >= 50,
      gemini: clampedScore >= 50,
      openai: clampedScore >= 50,
      chatgpt: clampedScore >= 50,
      cursor: clampedScore >= 60,
      windsurf: clampedScore >= 60,
      copilot: clampedScore >= 60,
      universal: true,
    },
    vendorLockIns: lockIns,
    recommendedTransformations: lockIns.map((l) => l.suggestion),
  };
}
