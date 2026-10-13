import { cookies } from 'next/headers';
import Dashboard from '@/components/Dashboard';
import PasswordGate from '@/components/PasswordGate';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_HOLDINGS } from '@/lib/demo-data';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getInitialHoldings() {
  if (DEMO_MODE) return DEMO_HOLDINGS;
  try {
    const { getHoldings } = await import('@/lib/holdings-service');
    return await getHoldings('ryo');
  } catch (err) {
    console.error('Failed to load initial holdings:', err);
    return [];
  }
}

export default async function Page() {
  if (!DEMO_MODE) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    // Nothing portfolio-related is fetched or rendered until the session is verified,
    // so the HTML/RSC payload of a logged-out request contains no holdings.
    if (!(await verifySessionToken(token))) return <PasswordGate />;
  }
  const initialHoldings = await getInitialHoldings();
  return <Dashboard initialHoldings={initialHoldings} />;
}
