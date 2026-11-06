/**
 * Universal Agent Target Identifiers
 */
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

/**
 * Parsed representation of an AI Agent Skill
 */
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

/**
 * The output of a skill transpilation process
 */
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

/**
 * Options configuring the porting / transpilation process
 */
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

/**
 * Audit result evaluating skill portability
 */
export interface PortabilityAudit {
  score: number; // 0 - 100
  targetCompatibility: Record<AgentTarget, boolean>;
  vendorLockIns: Array<{
    type: 'tool-call' | 'platform-tag' | 'hardcoded-path' | 'syntax' | 'metadata';
    description: string;
    line?: number;
    suggestion: string;
  }>;
  recommendedTransformations: string[];
}
