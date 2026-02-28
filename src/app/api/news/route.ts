import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import yahooFinance from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export interface NewsItem {
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  publisher: string;
  symbol: string;
}

function extractCDATA(s: string): string {
  const m = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return m ? m[1].trim() : s.trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, 'i'));
  if (!m) return '';
  // Strip the opening/closing tags to get the inner content
  return m[0].replace(new RegExp(`^<${tag}(?:\\s[^>]*)?>`, 'i'), '').replace(new RegExp(`<\\/${tag}>$`, 'i'), '').trim();
}

function firstNSentences(text: string, n: number): string {
  // Split on sentence-ending punctuation followed by whitespace + capital letter
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z"'])/);
  return parts.slice(0, n).join(' ');
}

// Common uppercase abbreviations that are NOT stock tickers
const NOT_TICKERS = new Set([
  'AI', 'EV', 'US', 'UK', 'EU', 'UN', 'CEO', 'CFO', 'CTO', 'COO', 'IPO',
  'GDP', 'CPI', 'PPI', 'FED', 'SEC', 'FDA', 'IMF', 'WHO', 'IRS', 'DOJ',
  'ETF', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'FOR', 'AND', 'BUT', 'NOT',
  'THE', 'ARE', 'HAS', 'ITS', 'ALL', 'NEW', 'TOP', 'HOW', 'WHY', 'CAN',
  'NOW', 'BIG', 'OLD', 'KEY', 'LOW', 'HIGH', 'EST', 'LLC', 'INC', 'LTD',
  'IOT', 'API', 'IPO', 'SaaS', 'B2B', 'B2C', 'ROI', 'YOY', 'QOQ',
]);

/**
 * Scan an article's English title for the most prominent ticker symbol.
 * Looks for 2–5 uppercase letter sequences that aren't common abbreviations.
 * Returns null if no ticker candidate is found.
 */
function inferTickerFromTitle(title: string): string | null {
  const matches = title.match(/\b[A-Z]{2,5}\b/g);
  if (!matches) return null;
  for (const m of matches) {
    if (!NOT_TICKERS.has(m)) return m;
  }
  return null;
}

/**
 * Re-label articles whose feed symbol differs from the company actually
 * discussed in the title (e.g. an AMD article fetched from NVDA's feed).
 * Only reclassifies to a symbol that is actually in the portfolio — otherwise
 * the inferred ticker would produce a label the user doesn't recognise.
 */
function reclassifyArticles(articles: NewsItem[], portfolioSymbols: Set<string>): NewsItem[] {
  return articles.map((article) => {
    // Normalise the feed symbol for comparison (strip ^, -USD, =F etc.)
    const feedBase = article.symbol.replace(/^\^/, '').replace(/[-=].*$/, '').toUpperCase();
    const inferred = inferTickerFromTitle(article.title);
    if (inferred && inferred !== feedBase && portfolioSymbols.has(inferred)) {
      return { ...article, symbol: inferred };
    }
    return article;
  });
}

// Corporate suffixes that don't help identify a company in article text
const CORP_SUFFIXES = new Set([
  'inc', 'corp', 'corporation', 'ltd', 'limited', 'llc', 'plc', 'sa', 'nv',
  'ag', 'co', 'company', 'group', 'holdings', 'class', 'ordinary', 'shares',
  'adr', 'usd', 'the',
]);

/** Extract meaningful words from a company's display name for title matching. */
function companyKeywords(name: string): string[] {
  return name
    .replace(/[.,&]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length >= 3 && !CORP_SUFFIXES.has(w.toLowerCase()))
    .slice(0, 3);
}

/**
 * Returns true if the article title is relevant to the given stock.
 * Checks for the ticker symbol (all-caps word boundary) or any company keyword.
 */
function isRelevantArticle(title: string, baseSymbol: string, keywords: string[]): boolean {
  // Ticker match: e.g. \bNVDA\b in the title
  if (new RegExp(`\\b${baseSymbol}\\b`).test(title.toUpperCase())) return true;
  // Company keyword match: case-insensitive word boundary
  const tl = title.toLowerCase();
  return keywords.some((kw) => new RegExp(`\\b${kw.toLowerCase()}\\b`).test(tl));
}

