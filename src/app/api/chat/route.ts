import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import type { HoldingWithMetrics, PortfolioTotals } from '@/lib/types';
import { resolveProvider, type ProviderKey } from '@/lib/ai-providers';
import { aiRatelimit, clientIp } from '@/lib/ratelimit';
import { getMacroContext, formatMacroSection } from '@/lib/macro-context';
import { CHAT_SYSTEM_PROMPT, buildPortfolioContext } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let messages: UIMessage[];
  let providerKey: ProviderKey = 'gemini';
  let holdings: HoldingWithMetrics[] = [];
  let totals: PortfolioTotals | null = null;
  let lang: 'en' | 'zh-TW' = 'en';

  try {
    ({ messages, provider: providerKey, holdings, totals, lang } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!messages?.length) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const { success } = await aiRatelimit.limit(clientIp(req));
  if (!success) {
    return NextResponse.json(
      { error: 'Too many AI requests — try again in a little while.' },
      { status: 429 },
    );
  }

  const provider = resolveProvider(providerKey);
  if (!provider.ok) {
    return NextResponse.json({ error: provider.error }, { status: 500 });
  }

  const macro = await getMacroContext().catch(() => null);

  const portfolioContext = holdings?.length && totals
    ? buildPortfolioContext(holdings, totals)
    : '';

  const langInstruction = lang === 'zh-TW'
    ? '\n\nIMPORTANT: You must respond entirely in Traditional Chinese (繁體中文). Do not use any other language under any circumstances.'
    : '\n\nIMPORTANT: Respond entirely in English. Do not use any other language.';

  const result = streamText({
    model: provider.model,
    system: CHAT_SYSTEM_PROMPT + formatMacroSection(macro) + portfolioContext + langInstruction,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 4096,
    onError: ({ error }) => console.error('[POST /api/chat]', error),
  });

  return result.toUIMessageStreamResponse();
}
