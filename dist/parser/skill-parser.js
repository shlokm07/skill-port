import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractFrontmatter } from './frontmatter.js';

export function detectSourceAgent(attributes, body, filePath) {
  const normPath = (filePath || '').replace(/\\/g, '/');

  if (normPath.includes('.claude/skills') || normPath.includes('/claude-')) {
    return 'claude';
  }
  if (normPath.includes('.agents/skills') || normPath.includes('.gemini/config/skills')) {
    return 'antigravity';
  }
  if (normPath.includes('.cursor/rules') || normPath.endsWith('.mdc') || normPath.includes('.cursorrules')) {
    return 'cursor';
  }
  if (normPath.includes('.windsurfrules')) {
    return 'windsurf';
  }
  if (normPath.includes('copilot-instructions')) {
    return 'copilot';
  }

  if ('disable-model-invocation' in attributes || ('tools' in attributes && Array.isArray(attributes.tools))) {
    return 'claude';
  }
  if ('globs' in attributes || 'alwaysApply' in attributes) {
    return 'cursor';
  }
  if ('trigger' in attributes || 'always_on' in attributes) {
    return 'antigravity';
  }

  if (/Call the Skill tool with/i.test(body) || /<antArtifact/i.test(body) || /<antThinking/i.test(body)) {
    return 'claude';
  }
  if (/invoke_subagent/i.test(body) || /read_file/i.test(body) || /run_command/i.test(body)) {
    return 'antigravity';
  }

  return 'unknown';
}

export function parseSkillContent(content, filePath) {
  const { attributes, body } = extractFrontmatter(content);
  const sourceAgent = detectSourceAgent(attributes, body, filePath);

  let name = attributes.name;
  if (!name && filePath) {
    const parentDir = path.basename(path.dirname(filePath));
    const baseName = path.basename(filePath, path.extname(filePath));
    name = (baseName === 'SKILL' || baseName === 'skill') ? parentDir : baseName;
  }
  if (!name) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    name = h1Match ? h1Match[1].toLowerCase().replace(/[^a-z0-9_-]/g, '-') : 'untitled-skill';
  }

  const description = attributes.description || '';

  return {
    name,
    description,
    version: attributes.version,
    author: attributes.author,
    sourceAgent,
    rawFrontmatter: attributes,
    body,
    sourcePath: filePath,
  };
}

export function parseSkillDirectory(dirPath) {
  const possibleSkillFiles = [
    path.join(dirPath, 'SKILL.md'),
    path.join(dirPath, 'skill.md'),
    path.join(dirPath, 'README.md'),
  ];

  let mainSkillPath = null;
  for (const candidate of possibleSkillFiles) {
    if (fs.existsSync(candidate)) {
      mainSkillPath = candidate;
      break;
    }
  }

  if (!mainSkillPath) {
    throw new Error(`No SKILL.md found in directory: ${dirPath}`);
  }

  const content = fs.readFileSync(mainSkillPath, 'utf-8');
  const manifest = parseSkillContent(content, mainSkillPath);

  const scriptsDir = path.join(dirPath, 'scripts');
  if (fs.existsSync(scriptsDir) && fs.statSync(scriptsDir).isDirectory()) {
    manifest.scripts = fs.readdirSync(scriptsDir).map((fileName) => ({
      name: fileName,
      content: fs.readFileSync(path.join(scriptsDir, fileName), 'utf-8'),
    }));
  }

  const refsDir = path.join(dirPath, 'references');
  if (fs.existsSync(refsDir) && fs.statSync(refsDir).isDirectory()) {
    manifest.references = fs.readdirSync(refsDir).map((fileName) => ({
      name: fileName,
      content: fs.readFileSync(path.join(refsDir, fileName), 'utf-8'),
    }));
  }

  const agentsDir = path.join(dirPath, 'agents');
  if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
    manifest.agentsConfig = {};
    for (const file of fs.readdirSync(agentsDir)) {
      manifest.agentsConfig[file] = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
    }
  }

  return manifest;
}

