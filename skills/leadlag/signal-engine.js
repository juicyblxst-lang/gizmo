const { PAIRS, fetchAllPrices } = require('./data');

// ============================================
// EXISTING MATH FUNCTIONS (from run.js)
// ============================================

function logReturns(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i-1].close > 0 && prices[i].close > 0) {
            returns.push({
                timestamp: prices[i].timestamp,
                return: Math.log(prices[i].close / prices[i-1].close)
            });
        }
    }
    return returns;
}

function pearson(x, y) {
    if (x.length !== y.length || x.length < 3) return null;
    const mx = x.reduce((a, b) => a + b, 0) / x.length;
    const my = y.reduce((a, b) => a + b, 0) / y.length;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
    const dx = Math.sqrt(x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0));
    const dy = Math.sqrt(y.reduce((sum, yi) => sum + (yi - my) ** 2, 0));
    if (dx === 0 || dy === 0) return null;
    return numerator / (dx * dy);
}

function linearRegression(x, y) {
    const mx = x.reduce((a, b) => a + b, 0) / x.length;
    const my = y.reduce((a, b) => a + b, 0) / y.length;
    const numerator = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
    const denominator = x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0);
    if (denominator === 0) return { alpha: 0, beta: 0 };
    const beta = numerator / denominator;
    const alpha = my - beta * mx;
    return { alpha, beta };
}

function findBestLag(leaderReturns, followerReturns) {
    let bestLag = 1;
    let bestCorr = null;
    for (let lag = 1; lag <= 24; lag++) {
        const pairs = [];
        for (let i = 0; i < leaderReturns.length - lag; i++) {
            pairs.push({
                leader: leaderReturns[i].return,
                follower: followerReturns[i + lag].return
            });
        }
        if (pairs.length < 20) continue;
        const x = pairs.map(p => p.leader);
        const y = pairs.map(p => p.follower);
        const corr = pearson(x, y);
        if (corr !== null) {
            if (bestCorr === null || Math.abs(corr) > Math.abs(bestCorr)) {
                bestCorr = corr;
                bestLag = lag;
            }
        }
    }
    return { lag: bestLag, correlation: bestCorr };
}

// ============================================
// SIGNAL GENERATION FOR A SINGLE PAIR
// ============================================

function generateSignalForPair(pair, prices, btcPrices) {
    try {
        // BTC is the leader (skip BTC itself)
        if (pair === 'BTC-USDT-SWAP') {
            return {
                pair,
                zscore: 0,
                direction: 'NEUTRAL',
                lag: 0,
                correlation: null,
                price: prices[prices.length - 1]?.close || 0,
                signal: 'LEADER'
            };
        }

        const btcReturns = logReturns(btcPrices);
        const followerReturns = logReturns(prices);

        if (btcReturns.length < 50 || followerReturns.length < 50) {
            return {
                pair,
                zscore: 0,
                direction: 'NEUTRAL',
                lag: 0,
                correlation: null,
                price: prices[prices.length - 1]?.close || 0,
                signal: 'INSUFFICIENT_DATA'
            };
        }

        const { lag, correlation } = findBestLag(btcReturns, followerReturns);

        if (correlation === null) {
            return {
                pair,
                zscore: 0,
                direction: 'NEUTRAL',
                lag: lag || 0,
                correlation: null,
                price: prices[prices.length - 1]?.close || 0,
                signal: 'NO_CORRELATION'
            };
        }

        // Align data for regression
        const pairs = [];
        for (let i = 0; i < btcReturns.length - lag; i++) {
            pairs.push({
                leader: btcReturns[i].return,
                follower: followerReturns[i + lag].return
            });
        }

        if (pairs.length < 20) {
            return {
                pair,
                zscore: 0,
                direction: 'NEUTRAL',
                lag,
                correlation,
                price: prices[prices.length - 1]?.close || 0,
                signal: 'INSUFFICIENT_DATA'
            };
        }

        const x = pairs.map(p => p.leader);
        const y = pairs.map(p => p.follower);
        const { alpha, beta } = linearRegression(x, y);

        // Calculate residuals
        const residuals = pairs.map((p) => {
            const expected = alpha + beta * p.leader;
            return p.follower - expected;
        });

        // Rolling z-score (168 hours)
        const window = 168;
        const recent = residuals.slice(-window);
        const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length;
        const std = Math.sqrt(variance);
        const zscore = std > 0 ? (residuals[residuals.length - 1] - mean) / std : 0;

        let direction = 'NEUTRAL';
        let confidence = 0;
        if (zscore > 2.0) {
            direction = 'SHORT';
            confidence = Math.min((zscore - 2.0) / 1.0, 1.0);
        } else if (zscore < -2.0) {
            direction = 'LONG';
            confidence = Math.min((-zscore - 2.0) / 1.0, 1.0);
        }

        return {
            pair,
            zscore: Math.round(zscore * 10000) / 10000,
            direction,
            confidence: Math.round(confidence * 100),
            lag,
            correlation: Math.round(correlation * 10000) / 10000,
            price: prices[prices.length - 1]?.close || 0,
            signal: 'ACTIVE'
        };
    } catch (error) {
        return {
            pair,
            zscore: 0,
            direction: 'NEUTRAL',
            lag: 0,
            correlation: null,
            price: 0,
            signal: 'ERROR',
            error: error.message
        };
    }
}

// ============================================
// GENERATE SIGNALS FOR ALL PAIRS
// ============================================

async function generateAllSignals() {
    try {
        const allPrices = await fetchAllPrices();
        const btcPrices = allPrices['BTC-USDT-SWAP'];

        if (!btcPrices) {
            throw new Error('Failed to fetch BTC prices');
        }

        const results = {};
        for (const pair of PAIRS) {
            const prices = allPrices[pair];
            if (!prices) {
                results[pair] = {
                    pair,
                    zscore: 0,
                    direction: 'NEUTRAL',
                    lag: 0,
                    correlation: null,
                    price: 0,
                    signal: 'NO_DATA'
                };
                continue;
            }
            results[pair] = generateSignalForPair(pair, prices, btcPrices);
        }
        return results;
    } catch (error) {
        throw new Error(`Signal generation failed: ${error.message}`);
    }
}

module.exports = { PAIRS, generateAllSignals, generateSignalForPair };
