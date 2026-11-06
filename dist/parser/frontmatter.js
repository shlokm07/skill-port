/**
 * Lightweight, zero-dependency YAML frontmatter parser and serializer.
 * Designed specifically for AI agent skills and markdown specifications.
 */

export function extractFrontmatter(content) {
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

export function serializeFrontmatter(attributes, body) {
  const yaml = serializeYamlSimple(attributes);
  if (!yaml.trim()) {
    return body.trim();
  }
  return `---\n${yaml}---\n\n${body.trim()}\n`;
}

export function parseYamlSimple(yamlText) {
  const lines = yamlText.split('\n');
  const result = {};

  let currentKey = null;
  let multilineType = null;
  let multilineBuffer = [];
  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed && !multilineType) continue;
    if (trimmed.startsWith('#') && !multilineType) continue;

    if (multilineType && currentKey) {
      if (rawLine.startsWith('  ') || rawLine.startsWith('\t') || trimmed === '') {
        multilineBuffer.push(rawLine.replace(/^(\s{2}|\t)/, ''));
        continue;
      } else {
        const joined = multilineType === 'folded'
          ? multilineBuffer.join(' ').replace(/\s+/g, ' ').trim()
          : multilineBuffer.join('\n').trim();
        result[currentKey] = joined;
        currentKey = null;
        multilineType = null;
        multilineBuffer = [];
      }
    }

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

function parseScalarValue(val) {
  if (val === '') return '';
  if (val.toLowerCase() === 'true') return true;
  if (val.toLowerCase() === 'false') return false;
  if (val.toLowerCase() === 'null') return null;

  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }

  if (/^-?\d+(\.\d+)?$/.test(val)) {
    return Number(val);
  }

  return val;
}

export function serializeYamlSimple(obj) {
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