function parseRSS(xml: string, symbol: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(xml)) !== null) {
    const content = match[1];
    const title = stripHtml(extractCDATA(extractTag(content, 'title')));
    const link = extractCDATA(extractTag(content, 'link')).trim();
    const rawDesc = extractCDATA(extractTag(content, 'description'));
    const rawSummary = stripHtml(rawDesc);
    const pubDateRaw = extractTag(content, 'pubDate');
    const publisher = stripHtml(extractCDATA(extractTag(content, 'source')));

    if (!title || !link) continue;

    // Skip duplicate of title or empty summaries
    const isRepeat = rawSummary.startsWith(title.slice(0, Math.min(40, title.length)));
    const summary = isRepeat ? '' : firstNSentences(rawSummary, 2);

    let pubDate = new Date().toISOString();
    if (pubDateRaw) {
      const parsed = new Date(pubDateRaw);
      if (!isNaN(parsed.getTime())) pubDate = parsed.toISOString();
    }

    items.push({ title, summary, link, pubDate, publisher: publisher || 'Yahoo Finance', symbol });
  }

  return items;
}

// Separator that survives Google Translate (pure punctuation, no linguistic meaning)
const SEP = ' ~~~~ ';

async function googleTranslate(text: string, target: string): Promise<string> {
  if (!text.trim()) return text;
  const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't', q: text });
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Google Translate ${res.status}`);
  const data = await res.json() as string[][][];
  return data[0].map((s) => s[0]).join('');
}

async function translateArticles(articles: NewsItem[], target: string): Promise<NewsItem[]> {
  if (!articles.length) return articles;

  const results = await Promise.allSettled(
    articles.map(async (article) => {
      // Translate title and summary in one request, joined by a stable separator
      const combined = article.title + SEP + (article.summary || '');
      const translated = await googleTranslate(combined, target);
      const parts = translated.split('~~~~').map((s) => s.trim());
      return {
        ...article,
        title: parts[0] || article.title,
        summary: parts[1] ?? article.summary,
      };
    }),
  );

  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : articles[i]));
}

const PAGE_SIZE = 6;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols') ?? '';
  const translate = searchParams.get('translate') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const all = searchParams.get('all') === '1';

  if (!symbolsParam) {
    return NextResponse.json({ articles: [], hasMore: false, page });
  }

  const symbols = [...new Set(symbolsParam.split(',').filter(Boolean))].slice(0, 12);

  // Run RSS fetches and company name lookup in parallel
  const [rssResults, quoteList] = await Promise.all([
    Promise.allSettled(
      symbols.map(async (symbol) => {
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
          if (!res.ok) return [] as NewsItem[];
          const xml = await res.text();
          return parseRSS(xml, symbol).slice(0, 20);
        } catch {
          return [] as NewsItem[];
        }
      }),
    ),
    yahooFinance.quote(symbols).catch(() => []),
  ]);

  // Build baseSymbol → company keywords map for relevance filtering
  const keywordMap = new Map<string, string[]>();
  for (const q of quoteList) {
    if (!q?.symbol) continue;
    const base = q.symbol.replace(/^\^/, '').replace(/[-=].*$/, '').toUpperCase();
    keywordMap.set(base, companyKeywords(q.longName ?? q.shortName ?? ''));
  }

  const seen = new Set<string>();
  const articles: NewsItem[] = [];

  for (const result of rssResults) {
    if (result.status !== 'fulfilled') continue;
    for (const article of result.value) {
      if (!seen.has(article.link)) {
        seen.add(article.link);
        articles.push(article);
      }
    }
  }

  // Re-label articles whose title references a different company than the feed symbol.
  // Only reclassify to tickers that are actually in this portfolio.
  const portfolioBaseSymbols = new Set(
    symbols.map((s) => s.replace(/^\^/, '').replace(/[-=].*$/, '').toUpperCase()),
  );
  const reclassified = reclassifyArticles(articles, portfolioBaseSymbols);

  // Filter out articles not relevant to the stock they're tagged with.
  // An article is relevant if the ticker or any company keyword appears in the English title.
  const filtered = reclassified.filter((article) => {
    const base = article.symbol.replace(/^\^/, '').replace(/[-=].*$/, '').toUpperCase();
    const keywords = keywordMap.get(base) ?? [];
    return isRelevantArticle(article.title, base, keywords);
  });

  filtered.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  if (all) {
    const output = translate ? await translateArticles(filtered, translate) : filtered;
    return NextResponse.json({ articles: output, hasMore: false, page: 1 });
  }

  const start = (page - 1) * PAGE_SIZE;
  const pageArticles = filtered.slice(start, start + PAGE_SIZE);
  const hasMore = filtered.length > start + PAGE_SIZE;

  const output = translate ? await translateArticles(pageArticles, translate) : pageArticles;

  return NextResponse.json({ articles: output, hasMore, page });
}
