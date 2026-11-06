# Example: Porting Claude Code `grill-me` to ChatGPT Custom GPT

This directory contains the output produced when running:

```bash
npx skill-port port https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me --to openai --dest ./examples/claude-to-chatgpt
```

---

## Generated Files

1. **`instructions.md`**:
   The full system prompt ready to copy and paste directly into the **"Instructions"** box when creating or configuring a Custom GPT in OpenAI ChatGPT.

2. **`agents/openai.yaml`**:
   The structured agent interface specification and invocation policies.

3. **`tool_schema.json`**:
   The JSON Schema defining this skill as a function tool for the OpenAI Chat Completions / Assistants API.

---

## How to use in ChatGPT
1. Go to [chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor).
2. Click **Create a GPT** -> **Configure**.
3. Name: `Grill Me`.
4. Description: `Stress-test plans and ideas through a relentless interview process.`
5. Paste the contents of [`instructions.md`](./instructions.md) into the **Instructions** field.
6. Under **Capabilities**, enable Code Interpreter / Web Browsing as needed.
7. Save and publish!

