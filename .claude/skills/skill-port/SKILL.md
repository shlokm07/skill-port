---
name: skill-port
description: Universal cross-LLM agent skill porter. Use when the user wants to install, adapt, or convert an AI agent skill from another platform (e.g., Antigravity, OpenAI/ChatGPT, Cursor) to run in Claude Code.
---

# Skill Port - Claude Code Adapter

Use this skill when you need to port or install skills created for Google Antigravity, OpenAI/ChatGPT, Cursor, or other AI agents into Claude Code.

## Instructions
1. Ingest the source skill markdown or GitHub repository URL.
2. Adapt frontmatter to `.claude/skills/<skill-name>/SKILL.md`.
3. If the skill defines subagent workflows, map them to Claude's SubAgent tool.
4. Save the transpiled skill to `.claude/skills/<skill-name>/SKILL.md`.

