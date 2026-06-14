import Dashboard from '@/components/Dashboard';
import PasswordGate from '@/components/PasswordGate';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_HOLDINGS } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

async function getInitialHoldings() {
  if (DEMO_MODE) return DEMO_HOLDINGS;
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
  const content = <Dashboard initialHoldings={initialHoldings} />;
  return DEMO_MODE ? content : <PasswordGate>{content}</PasswordGate>;
}
