import { transpileBody } from '../transformers/universal-transpiler.js';
import { serializeFrontmatter } from '../parser/frontmatter.js';

export function generateClaude(manifest, options) {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'claude', options);

  const frontmatter = {
    name: manifest.name,
    description: manifest.description || `Skill to perform ${manifest.name} tasks.`,
  };

  if ('disable-model-invocation' in manifest.rawFrontmatter) {
    frontmatter['disable-model-invocation'] = manifest.rawFrontmatter['disable-model-invocation'];
  }

  const skillMdContent = serializeFrontmatter(frontmatter, body);
  const basePath = `.claude/skills/${manifest.name}`;

  const files = [
    {
      relativePath: `${basePath}/SKILL.md`,
      content: skillMdContent,
      description: 'Claude Code skill specification',
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
    target: 'claude',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated Claude Code skill specification at ${basePath}`,
    ],
  };
}

