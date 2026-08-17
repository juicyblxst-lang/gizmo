const { getSignals } = require('./tools/signal-tool');
const { getMarketData } = require('./tools/market-tool');
const { getHistory } = require('./tools/history-tool');
const { addMonitor, getMonitored } = require('./tools/monitor-tool');

// This module is deliberately an adapter. It does not replace the existing
// signal, market, history, or monitoring engines. It turns their output into
// conversation-aware answers for the current Gizmo UI/API contract.
const PAIRS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'HYPE'];

function extractPair(text) {
  const match = String(text || '').toUpperCase().match(/\b(BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|DOGECOIN|HYPE)\b/);
  if (!match) return null;
  return ({ BITCOIN: 'BTC', ETHEREUM: 'ETH', SOLANA: 'SOL', DOGECOIN: 'DOGE' })[match[1]] || match[1];
}

function contextPair(marketContext) {
  const market = typeof marketContext === 'string' ? marketContext : marketContext?.market;
  if (!market) return null;
  return extractPair(String(market).replace('/', ' '));
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
  const source = `${(messages || []).length}:${text}:${(messages || []).slice(-6).map(textOf).join('|')}`;
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(items, n) { return items[n % items.length]; }
function pairId(symbol) { return `${symbol}-USDT-SWAP`; }
function displayPair(value) { return String(value || '').replace('-USDT-SWAP', '').replace('/USDT', ''); }

function isFollowUp(text) {
  return /^(why|how|what do you mean|why is that|why do you think so|is that unusual|is that normal|what about it|and what about that|explain|tell me more|how so|what does that mean|what happened|has it|did it|and then)\b/i.test(text.trim());
}

function isContextSwitch(text) {
  return /^(and|what about|how about)\s+(BTC|BITCOIN|ETH|ETHEREUM|SOL|SOLANA|XRP|DOGE|DOGECOIN|HYPE)\b/i.test(text.trim());
}

function classify(text) {
  const lower = text.toLowerCase().trim();
  if (/^(hello|hi|hey|yo|sup|howdy|good morning|good afternoon|good evening)\b/i.test(lower)) return 'greeting';
  if (/^(help|what can you do|how do you work|guide|commands|capabilities)\b/i.test(lower)) return 'help';
  if (/\b(status|health|is it working)\b/i.test(lower) && lower.length < 50) return 'status';
  if (/\b(monitor|watch|track|watchlist|start monitoring|stop monitoring)\b/i.test(lower)) return 'monitor';
  if (/\b(history|historical|past signals|previous signals|recent signals|last \d+\s*(minutes?|hours?|days?))\b/i.test(lower)) return 'history';
  if (/\b(what is|what's|define|meaning of)\b.*\b(lead.?lag|z-?score|correlation|signal)\b/i.test(lower)) return 'explain';
  if (/\b(compare|comparison|relationship|lead.?lag|leader|follower|follows?|leads?|correlation|lag|signal|signals|z-?score|deviation|mean.?reversion|unusual|extreme)\b/i.test(lower)) return 'signals';
  if (isContextSwitch(lower)) return 'market';
  if (/\b(price|market|ticker|worth|value|cost|how much|doing|happening|going|now|currently|right now)\b/i.test(lower)) return 'market';
  return 'unknown';
}

async function evidence(symbol) {
  const [market, signals] = await Promise.all([
    getMarketData(pairId(symbol)),
    getSignals(),
  ]);
  const record = signals?.pairs?.[pairId(symbol)] || null;
  return { market, record, signals };
}

function signalFields(record) {
  return {
    z: Number(record?.zscore || 0),
    direction: String(record?.direction || 'NEUTRAL'),
    signal: String(record?.signal || 'NO_DATA'),
    lag: record?.lag == null ? null : Number(record.lag),
    correlation: record?.correlation == null ? null : Number(record.correlation),
    confidence: record?.confidence == null ? null : Number(record.confidence),
  };
}

async function answerMarket(symbol, messages, userText, reason = 'market') {
  const { market, record } = await evidence(symbol);
  if (!market || market.error) {
    return { handled: true, response: `I couldn't get a live ${symbol} market snapshot. The market tool failed, so I won't turn that into a guess.`, context: { pair: symbol } };
  }

  const price = Number(market.price || 0);
  const change = Number(market.change24h || 0);
  const high = Number(market.high24h || 0);
  const low = Number(market.low24h || 0);
  const volume = Number(market.volume24h || 0);
  const { z, direction, signal, lag, correlation } = signalFields(record);
  const s = seed(`${reason}:${userText}`, messages);

  const opening = change > 1
    ? pick([`${symbol} is leaning higher right now.`, `There's some upside pressure in ${symbol}'s latest 24h read.`, `${symbol} has a positive tilt on the current snapshot.`], s)
    : change < -1
      ? pick([`${symbol} is under some pressure right now.`, `The latest ${symbol} snapshot is tilted lower.`, `${symbol} is leaning soft on the current 24h move.`], s)
      : pick([`${symbol} is fairly contained on the latest snapshot.`, `Nothing especially stretched is showing up in ${symbol} right now.`, `${symbol} is moving, but the latest read is relatively modest.`], s);

  const engine = `Lead-lag: ${signal} / ${direction}, z-score ${z.toFixed(2)}${lag == null ? '' : `, measured lag ${lag}h`}${correlation == null ? '' : `, correlation ${correlation.toFixed(3)}`}.`;
  return {
    handled: true,
    response: [
      opening,
      `24h: ${change.toFixed(2)}% · price $${price.toLocaleString()} · range $${low.toLocaleString()}–$${high.toLocaleString()} · volume $${volume.toLocaleString()}.`,
      engine,
    ].join('\n'),
    context: { pair: symbol },
  };
}

async function answerSignals(symbol, text, messages) {
  const data = await getSignals();
  if (!data || data.error) {
    return { handled: true, response: "The signal engine is unavailable right now. That's a data failure, not a 'no signal' result." };
  }

  const mentioned = [...String(text).toUpperCase().matchAll(/\b(BTC|ETH|SOL|XRP|DOGE|HYPE)\b/g)].map((m) => m[1]);
  const unique = [...new Set(mentioned)];
  const entries = Object.entries(data.pairs || {}).filter(([key]) => !symbol || key.startsWith(`${symbol}-`));

  // A comparison/relationship question should use the engine's measured BTC
  // leader model instead of fabricating a direct relationship between two
  // followers.
  if (/\b(compare|relationship|between|leads?|follows?|leader|follower)\b/i.test(text) && unique.length >= 2) {
    if (!unique.includes('BTC')) {
      return {
        handled: true,
        response: `The current Gizmo engine does not claim a direct ${unique[0]} → ${unique[1]} relationship. Its measured model uses BTC as the leader, so I won't manufacture another relationship.`,
        context: { pair: unique[0] },
      };
    }
    const follower = unique.find((item) => item !== 'BTC');
    const value = data.pairs?.[pairId(follower)];
    if (!value) return { handled: true, response: `I don't have a current BTC → ${follower} measurement.` };
    return {
      handled: true,
      response: [
        `BTC → ${follower} is the measured relationship in the current engine.`,
        `Lag: ${value.lag ?? 'N/A'}h · correlation: ${value.correlation == null ? 'N/A' : Number(value.correlation).toFixed(3)} · z-score: ${Number(value.zscore || 0).toFixed(2)}.`,
        `Signal: ${value.signal || 'NO_DATA'} · direction: ${value.direction || 'NEUTRAL'}.`,
        `Those are engine measurements, not a promise that the relationship will persist or that the follower must revert.`,
      ].join('\n'),
      context: { pair: follower },
    };
  }

  if (!entries.length) return { handled: true, response: `I don't have a current signal measurement for ${symbol || 'those markets'}.` };
  const lines = entries.map(([key, value]) => `${displayPair(key)}: ${value.signal || 'NO_DATA'} · ${value.direction || 'NEUTRAL'} · z ${Number(value.zscore || 0).toFixed(2)}${value.lag == null ? '' : ` · lag ${value.lag}h`}${value.correlation == null ? '' : ` · corr ${Number(value.correlation).toFixed(3)}`}`);
  return { handled: true, response: lines.join('\n'), context: { pair: symbol || displayPair(entries[0][0]) } };
}

function durationMs(text) {
  const match = String(text).match(/\b(\d+)\s*(minute|minutes|hour|hours|day|days)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * (unit.startsWith('minute') ? 60e3 : unit.startsWith('hour') ? 3600e3 : 86400e3);
}

async function answerHistory(symbol, text) {
  const requestedWindow = durationMs(text);
  const data = await getHistory(50);
  if (!data || data.error) return { handled: true, response: `I don't have recorded ${symbol || ''} signal history available right now.` };
  const records = Array.isArray(data) ? data : (data.signals || []);
  const now = Date.now();
  const filtered = records
    .filter((item) => !symbol || item?.pair === symbol || item?.pair === pairId(symbol) || item?.symbol === symbol)
    .filter((item) => !requestedWindow || !item.timestamp || (now - new Date(item.timestamp).getTime()) <= requestedWindow)
    .slice(0, 12);

  if (!filtered.length) return { handled: true, response: `I don't have recorded ${symbol || ''} signal history for that window.` };
  return {
    handled: true,
    response: filtered.map((item) => `• ${displayPair(item.pair || item.symbol || 'market')}: ${item.direction || 'NEUTRAL'} · z ${Number(item.zscore || 0).toFixed(2)}${item.confidence == null ? '' : ` · confidence ${Number(item.confidence).toFixed(2)}`}${item.timestamp ? ` · ${new Date(item.timestamp).toLocaleString()}` : ''}`).join('\n'),
    context: { pair: symbol },
  };
}

function answerExplanation(text, symbol, messages) {
  const lower = text.toLowerCase();
  const s = seed(text, messages);
  if (/lead.?lag/.test(lower)) {
    return { handled: true, response: pick([
      'Lead-lag here means the engine measures whether BTC tends to move before the follower, and by roughly how many hours. It is a measured relationship, not a guarantee.',
      'In Gizmo, lead-lag is the measured timing relationship between BTC and a follower. The important pieces are lag, correlation, and the current residual signal.',
      'The lead-lag engine is asking a timing question: does BTC move first, and does the follower tend to respond later? The current numbers come from the existing engine, not from a guess.',
    ], s), context: { pair: symbol } };
  }
  if (/z-?score/.test(lower)) {
    return { handled: true, response: 'A z-score measures how far the current modeled relationship is from its recent baseline in standard-deviation terms. Higher absolute values mean more unusual; it does not by itself predict the next price move.', context: { pair: symbol } };
  }
  return { handled: true, response: 'I use the existing Gizmo engine for the live numbers, then keep the conversation layer separate so follow-ups can build on the previous market context instead of starting over.', context: { pair: symbol } };
}

async function answerFollowUp(symbol, text, messages) {
  const { market, record } = await evidence(symbol);
  if (!market || market.error) return { handled: true, response: `I lost the live ${symbol} evidence while following up, so I won't fill the gap with a guess.`, context: { pair: symbol } };

  const { z, direction, signal, lag, correlation, confidence } = signalFields(record);
  const lower = text.toLowerCase();
  if (/\b(unusual|normal|extreme|stretched|odd)\b/.test(lower)) {
    const magnitude = Math.abs(z);
    const read = magnitude >= 2 ? 'meaningfully stretched' : magnitude >= 1 ? 'somewhat away from its baseline' : 'not especially unusual';
    return { handled: true, response: `${symbol} is ${read} on the current engine snapshot: z-score ${z.toFixed(2)}, ${direction} direction, ${signal} status. A z-score describes the modeled residual; it does not predict the next move.`, context: { pair: symbol } };
  }
  if (/\b(why|how|what does that mean|what happened)\b/.test(lower)) {
    const details = [
      `The current ${symbol} evidence is ${signal} / ${direction} with a z-score of ${z.toFixed(2)}.`,
      lag == null ? null : `The measured lag is ${lag}h${correlation == null ? '' : ` with correlation ${correlation.toFixed(3)}`}.`,
      confidence == null ? null : `Engine confidence is ${confidence.toFixed(2)}.`,
      'That explains the current classification; it is not a promise about what happens next.',
    ].filter(Boolean);
    return { handled: true, response: details.join('\n'), context: { pair: symbol } };
  }
  return answerMarket(symbol, messages, text, 'follow-up');
}

async function answerMonitor(symbol) {
  if (!symbol) return { handled: true, response: 'Which market should I watch? Try “monitor SOL” or “watch BTC”.' };
  const result = await addMonitor(pairId(symbol));
  return {
    handled: true,
    response: result?.success === false ? `I couldn't add ${symbol} to the watchlist: ${result.message || 'the monitor tool failed'}.` : `${symbol} is now on the monitoring list.`,
    context: { pair: symbol },
  };
}

async function answerStatus() {
  const [signals, monitored] = await Promise.all([getSignals(), getMonitored()]);
  return {
    handled: true,
    response: `Gizmo is up. ${Object.keys(signals?.pairs || {}).length} pairs loaded, ${signals?.activeSignals?.length || 0} active signals. Monitoring: ${(monitored?.monitored || []).map(displayPair).join(', ') || 'none'}.`,
  };
}

async function processConversation(messages = [], options = {}) {
  const user = lastUser(messages);
  const text = textOf(user).trim();
  if (!text) return { handled: false };

  const userIndex = messages.lastIndexOf(user);
  const explicitPair = extractPair(text);
  const conversationPair = previousPair(messages, userIndex);
  const selectedPair = contextPair(options.marketContext);
  const symbol = explicitPair || conversationPair || selectedPair;

  // Conversation context wins over generic routing for true follow-ups, while
  // an explicit new pair always switches the subject cleanly.
  if (isFollowUp(text) && symbol) return answerFollowUp(symbol, text, messages);
  if (isContextSwitch(text) && explicitPair) return answerMarket(explicitPair, messages, text, 'context-switch');

  switch (classify(text)) {
    case 'greeting':
      return { handled: true, response: pick([`Hey. I'm here. What market are you looking at?`, `What's up? Give me a market or ask for the current lead-lag read.`, `I'm online. Point me at a pair and we'll work through it.`], seed(text, messages)) };
    case 'help':
      return { handled: true, response: 'Ask about live market data, current signals, lead-lag relationships, signal history, or monitoring. I will use the existing Gizmo engine for the numbers rather than inventing them.' };
    case 'explain':
      return answerExplanation(text, symbol, messages);
    case 'market':
      return answerMarket(symbol || 'BTC', messages, text);
    case 'signals':
      return answerSignals(symbol, text, messages);
    case 'history':
      return answerHistory(symbol, text);
    case 'monitor':
      return answerMonitor(symbol);
    case 'status':
      return answerStatus();
    default:
      // Unknown/general questions intentionally fall through to the UI's
      // existing model fallback. This keeps this adapter from hijacking the
      // normal Gizmo assistant behavior.
      return { handled: false };
  }
}

module.exports = { processConversation, extractPair, classify };
