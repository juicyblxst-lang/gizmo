const { getSignals } = require('./tools/signal-tool');
const { getMarketData } = require('./tools/market-tool');
const { getHistory } = require('./tools/history-tool');
const { addMonitor, getMonitored } = require('./tools/monitor-tool');
const { reasonAboutSignal, reasonAboutHistory, reasonAboutSimilarSetup, compareEvidence } = require('./tools/reasoning-tool');

const PAIRS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'HYPE'];

function extractPair(text) {
  const match = String(text || '').toUpperCase().match(/\b(BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|DOGECOIN|HYPE)\b/);
  if (!match) return null;
  return ({ BITCOIN: 'BTC', ETHEREUM: 'ETH', SOLANA: 'SOL', DOGECOIN: 'DOGE' })[match[1]] || match[1];
}

function textOf(message) {
  return (message?.parts || []).map((part) => part.type === 'text' ? part.text : '').join('');
}

function lastUser(messages) {
  return [...(messages || [])].reverse().find((message) => message?.role === 'user');
}

function previousPair(messages, beforeIndex = (messages || []).length) {
  for (let i = beforeIndex - 1; i >= 0; i -= 1) {
    const pair = extractPair(textOf(messages[i]));
    if (pair) return pair;
  }
  return null;
}

function seed(text, messages) {
  const source = `${(messages || []).length}:${text}:${(messages || []).slice(-4).map(textOf).join('|')}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(items, n) { return items[n % items.length]; }
function pairId(symbol) { return `${symbol}-USDT-SWAP`; }

function isFollowUp(text) {
  return /^(why|how|what do you mean|why is that|why do you think so|is that unusual|what about it|and what about that|explain|tell me more|how so|what does that mean|what happened|has it|did it|and\s+then)\b/i.test(text.trim());
}

function classify(text) {
  const lower = text.toLowerCase().trim();
  if (/^(hello|hi|hey|yo|sup|howdy|good morning|good afternoon|good evening)\b/i.test(lower)) return 'greeting';
  if (/^(help|what can you do|how do you work|guide|commands|capabilities)\b/i.test(lower)) return 'help';
  if (/\b(status|health|is it working)\b/i.test(lower) && lower.length < 40) return 'status';
  if (/\b(monitor|watch|track|watchlist|start monitoring)\b/i.test(lower)) return 'monitor';
  if (/\b(history|historical|past signals|previous signals|recent signals|what happened)\b/i.test(lower)) return 'history';
  if (/\b(similar|same setup|seen this before|seen a setup|before|again|repeat|repeated|historical pattern|pattern)\b/i.test(lower)) return 'similar_setup';
  if (/\b(compare|versus|vs\.?|strongest|weakest|best signal|worst signal|which .*leading|who .*leading|leader|follower)\b/i.test(lower)) return 'comparison';
  if (/\b(why|explain|reason|unusual|stretched|mean.?reversion|what does .* mean)\b/i.test(lower)) return 'explanation';
  if (/\b(signal|signals|z-?score|lead.?lag|deviation|correlation|lag)\b/i.test(lower)) return 'signals';
  if (/\b(price|market|ticker|worth|value|cost|how much|doing|happening|going|now|currently|right now)\b/i.test(lower)) return 'market';
  return 'unknown';
}

async function evidence(symbol) {
  const [market, signals] = await Promise.all([getMarketData(pairId(symbol)), getSignals()]);
  const record = signals?.pairs?.[pairId(symbol)] || null;
  return { market, record, signals };
}

async function answerMarket(symbol, messages, userText) {
  const { market, record } = await evidence(symbol);
  if (!market || market.error) return { handled: true, response: `I couldn't get a live ${symbol} market snapshot. The market tool failed, so I won't turn that into a guess.` };
  const price = Number(market.price || 0);
  const change = Number(market.change24h || 0);
  const high = Number(market.high24h || 0);
  const low = Number(market.low24h || 0);
  const volume = Number(market.volume24h || 0);
  const z = Number(record?.zscore || 0);
  const direction = String(record?.direction || 'NEUTRAL');
  const signal = String(record?.signal || 'NO_DATA');
  const lag = record?.lag == null ? null : Number(record.lag);
  const correlation = record?.correlation == null ? null : Number(record.correlation);
  const s = seed(userText, messages);
  const opening = change > 1 ? pick([`${symbol} is leaning higher right now.`, `There's some upside pressure in ${symbol}'s current 24h read.`, `${symbol} is carrying a positive tilt on the latest snapshot.`], s) : change < -1 ? pick([`${symbol} is under some pressure right now.`, `The latest ${symbol} snapshot is tilted lower.`, `${symbol} is leaning soft on the current 24h move.`], s) : pick([`${symbol} is fairly contained on the latest snapshot.`, `Nothing especially stretched is showing up in ${symbol} right now.`, `${symbol} is moving, but the latest read is relatively modest.`], s);
  const engine = `The lead-lag engine has it at ${signal} / ${direction}, with a z-score of ${z.toFixed(2)}${lag == null ? '' : ` and a measured ${lag}h lag`}${correlation == null ? '' : ` (correlation ${correlation.toFixed(3)})`}.`;
  return { handled: true, response: [opening, `24h: ${change.toFixed(2)}% · price $${price.toLocaleString()} · range $${low.toLocaleString()}–$${high.toLocaleString()} · volume $${volume.toLocaleString()}.`, engine].join('\n'), context: { pair: symbol } };
}

async function answerSignals(symbol) {
  const data = await getSignals();
  if (!data || data.error) return { handled: true, response: "The signal engine is unavailable right now. That's a data failure, not a 'no signal' result." };
  const entries = Object.entries(data.pairs || {}).filter(([key]) => !symbol || key.startsWith(`${symbol}-`));
  if (!entries.length) return { handled: true, response: `I don't have a current signal measurement for ${symbol || 'those markets'}.` };
  const lines = entries.map(([key, value]) => `${key.replace('-USDT-SWAP', '')}: ${value.signal || 'NO_DATA'} · ${value.direction || 'NEUTRAL'} · z ${Number(value.zscore || 0).toFixed(2)}${value.lag == null ? '' : ` · lag ${value.lag}h`}${value.correlation == null ? '' : ` · corr ${Number(value.correlation).toFixed(3)}`}`);
  return { handled: true, response: lines.join('\n'), context: { pair: symbol || (entries[0][0].split('-')[0]) } };
}

