import { transpileBody } from '../transformers/universal-transpiler.js';

export function generateCopilot(manifest, options) {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'copilot', options);

  const copilotDoc = `## Skill: ${manifest.name}
**Description**: ${manifest.description}

${body}
`;

  const files = [
    {
      relativePath: `.github/skills/${manifest.name}.md`,
      content: copilotDoc,
      description: 'GitHub Copilot skill guide',
    },
  ];

  return {
    target: 'copilot',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated GitHub Copilot skill reference at .github/skills/${manifest.name}.md`,
    ],
  };
}

