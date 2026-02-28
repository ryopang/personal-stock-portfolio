import Dashboard from '@/components/Dashboard';
import PasswordGate from '@/components/PasswordGate';

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
  return (
    <PasswordGate>
      <Dashboard initialHoldings={initialHoldings} />
    </PasswordGate>
  );
}
