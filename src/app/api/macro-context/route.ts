import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getMacroContext, setMacroContext, MACRO_CONTEXT_MAX_LENGTH } from '@/lib/macro-context';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const macro = await getMacroContext();
    return NextResponse.json({ macro });
  } catch (err) {
    console.error('[GET /api/macro-context]', err);
    return NextResponse.json({ error: 'Failed to load macro context' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
