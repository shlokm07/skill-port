import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { extractFrontmatter, serializeFrontmatter } from '../dist/parser/frontmatter.js';
import { parseSkillContent } from '../dist/parser/skill-parser.js';
import { transpileBody, auditSkillPortability } from '../dist/transformers/universal-transpiler.js';
import { portSkill } from '../dist/index.js';

describe('Frontmatter Parser & Serializer', () => {
  test('correctly parses key-value pairs and multiline strings', () => {
    const raw = `---
name: sample-skill
description: >-
  This is a multiline description
  that should be joined properly.
disable-model-invocation: true
version: 1.2.0
---

# Instructions
Do something great.`;

    const { attributes, body } = extractFrontmatter(raw);
    assert.strictEqual(attributes.name, 'sample-skill');
    assert.strictEqual(attributes['disable-model-invocation'], true);
    assert.strictEqual(attributes.version, '1.2.0');
    assert.ok(attributes.description.includes('multiline description'));
    assert.strictEqual(body, '# Instructions\nDo something great.');
  });

  test('correctly serializes frontmatter', () => {
    const attrs = {
      name: 'test-skill',
      description: 'Simple description',
      always_on: true,
    };
    const body = 'Instruction text here';
    const output = serializeFrontmatter(attrs, body);

    assert.ok(output.startsWith('---\n'));
    assert.ok(output.includes('name: test-skill'));
    assert.ok(output.includes('always_on: true'));
    assert.ok(output.includes('Instruction text here'));
  });
});

describe('Transpiler Rules & Cross-Agent Transformations', () => {
  test('inlines Claude Skill tool delegation with provenance callout by default', () => {
    const claudeContent = `---
name: grill-me
description: A relentless interview
---

Call the Skill tool with "grilling".`;

    const manifest = parseSkillContent(claudeContent);
    const { body } = transpileBody(manifest.body, manifest, 'antigravity', { to: 'antigravity' });

    assert.ok(!body.includes('Call the Skill tool with "grilling"'));
    assert.ok(body.includes('Inlined Procedure: grilling'));
    assert.ok(body.includes('[!NOTE] Dependency: grilling'));
  });

  test('preserves external reference when noInline flag is set', () => {
    const claudeContent = `Call the Skill tool with "grilling".`;
    const manifest = {
      name: 'grill-me',
      description: 'Interview',
      sourceAgent: 'claude',
      rawFrontmatter: {},
      body: claudeContent,
    };

    const { body } = transpileBody(manifest.body, manifest, 'antigravity', { to: 'antigravity', noInline: true });
    assert.ok(body.includes('.agents/skills/grilling/SKILL.md'));
  });

  test('abstracts tool actions with platform hints', () => {
    const rawContent = `To verify the setup, run in bash: \`npm test\`.`;
    const manifest = {
      name: 'test-tool',
      description: 'test',
      sourceAgent: 'claude',
      rawFrontmatter: {},
      body: rawContent,
    };

    const antigravityRes = transpileBody(rawContent, manifest, 'antigravity', { to: 'antigravity' });
    assert.ok(antigravityRes.body.includes('run_command'));

    const claudeRes = transpileBody(rawContent, manifest, 'claude', { to: 'claude' });
    assert.ok(claudeRes.body.includes('bash'));
  });

  test('transpiles subagent dispatch phrases for OpenAI and Antigravity', () => {
    const rawContent = `When needed, dispatch a sub-agent with a fresh context window to find it.`;
    const manifest = {
      name: 'test-subagent',
      description: 'test',
      sourceAgent: 'unknown',
      rawFrontmatter: {},
      body: rawContent,
    };

    const antigravityRes = transpileBody(rawContent, manifest, 'antigravity', { to: 'antigravity' });
    assert.ok(antigravityRes.body.includes('invoke_subagent'));

    const openaiRes = transpileBody(rawContent, manifest, 'openai', { to: 'openai' });
    assert.ok(openaiRes.body.includes('child task or sub-session'));
  });

  test('normalizes XML artifact and thinking tags', () => {
    const rawContent = `Here is the plan:
<antArtifact identifier="my-plan" type="markdown" title="Sprint Plan">
# Sprint Plan
1. Task A
</antArtifact>

<thinking>
We need to consider edge cases.
</thinking>`;

    const manifest = {
      name: 'test-xml',
      description: 'test',
      sourceAgent: 'claude',
      rawFrontmatter: {},
      body: rawContent,
    };

    const res = transpileBody(rawContent, manifest, 'antigravity', { to: 'antigravity' });
    assert.ok(!res.body.includes('<antArtifact'));
    assert.ok(!res.body.includes('<thinking>'));
    assert.ok(res.body.includes('Sprint Plan'));
    assert.ok(res.body.includes('Internal Reasoning'));
  });
});

describe('Porting to Multi-Agent Formats', () => {
  test('ports a skill to OpenAI format generating markdown, yaml, and schema', async () => {
    const manifest = {
      name: 'code-reviewer',
      description: 'Reviews pull requests with rigorous standards.',
      sourceAgent: 'universal',
      rawFrontmatter: {},
      body: 'Analyze git diff for syntax errors and architectural smells.',
    };

    const transpiled = await portSkill(manifest, { to: 'openai' });
    assert.strictEqual(transpiled.target, 'openai');
    assert.strictEqual(transpiled.files.length, 3);

    const fileNames = transpiled.files.map((f) => f.relativePath);
    assert.ok(fileNames.some((n) => n.endsWith('instructions.md')));
    assert.ok(fileNames.some((n) => n.endsWith('openai.yaml')));
    assert.ok(fileNames.some((n) => n.endsWith('tool_schema.json')));
  });

  test('ports a skill to Cursor generating .mdc rule', async () => {
    const manifest = {
      name: 'typescript-enforcer',
      description: 'Enforces strict TypeScript patterns.',
      sourceAgent: 'universal',
      rawFrontmatter: {},
      body: 'Always use strict types and avoid any.',
    };

    const transpiled = await portSkill(manifest, { to: 'cursor' });
    assert.strictEqual(transpiled.target, 'cursor');
    assert.ok(transpiled.files[0].relativePath.endsWith('.cursor/rules/typescript-enforcer.mdc'));
    assert.ok(transpiled.files[0].content.includes('globs: *'));
  });

  test('audits skill portability accurately', () => {
    const proprietaryClaude = {
      name: 'lock-in-sample',
      description: 'Test',
      sourceAgent: 'claude',
      rawFrontmatter: { 'disable-model-invocation': true },
      body: 'Call the Skill tool with "other-skill". <antArtifact identifier="foo" type="text">Bar</antArtifact>',
    };

    const audit = auditSkillPortability(proprietaryClaude);
    assert.ok(audit.score < 70);
    assert.ok(audit.vendorLockIns.length >= 3);
  });
});
