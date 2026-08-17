/**
 * reasoning-tool.js
 *
 * Lightweight conversational reasoning over VERIFIED evidence supplied by
 * the existing Gizmo tools. This module deliberately does not fetch market
 * data or calculate quantitative metrics.
 */

function num(value) {
    return value == null || Number.isNaN(Number(value)) ? null : Number(value);
}

function marketContext(market) {
    if (!market || market.error) return null;
    const price = num(market.price);
    const change = num(market.change24h);
    if (price == null && change == null) return null;
    return { price, change24h: change, high24h: num(market.high24h), low24h: num(market.low24h), volume24h: num(market.volume24h) };
}

function signalContext(record) {
    if (!record) return null;
    return {
        signal: record.signal || 'NO_DATA',
        direction: record.direction || 'NEUTRAL',
        zscore: num(record.zscore),
        confidence: num(record.confidence),
        lag: num(record.lag),
        correlation: num(record.correlation),
    };
}

function reasonAboutSignal(symbol, record, market, history = []) {
    const signal = signalContext(record);
    const live = marketContext(market);
    if (!signal || signal.signal === 'NO_DATA') return `I don't have enough current engine evidence to interpret ${symbol}. I won't infer a signal from the market snapshot alone.`;

    const parts = [`${symbol} is currently ${String(signal.signal).toLowerCase()} with a ${String(signal.direction).toLowerCase()} engine direction.`];
    if (signal.zscore != null) {
        if (Math.abs(signal.zscore) >= 2) parts.push(`The measured z-score is ${signal.zscore.toFixed(2)}, so the residual is materially stretched relative to the engine's measured baseline.`);
        else if (Math.abs(signal.zscore) >= 1) parts.push(`The measured z-score is ${signal.zscore.toFixed(2)}, so the residual is extended but below the engine's active threshold.`);
        else parts.push(`The measured z-score is ${signal.zscore.toFixed(2)}, so the residual is relatively close to its measured baseline.`);
    }
    if (signal.lag != null && signal.correlation != null) parts.push(`The engine measures a ${signal.lag}h lead-lag with correlation ${signal.correlation.toFixed(3)}.`);
    else if (signal.lag != null) parts.push(`The engine measures a ${signal.lag}h lead-lag.`);
    if (signal.confidence != null) parts.push(`Engine confidence is ${signal.confidence.toFixed(2)}.`);
    if (live?.change24h != null) parts.push(`The live market snapshot is ${live.change24h >= 0 ? 'up' : 'down'} ${Math.abs(live.change24h).toFixed(2)}% over 24h.`);
    if (Array.isArray(history) && history.length >= 2) parts.push(`There are ${history.length} recorded historical observations available for context.`);
    parts.push(`These measurements describe the engine's current evidence; they do not by themselves guarantee future price movement.`);
    return parts.join(' ');
}

function reasonAboutSignalQuality(symbol, record) {
    const signal = signalContext(record);
    if (!signal || signal.signal === 'NO_DATA') return `I don't have a current quantitative measurement for ${symbol} to assess. I won't manufacture a confidence or quality score.`;
    if (signal.signal === 'INSUFFICIENT_DATA' || signal.signal === 'NO_CORRELATION') {
        return `The engine is not establishing a usable ${symbol} lead-lag measurement right now: ${signal.signal}. That means there isn't enough verified evidence for me to describe the setup as strong or reliable.`;
    }

    const parts = [`${symbol} has a current ${String(signal.signal).toLowerCase()} engine measurement.`];
    if (signal.confidence != null) parts.push(`The engine reports confidence of ${signal.confidence.toFixed(2)}.`);
    else parts.push('The current engine record does not expose a confidence value, so I will not invent one.');
    if (signal.correlation != null) parts.push(`Measured correlation is ${signal.correlation.toFixed(3)}.`);
    if (signal.lag != null) parts.push(`Measured lag is ${signal.lag}h.`);
    if (signal.zscore != null) parts.push(`Measured z-score is ${signal.zscore.toFixed(2)}.`);
    parts.push(`Those are the engine's supplied measurements; this layer does not combine them into a new quality score or predict the next move.`);
    return parts.join(' ');
}

