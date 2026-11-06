import { SkillManifest, TranspiledSkill, TranspiledFile, PortOptions } from '../types.js';
import { transpileBody } from '../transformers/universal-transpiler.js';
import { serializeFrontmatter } from '../parser/frontmatter.js';

export function generateAntigravity(manifest: SkillManifest, options: PortOptions): TranspiledSkill {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'antigravity', options);

  const frontmatter: Record<string, any> = {
    name: manifest.name,
    description: manifest.description || `Skill to perform ${manifest.name} tasks.`,
  };

  const skillMdContent = serializeFrontmatter(frontmatter, body);

  const basePath = options.global
    ? `~/.gemini/config/skills/${manifest.name}`
    : `.agents/skills/${manifest.name}`;

  const files: TranspiledFile[] = [
    {
      relativePath: `${basePath}/SKILL.md`,
      content: skillMdContent,
      description: 'Antigravity workspace skill definition with progressive disclosure frontmatter',
    },
  ];

  // Include scripts if present
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

  // Include references if present
  if (manifest.references) {
    for (const r of manifest.references) {
      files.push({
        relativePath: `${basePath}/references/${r.name}`,
        content: r.content,
        description: `Reference documentation for ${manifest.name}`,
      });
    }
  }

  // Include openai.yaml agent manifest if available
  if (manifest.agentsConfig && manifest.agentsConfig['openai.yaml']) {
    files.push({
      relativePath: `${basePath}/agents/openai.yaml`,
      content: manifest.agentsConfig['openai.yaml'],
      description: 'OpenAI/Agent interoperability manifest',
    });
  }

  return {
    target: 'antigravity',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated Antigravity progressive disclosure format at ${basePath}`,
    ],
  };
}

