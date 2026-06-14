import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { convertToModelMessages, streamText, generateId, type UIMessage } from 'ai';
import { resolveProvider, type ProviderKey } from '@/lib/ai-providers';
import { aiRatelimit, clientIp } from '@/lib/ratelimit';
import { getMacroContext, formatMacroSection } from '@/lib/macro-context';
import { getPortfolioWithMetrics } from '@/lib/portfolio-server';
import { CHAT_SYSTEM_PROMPT, buildPortfolioContext } from '@/lib/prompts';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_CHAT_RESPONSES } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

// Stream a canned response in the UI message stream format that useChat expects.
// Format: SSE with data: JSON lines and x-vercel-ai-ui-message-stream: v1 header.
function demoChatResponse(response: string): Response {
  const textId = generateId();
  const encoder = new TextEncoder();

  const UI_STREAM_HEADERS = {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
    'x-vercel-ai-ui-message-stream': 'v1',
    'x-accel-buffering': 'no',
  };

  const stream = new ReadableStream({
    async start(controller) {
      function send(part: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(part)}\n\n`));
      }

      // Signal start of a new text part
      send({ type: 'text-start', id: textId });

      // Stream the response text in small word-boundary chunks
      const words = response.split(' ');
      for (let i = 0; i < words.length; i++) {
        const delta = i < words.length - 1 ? words[i] + ' ' : words[i];
        send({ type: 'text-delta', id: textId, delta });
        await new Promise((r) => setTimeout(r, 12));
      }

      // Signal end of text part
      send({ type: 'text-end', id: textId });

      // Required finish sentinel
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, { headers: UI_STREAM_HEADERS });
}

export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    const response = DEMO_CHAT_RESPONSES[Math.floor(Math.random() * DEMO_CHAT_RESPONSES.length)];
    return demoChatResponse(response);
  }

  let messages: UIMessage[];
  let providerKey: ProviderKey = 'gemini';
  let lang: 'en' | 'zh-TW' = 'en';

  try {
    ({ messages, provider: providerKey, lang } = await req.json());
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
