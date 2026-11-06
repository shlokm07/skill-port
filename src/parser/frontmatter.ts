/**
 * Lightweight, zero-dependency YAML frontmatter parser and serializer.
 * Designed specifically for AI agent skills and markdown specifications.
 */

export interface ParsedFrontmatter {
  attributes: Record<string, any>;
  body: string;
}

/**
 * Extracts YAML frontmatter and markdown body from file content.
 */
export function extractFrontmatter(content: string): ParsedFrontmatter {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return {
      attributes: {},
      body: content.trim(),
    };
  }

  const rawYaml = match[1];
  const body = match[2].trim();
  const attributes = parseYamlSimple(rawYaml);

  return { attributes, body };
}

/**
 * Serializes an object and markdown body into frontmatter format.
 */
export function serializeFrontmatter(attributes: Record<string, any>, body: string): string {
  const yaml = serializeYamlSimple(attributes);
  if (!yaml.trim()) {
    return body.trim();
  }
  return `---\n${yaml}---\n\n${body.trim()}\n`;
}

/**
 * Simple, robust YAML parser covering the features used in skill frontmatters:
 * - key: value
 * - multiline strings (>- or |)
 * - booleans, numbers, nulls
 * - array lists (- item)
 * - nested 1-level mappings
 */
export function parseYamlSimple(yamlText: string): Record<string, any> {
  const lines = yamlText.split('\n');
  const result: Record<string, any> = {};

  let currentKey: string | null = null;
  let multilineType: 'folded' | 'literal' | null = null;
  let multilineBuffer: string[] = [];
  let currentList: any[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and comments when not in a multiline block
    if (!trimmed && !multilineType) continue;
    if (trimmed.startsWith('#') && !multilineType) continue;

    // Check if we are accumulating a multiline block
    if (multilineType && currentKey) {
      if (rawLine.startsWith('  ') || rawLine.startsWith('\t') || trimmed === '') {
        multilineBuffer.push(rawLine.replace(/^(\s{2}|\t)/, ''));
        continue;
      } else {
        // End of multiline block
        const joined = multilineType === 'folded'
          ? multilineBuffer.join(' ').replace(/\s+/g, ' ').trim()
          : multilineBuffer.join('\n').trim();
        result[currentKey] = joined;
        currentKey = null;
        multilineType = null;
        multilineBuffer = [];
      }
    }

    // Check if we are accumulating a list
    if (currentList && currentKey) {
      if (trimmed.startsWith('- ')) {
        const itemVal = trimmed.slice(2).trim();
        currentList.push(parseScalarValue(itemVal));
        continue;
      } else {
        result[currentKey] = currentList;
        currentList = null;
        currentKey = null;
      }
    }

    // Standard key: value match
    const kvMatch = rawLine.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();

      if (val === '>-' || val === '>') {
        currentKey = key;
        multilineType = 'folded';
        multilineBuffer = [];
      } else if (val === '|-' || val === '|') {
        currentKey = key;
        multilineType = 'literal';
        multilineBuffer = [];
      } else if (val === '' && i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
        currentKey = key;
        currentList = [];
      } else {
        result[key] = parseScalarValue(val);
      }
    }
  }

  // Flush remaining buffers
  if (multilineType && currentKey) {
    const joined = multilineType === 'folded'
      ? multilineBuffer.join(' ').replace(/\s+/g, ' ').trim()
      : multilineBuffer.join('\n').trim();
    result[currentKey] = joined;
  } else if (currentList && currentKey) {
    result[currentKey] = currentList;
  }

  return result;
}

function parseScalarValue(val: string): any {
  if (val === '') return '';
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;
  if (val.toLowerCase() === 'null') return null;

  // Strip wrapping quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }

  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(val)) {
    return Number(val);
  }

  return val;
}

/**
 * Simple YAML serializer for skill frontmatters
 */
export function serializeYamlSimple(obj: Record<string, any>): string {
  let output = '';

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) {
      continue;
    }

    if (typeof val === 'boolean' || typeof val === 'number') {
      output += `${key}: ${val}\n`;
    } else if (typeof val === 'string') {
      if (val.includes('\n')) {
        output += `${key}: |\n`;
        const lines = val.split('\n');
        for (const line of lines) {
          output += `  ${line}\n`;
        }
      } else if (val.length > 80 || val.includes(': ') || val.includes('"') || val.includes("'")) {
        // Use folded block for longer text or strings with problematic punctuation
        output += `${key}: >-\n  ${val}\n`;
      } else {
        output += `${key}: ${val}\n`;
      }
    } else if (Array.isArray(val)) {
      output += `${key}:\n`;
      for (const item of val) {
        output += `  - ${typeof item === 'string' ? item : JSON.stringify(item)}\n`;
      }
    } else if (typeof val === 'object') {
      output += `${key}:\n`;
      for (const [subKey, subVal] of Object.entries(val)) {
        output += `  ${subKey}: ${JSON.stringify(subVal)}\n`;
      }
    }
  }

  return output;
}

