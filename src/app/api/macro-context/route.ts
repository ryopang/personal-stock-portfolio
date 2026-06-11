import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getMacroContext, setMacroContext } from '@/lib/macro-context';
import { macroContextSchema, firstIssue } from '@/lib/schemas';

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
    const parsed = macroContextSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    const macro = await setMacroContext(parsed.data.text);
    return NextResponse.json({ macro });
  } catch (err) {
    console.error('[PUT /api/macro-context]', err);
    return NextResponse.json({ error: 'Failed to save macro context' }, { status: 500 });
  }
}
