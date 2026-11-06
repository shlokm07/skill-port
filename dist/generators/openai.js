import { transpileBody } from '../transformers/universal-transpiler.js';
import { serializeYamlSimple } from '../parser/frontmatter.js';

export function generateOpenAI(manifest, options) {
  const { body, appliedRules, notes } = transpileBody(manifest.body, manifest, 'openai', options);

  const displayName = manifest.name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const openaiConfig = {
    interface: {
      display_name: displayName,
      short_description: manifest.description || `Skill to perform ${manifest.name} tasks.`,
    },
    policy: {
      allow_implicit_invocation: manifest.rawFrontmatter['disable-model-invocation'] ? false : true,
    },
  };

  const yamlContent = serializeYamlSimple(openaiConfig);

  const customGptInstructions = `# Custom GPT Instructions: ${displayName}

## Description
${manifest.description}

## Role & Goal
You are an expert agent equipped with the specialized skill "${displayName}".
Whenever the user asks you to perform tasks matching this capability, adhere strictly to the following instructions.

---

## Skill Instructions

${body}
`;

  const functionToolSchema = {
    type: 'function',
    function: {
      name: manifest.name.replace(/[^a-zA-Z0-9_]/g, '_'),
      description: manifest.description,
      parameters: {
        type: 'object',
        properties: {
          task_input: {
            type: 'string',
            description: 'User prompt or parameters for this skill execution',
          },
        },
        required: ['task_input'],
      },
    },
  };

  const basePath = `openai/skills/${manifest.name}`;

  const files = [
    {
      relativePath: `${basePath}/instructions.md`,
      content: customGptInstructions,
      description: 'ChatGPT / Custom GPT system instructions prompt',
    },
    {
      relativePath: `${basePath}/agents/openai.yaml`,
      content: yamlContent,
      description: 'OpenAI agent manifest schema',
    },
    {
      relativePath: `${basePath}/tool_schema.json`,
      content: JSON.stringify(functionToolSchema, null, 2),
      description: 'OpenAI function calling tool definition',
    },
  ];

  return {
    target: 'openai',
    skillName: manifest.name,
    files,
    warnings: [],
    transformations: [
      ...appliedRules,
      ...notes,
      `Generated OpenAI Custom GPT instructions and openai.yaml at ${basePath}`,
    ],
  };
}

