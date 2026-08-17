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
    return {
        price,
        change24h: change,
        high24h: num(market.high24h),
        low24h: num(market.low24h),
        volume24h: num(market.volume24h),
    };
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

    if (!signal || signal.signal === 'NO_DATA') {
        return `I don't have enough current engine evidence to interpret ${symbol}. I won't infer a signal from the market snapshot alone.`;
    }

    const parts = [];
    const direction = String(signal.direction).toLowerCase();
    const signalState = String(signal.signal).toLowerCase();

    parts.push(`${symbol} is currently ${signalState} with a ${direction} engine direction.`);

    if (signal.zscore != null) {
        if (Math.abs(signal.zscore) >= 2) {
            parts.push(`The measured z-score is ${signal.zscore.toFixed(2)}, so the residual is materially stretched relative to the engine's measured baseline.`);
        } else if (Math.abs(signal.zscore) >= 1) {
            parts.push(`The measured z-score is ${signal.zscore.toFixed(2)}, so the residual is extended but below the engine's active threshold.`);
        } else {
            parts.push(`The measured z-score is ${signal.zscore.toFixed(2)}, so the residual is relatively close to its measured baseline.`);
        }
    }

    if (signal.lag != null && signal.correlation != null) {
        parts.push(`The engine measures a ${signal.lag}h lead-lag with correlation ${signal.correlation.toFixed(3)}.`);
    } else if (signal.lag != null) {
        parts.push(`The engine measures a ${signal.lag}h lead-lag.`);
    }

    if (signal.confidence != null) {
        parts.push(`Engine confidence is ${signal.confidence.toFixed(2)}.`);
    }

    if (live) {
        const change = live.change24h;
        if (change != null) {
            parts.push(`The live market snapshot is ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}% over 24h.`);
        }
    }

    if (Array.isArray(history) && history.length >= 2) {
        parts.push(`There are ${history.length} recorded historical observations available for context.`);
    }

    parts.push(`These measurements describe the engine's current evidence; they do not by themselves guarantee future price movement.`);
    return parts.join(' ');
}

function compareEvidence(entries) {
    const usable = (entries || []).filter(([, value]) => value && value.signal !== 'NO_DATA');
    if (!usable.length) return 'There are no current quantitative measurements available to compare.';

    const ranked = [...usable].sort((a, b) => {
        const az = Math.abs(num(a[1].zscore) || 0);
        const bz = Math.abs(num(b[1].zscore) || 0);
        return bz - az;
    });

    const strongest = ranked[0];
    const name = strongest[0].replace('-USDT-SWAP', '');
    const z = num(strongest[1].zscore);
    return `Among the currently measured markets, ${name} has the largest absolute z-score${z == null ? '' : ` at ${z.toFixed(2)}`}. This is a ranking of the engine's measured evidence, not a prediction of which market will perform best.`;
}

module.exports = { reasonAboutSignal, compareEvidence };
