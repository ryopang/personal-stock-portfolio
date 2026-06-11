import { NextRequest, NextResponse } from 'next/server';
import { getHolding, upsertHolding, deleteHolding } from '@/lib/holdings-service';
import { holdingUpdateSchema, firstIssue } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await getHolding(id);
    if (!existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = holdingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    const { quantity, costBasis, purchaseDate, type, industry } = parsed.data;

    const updated = {
      ...existing,
      ...(quantity != null ? { quantity } : {}),
      ...(costBasis != null ? { costBasis } : {}),
      ...(purchaseDate ? { purchaseDate } : {}),
      ...(type ? { type } : {}),
      // Present-but-empty clears the industry; absent leaves it untouched
      ...('industry' in body ? { industry: industry || undefined } : {}),
    };

    await upsertHolding(updated);
    return NextResponse.json({ holding: updated });
  } catch (err) {
    console.error('[PUT /api/holdings/[id]]', err);
    return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteHolding(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/holdings/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
  }
}
