import { SkillManifest, TranspiledSkill, TranspiledFile, PortOptions } from '../types.js';
import { transpileBody } from '../transformers/universal-transpiler.js';
import { serializeFrontmatter } from '../parser/frontmatter.js';

export function generateCursor(manifest: SkillManifest, options: PortOptions): TranspiledSkill {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'cursor', options);

  const frontmatter: Record<string, any> = {
    description: manifest.description || `Rule and instructions for ${manifest.name}`,
    globs: manifest.rawFrontmatter.globs || '*',
    alwaysApply: manifest.rawFrontmatter.alwaysApply !== undefined ? manifest.rawFrontmatter.alwaysApply : false,
  };

  const cursorContent = serializeFrontmatter(frontmatter, `# ${manifest.name}\n\n${body}`);
  const relativePath = `.cursor/rules/${manifest.name}.mdc`;

  const files: TranspiledFile[] = [
    {
      relativePath,
      content: cursorContent,
      description: 'Cursor IDE rule specification (.mdc)',
    },
  ];

  return {
    target: 'cursor',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated Cursor IDE rule at ${relativePath}`,
    ],
  };
}

