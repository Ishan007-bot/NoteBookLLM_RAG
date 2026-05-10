// Multi-key support for Gemini and Groq.
// Reads `<PROVIDER>_API_KEY`, `<PROVIDER>_API_KEY_2`, `<PROVIDER>_API_KEY_3` from
// the environment and rotates to the next non-exhausted key when one returns
// quota / rate-limit errors. State is in-memory per server instance — on a
// serverless platform the process restarts often, but for a single conversation
// the rotation persists.

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

const GROQ_KEYS = readKeys("GROQ_API_KEY");
const GOOGLE_KEYS = readKeys("GOOGLE_API_KEY");

let groqIdx = 0;
let googleIdx = 0;

export function getGroqKey(): string {
  if (GROQ_KEYS.length === 0) {
    throw new Error("No GROQ_API_KEY configured");
  }
  return GROQ_KEYS[groqIdx];
}

export function rotateGroqKey(): string | null {
  if (groqIdx + 1 >= GROQ_KEYS.length) {
    console.warn(`[api-keys] all ${GROQ_KEYS.length} Groq keys exhausted`);
    return null;
  }
  groqIdx += 1;
  console.warn(`[api-keys] rotated Groq to key ${groqIdx + 1}/${GROQ_KEYS.length}`);
  return GROQ_KEYS[groqIdx];
}

export function getGoogleKey(): string {
  if (GOOGLE_KEYS.length === 0) {
    throw new Error("No GOOGLE_API_KEY configured");
  }
  return GOOGLE_KEYS[googleIdx];
}

export function rotateGoogleKey(): string | null {
  if (googleIdx + 1 >= GOOGLE_KEYS.length) {
    console.warn(`[api-keys] all ${GOOGLE_KEYS.length} Google keys exhausted`);
    return null;
  }
  googleIdx += 1;
  console.warn(`[api-keys] rotated Google to key ${googleIdx + 1}/${GOOGLE_KEYS.length}`);
  return GOOGLE_KEYS[googleIdx];
}

export function googleKeyCount(): number {
  return GOOGLE_KEYS.length;
}
