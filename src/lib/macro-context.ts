import redis from './redis';

const KEY = 'portfolio:macro-context';
export const MACRO_CONTEXT_MAX_LENGTH = 4000;

// User-maintained market commentary injected into the AI prompts. Stored in
// Redis (not code) so it can be refreshed without a deploy, with updatedAt
// surfaced to the model so stale context is visible rather than silent.
export interface MacroContext {
  text: string;
  updatedAt: number; // Unix ms
}

export async function getMacroContext(): Promise<MacroContext | null> {
  const value = await redis.get<MacroContext>(KEY);
  return value?.text ? value : null;
}

export async function setMacroContext(text: string): Promise<MacroContext | null> {
  const trimmed = text.trim();
  if (!trimmed) {
    await redis.del(KEY);
    return null;
  }
  const value: MacroContext = { text: trimmed, updatedAt: Date.now() };
  await redis.set(KEY, value);
  return value;
}

export function formatMacroSection(macro: MacroContext | null): string {
  if (!macro) return '';
  const date = new Date(macro.updatedAt).toISOString().slice(0, 10);
  return `

## MACRO CONTEXT (user-maintained notes, last updated ${date})
${macro.text}
`;
}
