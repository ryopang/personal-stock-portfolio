import { NextRequest, NextResponse } from 'next/server';
import { getHolding, upsertHolding, deleteHolding } from '@/lib/holdings-service';
import type { AssetType } from '@/lib/types';

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
    const { quantity, costBasis, purchaseDate, type, industry } = body as {
      quantity?: number;
      costBasis?: number;
      purchaseDate?: string;
      type?: AssetType;
      industry?: string;
    };

    if (quantity != null && quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }
    if (costBasis != null && costBasis <= 0) {
      return NextResponse.json({ error: 'Cost basis must be greater than 0' }, { status: 400 });
    }

    const updated = {
      ...existing,
      ...(quantity != null ? { quantity: Number(quantity) } : {}),
      ...(costBasis != null ? { costBasis: Number(costBasis) } : {}),
      ...(purchaseDate ? { purchaseDate } : {}),
      ...(type ? { type } : {}),
      ...('industry' in body ? { industry: industry?.trim() || undefined } : {}),
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
