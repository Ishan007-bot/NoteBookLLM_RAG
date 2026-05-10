// Multi-key support for Gemini and Groq.
// Reads `<PROVIDER>_API_KEY`, `<PROVIDER>_API_KEY_2`, ..., `<PROVIDER>_API_KEY_5`
// from the environment on every call (so changes to .env.local take effect on
// the next request without restarting the dev server) and rotates to the next
// non-exhausted key when one returns quota / rate-limit errors.
//
// Rotation pointers are kept in memory per server instance.

function readKeys(prefix: string): string[] {
  const keys: string[] = [];
  const primary = process.env[prefix];
  if (primary) keys.push(primary);
  for (let i = 2; i <= 5; i++) {
    const k = process.env[`${prefix}_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

let groqIdx = 0;
let googleIdx = 0;

function getKeys(prefix: "GROQ_API_KEY" | "GOOGLE_API_KEY"): string[] {
  return readKeys(prefix);
}

export function getGroqKey(): string {
  const keys = getKeys("GROQ_API_KEY");
  if (keys.length === 0) {
    throw new Error("No GROQ_API_KEY configured");
  }
  // Clamp index in case keys were removed at runtime.
  if (groqIdx >= keys.length) groqIdx = 0;
  return keys[groqIdx];
}

export function rotateGroqKey(): string | null {
  const keys = getKeys("GROQ_API_KEY");
  if (groqIdx + 1 >= keys.length) {
    console.warn(`[api-keys] all ${keys.length} Groq keys exhausted`);
    return null;
  }
  groqIdx += 1;
  console.warn(`[api-keys] rotated Groq to key ${groqIdx + 1}/${keys.length}`);
  return keys[groqIdx];
}

export function getGoogleKey(): string {
  const keys = getKeys("GOOGLE_API_KEY");
  if (keys.length === 0) {
    throw new Error("No GOOGLE_API_KEY configured");
  }
  if (googleIdx >= keys.length) googleIdx = 0;
  return keys[googleIdx];
}

export function rotateGoogleKey(): string | null {
  const keys = getKeys("GOOGLE_API_KEY");
  if (googleIdx + 1 >= keys.length) {
    console.warn(`[api-keys] all ${keys.length} Google keys exhausted`);
    return null;
  }
  googleIdx += 1;
  console.warn(`[api-keys] rotated Google to key ${googleIdx + 1}/${keys.length}`);
  return keys[googleIdx];
}

export function googleKeyCount(): number {
  return getKeys("GOOGLE_API_KEY").length;
}

export function groqKeyCount(): number {
  return getKeys("GROQ_API_KEY").length;
}
