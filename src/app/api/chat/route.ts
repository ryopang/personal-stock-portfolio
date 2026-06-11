import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { resolveProvider } from '@/lib/ai-providers';
import { chatRequestSchema, firstIssue } from '@/lib/schemas';
import { aiRatelimit, clientIp } from '@/lib/ratelimit';
import { getMacroContext, formatMacroSection } from '@/lib/macro-context';
import { getPortfolioWithMetrics } from '@/lib/portfolio-server';
import { CHAT_SYSTEM_PROMPT, buildPortfolioContext } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const { provider: providerKey, lang } = parsed.data;
  // Deep per-part validation happens in convertToModelMessages below
  const messages = parsed.data.messages as unknown as UIMessage[];

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

  // Portfolio context is assembled server-side; if Redis/Yahoo are unreachable
  // the chat still works, just without portfolio awareness.
  const [macro, portfolio] = await Promise.all([
    getMacroContext().catch(() => null),
    getPortfolioWithMetrics().catch(() => null),
  ]);

  const portfolioContext = portfolio?.holdings.length
    ? buildPortfolioContext(portfolio.holdings, portfolio.totals)
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
