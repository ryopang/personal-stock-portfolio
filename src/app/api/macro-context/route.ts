import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getMacroContext, setMacroContext, MACRO_CONTEXT_MAX_LENGTH } from '@/lib/macro-context';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_MACRO_CONTEXT } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({ macro: DEMO_MACRO_CONTEXT });
  }
  try {
    const macro = await getMacroContext();
    return NextResponse.json({ macro });
  } catch (err) {
    console.error('[GET /api/macro-context]', err);
    return NextResponse.json({ error: 'Failed to load macro context' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Read-only in demo mode' }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => null);
    if (typeof body?.text !== 'string') {
      return NextResponse.json({ error: 'text (string) is required' }, { status: 400 });
    }
    if (body.text.length > MACRO_CONTEXT_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Macro context must be under ${MACRO_CONTEXT_MAX_LENGTH} characters` },
        { status: 400 },
      );
    }
    const macro = await setMacroContext(body.text);
    return NextResponse.json({ macro });
  } catch (err) {
    console.error('[PUT /api/macro-context]', err);
    return NextResponse.json({ error: 'Failed to save macro context' }, { status: 500 });
  }
}
