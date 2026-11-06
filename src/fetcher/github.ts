import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseSkillContent, parseSkillDirectory } from '../parser/skill-parser.js';
import { SkillManifest } from '../types.js';

export interface GitHubLocation {
  owner: string;
  repo: string;
  branch: string;
  subpath: string;
}

/**
 * Parses GitHub URLs into structured components
 */
export function parseGitHubUrl(url: string): GitHubLocation | null {
  // Pattern 1: https://github.com/owner/repo/tree/branch/subpath...
  const treeMatch = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/);
  if (treeMatch) {
    return {
      owner: treeMatch[1],
      repo: treeMatch[2],
      branch: treeMatch[3],
      subpath: treeMatch[4].replace(/\/$/, ''),
    };
  }

  // Pattern 2: https://github.com/owner/repo/blob/branch/subpath...
  const blobMatch = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  if (blobMatch) {
    return {
      owner: blobMatch[1],
      repo: blobMatch[2],
      branch: blobMatch[3],
      subpath: blobMatch[4].replace(/\/SKILL\.md$/i, ''),
    };
  }

  // Pattern 3: https://raw.githubusercontent.com/owner/repo/branch/subpath/SKILL.md
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

/**
 * Performs an HTTPS GET request with automatic redirect following
 */
export function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Skill-Port-Agent' } }, (res) => {
      // Handle redirects
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

/**
 * Fetches a skill from a local path, direct URL, or GitHub repository
 */
export async function resolveSkill(source: string): Promise<SkillManifest> {
  // 1. Local directory or file
  if (fs.existsSync(source)) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
      return parseSkillDirectory(source);
    } else {
      const content = fs.readFileSync(source, 'utf-8');
      return parseSkillContent(content, source);
    }
  }

  // 2. GitHub URL
  const gh = parseGitHubUrl(source);
  if (gh) {
    const rawBase = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${gh.branch}/${gh.subpath}`;
    const skillUrl = `${rawBase}/SKILL.md`;

    try {
      const skillMd = await httpGet(skillUrl);
      const manifest = parseSkillContent(skillMd, skillUrl);

      // Attempt to load agents/openai.yaml if it exists
      try {
        const openaiYaml = await httpGet(`${rawBase}/agents/openai.yaml`);
        manifest.agentsConfig = { 'openai.yaml': openaiYaml };
      } catch {
        // Optional, ignore if not present
      }

      return manifest;
    } catch (err: any) {
      // Try fetching as direct file
      try {
        const directContent = await httpGet(source);
        return parseSkillContent(directContent, source);
      } catch {
        throw new Error(`Failed to resolve skill from ${source}: ${err.message}`);
      }
    }
  }

  // 3. Direct HTTP(S) URL
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const content = await httpGet(source);
    return parseSkillContent(content, source);
  }

  throw new Error(`Could not find or resolve skill source: "${source}"`);
}

