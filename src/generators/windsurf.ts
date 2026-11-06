import { SkillManifest, TranspiledSkill, TranspiledFile, PortOptions } from '../types.js';
import { transpileBody } from '../transformers/universal-transpiler.js';

export function generateWindsurf(manifest: SkillManifest, options: PortOptions): TranspiledSkill {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'windsurf', options);

  const windsurfRule = `# Windsurf Rule: ${manifest.name}
# Trigger / Description: ${manifest.description}

${body}
`;

  const files: TranspiledFile[] = [
    {
      relativePath: `.windsurf/rules/${manifest.name}.md`,
      content: windsurfRule,
      description: 'Windsurf Cascade rule definition',
    },
  ];

  return {
    target: 'windsurf',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated Windsurf rule at .windsurf/rules/${manifest.name}.md`,
    ],
  };
}

