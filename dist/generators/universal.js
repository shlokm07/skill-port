import { transpileBody } from '../transformers/universal-transpiler.js';
import { serializeFrontmatter } from '../parser/frontmatter.js';

export function generateUniversal(manifest, options) {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'universal', options);

  const frontmatter = {
    name: manifest.name,
    description: manifest.description,
    version: manifest.version || '1.0.0',
    compatibility: ['claude', 'antigravity', 'gemini', 'openai', 'chatgpt', 'cursor', 'windsurf', 'copilot'],
  };

  const skillMdContent = serializeFrontmatter(frontmatter, body);
  const basePath = `skills/${manifest.name}`;

  const files = [
    {
      relativePath: `${basePath}/SKILL.md`,
      content: skillMdContent,
      description: 'Universal portable skill specification',
    },
  ];

  if (manifest.scripts) {
    for (const s of manifest.scripts) {
      files.push({
        relativePath: `${basePath}/scripts/${s.name}`,
        content: s.content,
        description: `Helper script for ${manifest.name}`,
        executable: true,
      });
    }
  }

  return {
    target: 'universal',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated universal portable skill specification at ${basePath}`,
    ],
  };
}

