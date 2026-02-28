import YahooFinance from 'yahoo-finance2';

// Create a singleton instance for server-side use.
// In serverless environments each cold start creates a new instance,
// which is fine since YahooFinance has no persistent connections.
const yahooFinance = new YahooFinance();

export default yahooFinance;