async function answerExplanation(symbol) {
  if (!symbol) return { handled: true, response: 'Which market should I explain? Try “why SOL?” or “explain the BTC signal”.' };
  const data = await getSignals();
  if (!data || data.error) return { handled: true, response: "The signal engine is unavailable right now, so I can't explain a measurement I can't verify." };
  const record = data.pairs?.[pairId(symbol)];
  const market = await getMarketData(pairId(symbol));
  return { handled: true, response: reasonAboutSignal(symbol, record, market), context: { pair: symbol } };
}

async function answerComparison() {
  const data = await getSignals();
  if (!data || data.error) return { handled: true, response: "The signal engine is unavailable right now. I won't rank markets without current engine data." };
  const entries = Object.entries(data.pairs || {}).filter(([, value]) => value && value.signal !== 'NO_DATA');
  return { handled: true, response: compareEvidence(entries), context: entries[0] ? { pair: entries[0][0].split('-')[0] } : undefined };
}

async function answerHistory(symbol) {
  const data = await getHistory(20, symbol ? pairId(symbol) : null);
  const records = Array.isArray(data) ? data : (data?.signals || []);
  if (!records.length) return { handled: true, response: `I don't have recorded ${symbol || ''} signal history available right now.` };
  return { handled: true, response: reasonAboutHistory(symbol, records), context: { pair: symbol } };
}

async function answerSimilarSetup(symbol) {
  if (!symbol) return { handled: true, response: 'Which market should I compare against its history? Try “has SOL seen this setup before?”' };
  const [signals, historyData] = await Promise.all([getSignals(), getHistory(50, pairId(symbol))]);
  if (!signals || signals.error) return { handled: true, response: "The signal engine is unavailable right now, so I can't compare the current setup against history." };
  const record = signals.pairs?.[pairId(symbol)];
  const records = Array.isArray(historyData) ? historyData : (historyData?.signals || []);
  return { handled: true, response: reasonAboutSimilarSetup(symbol, record, records), context: { pair: symbol } };
}

async function answerMonitor(symbol) {
  if (!symbol) return { handled: true, response: 'Which market should I watch? Try “monitor SOL” or “watch BTC”.' };
  const result = await addMonitor(pairId(symbol));
  return { handled: true, response: result?.success === false ? `I couldn't add ${symbol} to the watchlist: ${result.message || 'the monitor tool failed'}.` : `${symbol} is now on the monitoring list.`, context: { pair: symbol } };
}

async function answerFollowUp(symbol, text, messages) {
  const kind = classify(text);
  if (kind === 'history') return answerHistory(symbol);
  if (kind === 'similar_setup') return answerSimilarSetup(symbol);
  if (kind === 'explanation' || /^why\b/i.test(text.trim())) return answerExplanation(symbol);
  if (kind === 'signals') return answerSignals(symbol);
  return answerMarket(symbol, messages, text);
}

async function processConversation(messages = []) {
  const user = lastUser(messages);
  const text = textOf(user).trim();
  if (!text) return { handled: false };
  const userIndex = messages.lastIndexOf(user);
  const explicitPair = extractPair(text);
  const contextPair = previousPair(messages, userIndex);
  const symbol = explicitPair || contextPair;
  if (isFollowUp(text) && symbol) return answerFollowUp(symbol, text, messages);
  switch (classify(text)) {
    case 'greeting': return { handled: true, response: pick([`Hey. I'm here. What market are you looking at?`, `What's up? Give me a market or ask for the current lead-lag read.`, `I'm online. Point me at a pair and we'll work through it.`], seed(text, messages)) };
    case 'help': return { handled: true, response: 'Ask about live market data, current signals, lead-lag relationships, signal history, monitoring, comparisons, historical setup similarity, or explanations. I will use the existing Gizmo engine for the numbers rather than inventing them.' };
    case 'market': return symbol ? answerMarket(symbol, messages, text) : { handled: true, response: 'Which market do you want me to inspect? Try BTC, ETH, SOL, XRP, DOGE, or HYPE.' };
    case 'signals': return answerSignals(symbol);
    case 'explanation': return answerExplanation(symbol);
    case 'similar_setup': return answerSimilarSetup(symbol);
    case 'comparison': return answerComparison();
    case 'history': return answerHistory(symbol);
    case 'monitor': return answerMonitor(symbol);
    case 'status': {
      const [signals, monitored] = await Promise.all([getSignals(), getMonitored()]);
      return { handled: true, response: `Gizmo is up. ${Object.keys(signals?.pairs || {}).length} pairs loaded, ${signals?.activeSignals?.length || 0} active signals. Monitoring: ${(monitored?.monitored || []).join(', ') || 'none'}.` };
    }
    default: return { handled: false };
  }
}

module.exports = { processConversation, extractPair, classify };
