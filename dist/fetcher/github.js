import * as https from 'node:https';
import * as fs from 'node:fs';
import { parseSkillContent, parseSkillDirectory } from '../parser/skill-parser.js';

export function parseGitHubUrl(url) {
  const treeMatch = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/);
  if (treeMatch) {
    return {
      owner: treeMatch[1],
      repo: treeMatch[2],
      branch: treeMatch[3],
      subpath: treeMatch[4].replace(/\/$/, ''),
    };
  }

  const blobMatch = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  if (blobMatch) {
    return {
      owner: blobMatch[1],
      repo: blobMatch[2],
      branch: blobMatch[3],
      subpath: blobMatch[4].replace(/\/SKILL\.md$/i, ''),
    };
  }

  const rawMatch = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
  if (rawMatch) {
    return {
      owner: rawMatch[1],
      repo: rawMatch[2],
      branch: rawMatch[3],
      subpath: rawMatch[4].replace(/\/SKILL\.md$/i, ''),
    };
  }

  return null;
}

export function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Skill-Port-Agent' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export async function resolveSkill(source) {
  if (fs.existsSync(source)) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      return parseSkillDirectory(source);
    } else {
      const content = fs.readFileSync(source, 'utf-8');
      return parseSkillContent(content, source);
    }
  }

  const gh = parseGitHubUrl(source);
  if (gh) {
    const rawBase = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${gh.branch}/${gh.subpath}`;
    const skillUrl = `${rawBase}/SKILL.md`;

    try {
      const skillMd = await httpGet(skillUrl);
      const manifest = parseSkillContent(skillMd, skillUrl);

      try {
        const openaiYaml = await httpGet(`${rawBase}/agents/openai.yaml`);
        manifest.agentsConfig = { 'openai.yaml': openaiYaml };
      } catch {
        // Optional
      }

      return manifest;
    } catch (err) {
      try {
        const directContent = await httpGet(source);
        return parseSkillContent(directContent, source);
      } catch {
        throw new Error(`Failed to resolve skill from ${source}: ${err.message}`);
      }
    }
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const content = await httpGet(source);
    return parseSkillContent(content, source);
  }

  throw new Error(`Could not find or resolve skill source: "${source}"`);
}

