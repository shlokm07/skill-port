---
name: skill-port
description: Universal cross-LLM agent skill porter. Use when the user wants to install, adapt, or convert an AI agent skill from another platform (e.g., Claude Code, Antigravity, OpenAI/ChatGPT, Cursor) to run in the current LLM environment.
version: 1.0.0
---

# Skill Port - Universal Cross-LLM Agent Skill Porter

This skill equips any AI agent with the capability to port, adapt, transpile, and install skills built for different LLMs into the current host environment.

## When to Use This Skill

Activate this skill when:
- The user provides a URL or path to a skill built for another agent (e.g., a Claude Code skill, a Cursor rule, or an Antigravity workflow).
- The user asks to "port", "convert", "translate", or "install" a skill for their AI agent.
- You encounter an instruction or skill containing vendor-specific meta-tools (like `Call the Skill tool with "xyz"`) or vendor-specific tags.

---

## Porting Procedure for AI Agents

When the user asks you to port or install an external skill:

### Step 1: Ingest the Source Skill
1. Retrieve the skill's `SKILL.md`, associated scripts (`scripts/`), reference docs (`references/`), and metadata (`agents/openai.yaml`).
2. If given a repository URL, fetch the raw markdown and associated files.
3. Parse the frontmatter and identify the source ecosystem:
   - **Claude Code**: Uses `disable-model-invocation`, `Call the Skill tool with "..."`, XML tags.
   - **Antigravity / Gemini**: Uses `.agents/skills/<name>/SKILL.md`, `~/.gemini/config/skills/`, progressive disclosure, `rules/`.
   - **OpenAI / ChatGPT**: Uses Custom GPT system prompts, `agents/openai.yaml`, function calling schemas.
   - **Cursor**: Uses `.cursor/rules/<name>.mdc` with `globs: *`.

### Step 2: Transpile Semantics to Host Environment

Apply the appropriate semantic translations based on your current LLM environment:

1. **Meta-Skill Calls (`Call the Skill tool with "..."`)**:
   - In Claude Code, skills can delegate dynamically via the `Skill` tool.
   - In other environments (Antigravity, ChatGPT, Cursor), inline the dependent instructions or direct the agent to activate the corresponding skill/rule file.

2. **Subagent Semantics**:
   - Antigravity: Map `dispatch a sub-agent` to `invoke_subagent`.
   - ChatGPT / OpenAI: Map to child prompt task or isolated reasoning context.
   - Claude: Map to `SubAgent`.

3. **Vendor XML Tags**:
   - Convert `<antArtifact>` tags into standard markdown blocks.
   - Convert `<antThinking>` or `<thinking>` tags into blockquotes (`> [!NOTE] Internal Reasoning`).

4. **Frontmatter Normalization**:
   - Ensure the frontmatter matches the host agent standard:
     - Antigravity: `name` and 3rd-person `description`.
     - Cursor: `description`, `globs: *`, `alwaysApply: false`.
     - OpenAI: Generate `agents/openai.yaml` and system prompt markdown.

### Step 3: Install in the Host Ecosystem Path

Save the transpiled skill to the standard discovery location for your platform:

* **Google Antigravity**:
  - Workspace: `.agents/skills/<skill-name>/SKILL.md`
  - Global: `~/.gemini/config/skills/<skill-name>/SKILL.md`

* **Claude Code**:
  - Workspace: `.claude/skills/<skill-name>/SKILL.md`

* **OpenAI / ChatGPT**:
  - Instructions markdown: `openai/skills/<skill-name>/instructions.md`
  - Manifest: `openai/skills/<skill-name>/agents/openai.yaml`

* **Cursor**:
  - `.cursor/rules/<skill-name>.mdc`

* **Windsurf**:
  - `.windsurf/rules/<skill-name>.md`

### Step 4: Verify and Report
Confirm the file paths created and inform the user how they can invoke the new skill.
