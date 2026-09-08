/**
 * Robust JSON parsing utility for LLM / AI outputs.
 * Repairs common formatting anomalies such as:
 * - Markdown fences (```json ... ```)
 * - Bad escaped characters in strings (e.g. \m, \p, \s, \d, unescaped backslashes in paths/notes)
 * - Raw unescaped control characters (newlines, tabs) inside string literals
 * - Trailing commas before closing braces or brackets
 * - Truncated JSON structures with unclosed quotes, brackets, or braces
 */

export function cleanAndParseJson<T = any>(rawInput: string): T {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Empty or non-string response received from AI');
  }

  let text = rawInput.trim();

  // Strip markdown code fences
  if (text.startsWith('```json')) {
    text = text.slice(7);
  } else if (text.startsWith('```')) {
    text = text.slice(3);
  }
  if (text.endsWith('```')) {
    text = text.slice(0, -3);
  }
  text = text.trim();

  // Find outermost JSON object or array boundaries
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = 0;
  let endIdx = text.length;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace !== -1) endIdx = lastBrace + 1;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    const lastBracket = text.lastIndexOf(']');
    if (lastBracket !== -1) endIdx = lastBracket + 1;
  }

  const candidate = text.substring(startIdx, endIdx);

  // Attempt 1: Direct standard JSON parse
  try {
    return JSON.parse(candidate) as T;
  } catch (initialError) {
    // Attempt 2: Sanitize invalid escapes and raw control characters inside string literals
    let sanitized = '';
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < candidate.length; i++) {
      const char = candidate[i];

      if (!inString) {
        if (char === '"') {
          inString = true;
        }
        sanitized += char;
      } else {
        if (isEscaped) {
          const validEscapes = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't'];
          if (validEscapes.includes(char)) {
            sanitized += char;
          } else if (char === 'u') {
            const hex = candidate.slice(i + 1, i + 5);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              sanitized += char;
            } else {
              // Not a valid 4-hex-digit unicode escape, escape the backslash
              sanitized += '\\' + char;
            }
          } else {
            // Bad escaped character (e.g. \m, \p, \s, \d, \-, etc.)
            // Turn previous \ into \\ so it becomes a literal escaped backslash
            sanitized += '\\' + char;
          }
          isEscaped = false;
        } else {
          if (char === '\\') {
            isEscaped = true;
            sanitized += char;
          } else if (char === '"') {
            inString = false;
            sanitized += char;
          } else if (char === '\n') {
            sanitized += '\\n';
          } else if (char === '\r') {
            sanitized += '\\r';
          } else if (char === '\t') {
            sanitized += '\\t';
          } else {
            sanitized += char;
          }
        }
      }
    }

    if (isEscaped) {
      sanitized += '\\';
    }

    // Strip trailing commas before } or ]
    sanitized = sanitized.replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(sanitized) as T;
    } catch (secondError) {
      // Attempt 3: Fix truncated JSON by closing unclosed quotes, brackets, and braces in LIFO order
      const stack: string[] = [];
      let inStr = false;
      let esc = false;

      for (let i = 0; i < sanitized.length; i++) {
        const c = sanitized[i];
        if (esc) {
          esc = false;
        } else if (c === '\\') {
          esc = true;
        } else if (c === '"') {
          inStr = !inStr;
        } else if (!inStr) {
          if (c === '{') stack.push('}');
          else if (c === '[') stack.push(']');
          else if (c === '}' || c === ']') {
            if (stack.length > 0 && stack[stack.length - 1] === c) {
              stack.pop();
            }
          }
        }
      }

      let repaired = sanitized;
      if (inStr) repaired += '"';
      while (stack.length > 0) {
        repaired += stack.pop();
      }

      repaired = repaired.replace(/,\s*([\]}])/g, '$1');

      try {
        return JSON.parse(repaired) as T;
      } catch (finalError) {
        console.error('Robust JSON parsing failed on AI response:', {
          initialError,
          secondError,
          finalError,
          rawPreview: rawInput.slice(0, 500) + '...',
        });
        throw new Error(
          `Failed to parse AI response: ${finalError instanceof Error ? finalError.message : String(finalError)}`
        );
      }
    }
  }
}