function reasonAboutHistory(symbol, records = []) {
    const usable = (records || []).filter((item) => item && !item.error);
    if (!usable.length) return `I don't have recorded signal history for ${symbol || 'that market'} yet.`;
    const directions = usable.map((item) => String(item.direction || 'NEUTRAL').toUpperCase());
    const active = usable.filter((item) => String(item.signal || '').toUpperCase() === 'ACTIVE');
    const longCount = directions.filter((direction) => direction === 'LONG').length;
    const shortCount = directions.filter((direction) => direction === 'SHORT').length;
    const neutralCount = directions.filter((direction) => direction === 'NEUTRAL').length;
    const latest = usable[0];
    const latestDirection = String(latest.direction || 'NEUTRAL').toUpperCase();
    const latestZ = num(latest.zscore);
    const parts = [`I found ${usable.length} recorded engine observations for ${symbol || 'the requested market'}.`, `${active.length} were recorded as active signals; ${longCount} LONG, ${shortCount} SHORT, and ${neutralCount} NEUTRAL observations are present in the returned history.`];
    if (latestDirection !== 'NEUTRAL' || latestZ != null) parts.push(`The most recent recorded observation is ${latestDirection}${latestZ == null ? '' : ` with z-score ${latestZ.toFixed(2)}`}.`);
    if (usable.length >= 2) {
        const previousDirection = String(usable[1].direction || 'NEUTRAL').toUpperCase();
        parts.push(previousDirection === latestDirection ? `The latest and immediately preceding observations have the same direction (${latestDirection}), so the returned history shows directional continuity across those observations.` : `The latest direction differs from the immediately preceding observation (${previousDirection} → ${latestDirection}), so the returned history shows a recent directional change.`);
    }
    parts.push(`This is a description of recorded engine outputs, not a newly calculated historical statistic or a prediction.`);
    return parts.join(' ');
}

function reasonAboutSimilarSetup(symbol, currentRecord, records = []) {
    const current = signalContext(currentRecord);
    const history = (records || []).filter((item) => item && !item.error && item.signal !== 'NO_DATA');
    if (!current || current.signal === 'NO_DATA') return `I don't have a current quantitative setup for ${symbol} that I can compare against history.`;
    if (!history.length) return `I don't have enough recorded ${symbol} history to compare the current setup against earlier engine observations.`;

    const candidates = history.filter((item) => {
        const directionMatches = String(item.direction || 'NEUTRAL').toUpperCase() === String(current.direction).toUpperCase();
        if (!directionMatches) return false;
        if (current.zscore == null || num(item.zscore) == null) return true;
        return Math.abs(Math.abs(num(item.zscore)) - Math.abs(current.zscore)) <= 0.5;
    });

    const withoutCurrent = candidates.filter((item) => item.timestamp !== undefined && item.timestamp !== history[0]?.timestamp);
    const matches = withoutCurrent.length ? withoutCurrent : candidates.slice(1);
    if (!matches.length) return `I don't see an earlier recorded ${symbol} observation in the returned history with the same direction and a closely similar z-score. That does not mean it has never happened; only that the available history doesn't show one.`;

    const example = matches[0];
    const z = num(example.zscore);
    const lag = num(example.lag);
    const when = example.timestamp ? ` from ${new Date(example.timestamp).toLocaleString()}` : '';
    return `Yes. The returned history contains ${matches.length} earlier ${symbol} observation${matches.length === 1 ? '' : 's'} with the same ${String(current.direction).toUpperCase()} direction and a similar z-score. One example is${when}${z == null ? '' : ` at z-score ${z.toFixed(2)}`}${lag == null ? '' : ` with a ${lag}h measured lag`}. This is a comparison of recorded engine outputs, not a new backtest or a claim about what happened afterward.`;
}

function compareEvidence(entries) {
    const usable = (entries || []).filter(([, value]) => value && value.signal !== 'NO_DATA');
    if (!usable.length) return 'There are no current quantitative measurements available to compare.';
    const ranked = [...usable].sort((a, b) => Math.abs(num(b[1].zscore) || 0) - Math.abs(num(a[1].zscore) || 0));
    const strongest = ranked[0];
    const name = strongest[0].replace('-USDT-SWAP', '');
    const z = num(strongest[1].zscore);
    return `Among the currently measured markets, ${name} has the largest absolute z-score${z == null ? '' : ` at ${z.toFixed(2)}`}. This is a ranking of the engine's measured evidence, not a prediction of which market will perform best.`;
}

module.exports = { reasonAboutSignal, reasonAboutSignalQuality, reasonAboutHistory, reasonAboutSimilarSetup, compareEvidence };
