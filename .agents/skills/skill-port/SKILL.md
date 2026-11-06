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
3. Parse the frontmatter and identify the source ecosystem.

### Step 2: Transpile Semantics to Host Environment
1. **Meta-Skill Calls (`Call the Skill tool with "..."`)**:
   - In Antigravity / Gemini: Replace with direct skill activation directives (`Activate the \`xyz\` skill in \`.agents/skills/xyz/SKILL.md\``) or inline instructions.
2. **Subagent Semantics**:
   - In Antigravity / Gemini: Map to `invoke_subagent`.
3. **Vendor XML Tags**:
   - Normalize `<antArtifact>` and `<antThinking>` tags to standard markdown and notes.
4. **Frontmatter**:
   - Ensure clean `name` and `description` in YAML frontmatter.

### Step 3: Install in the Host Ecosystem Path
- Antigravity Workspace: `.agents/skills/<skill-name>/SKILL.md`
- Antigravity Global: `~/.gemini/config/skills/<skill-name>/SKILL.md`
