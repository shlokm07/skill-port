export type AgentTarget =
  | 'claude'
  | 'antigravity'
  | 'gemini'
  | 'openai'
  | 'chatgpt'
  | 'cursor'
  | 'windsurf'
  | 'copilot'
  | 'universal';

export interface SkillManifest {
  name: string;
  description: string;
  version?: string;
  author?: string;
  sourceAgent: AgentTarget | 'unknown';
  rawFrontmatter: Record<string, any>;
  body: string;
  scripts?: Array<{ name: string; content: string }>;
  references?: Array<{ name: string; content: string }>;
  agentsConfig?: Record<string, any>;
  sourcePath?: string;
}

export interface TranspiledFile {
  relativePath: string;
  content: string;
  description: string;
  executable?: boolean;
}

export interface TranspiledSkill {
  target: AgentTarget;
  skillName: string;
  files: TranspiledFile[];
  warnings: string[];
  transformations: string[];
}

export interface PortOptions {
  from?: AgentTarget;
  to: AgentTarget;
  outDir?: string;
  inlineDependencies?: boolean;
  noInline?: boolean;
  includeOriginalManifest?: boolean;
  global?: boolean;
  force?: boolean;
  verbose?: boolean;
}

export interface PortabilityAudit {
  score: number;
  targetCompatibility: Record<AgentTarget, boolean>;
  vendorLockIns: Array<{
    type: 'tool-call' | 'platform-tag' | 'hardcoded-path' | 'syntax' | 'metadata';
    description: string;
    line?: number;
    suggestion: string;
  }>;
  recommendedTransformations: string[];
}
