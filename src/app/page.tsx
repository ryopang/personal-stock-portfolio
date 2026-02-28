import Dashboard from '@/components/Dashboard';

export const dynamic = 'force-dynamic';

async function getInitialHoldings() {
  try {
    const { getHoldings } = await import('@/lib/holdings-service');
    return await getHoldings();
  } catch (err) {
    console.error('Failed to load initial holdings:', err);
    return [];
  }
}

export default async function Page() {
  const initialHoldings = await getInitialHoldings();
  return <Dashboard initialHoldings={initialHoldings} />;
}
