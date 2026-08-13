const { generateAllSignals } = require('../signal-engine');
const { PAIRS } = require('../data');

/**
 * signal-tool.js
 * 
 * Returns structured signal data for all pairs.
 * Called by OpenClaw when user asks about signals.
 */
async function getSignals() {
    try {
        const signals = await generateAllSignals();
        
        // Format for OpenClaw
        const result = {
            timestamp: new Date().toISOString(),
            pairs: {},
            activeSignals: [],
            summary: {
                total: PAIRS.length,
                active: 0,
                long: 0,
                short: 0
            }
        };

        for (const pair of PAIRS) {
            const s = signals[pair];
            if (!s) continue;
            
            result.pairs[pair] = {
                zscore: s.zscore || 0,
                direction: s.direction || 'NEUTRAL',
                confidence: s.confidence || 0,
                lag: s.lag || 0,
                correlation: s.correlation || null,
                price: s.price || 0,
                signal: s.signal || 'NO_DATA'
            };

            if (s.signal === 'ACTIVE' && s.direction && s.direction !== 'NEUTRAL') {
                result.activeSignals.push({
                    pair: pair,
                    direction: s.direction,
                    zscore: s.zscore,
                    confidence: s.confidence,
                    price: s.price
                });
                
                result.summary.active++;
                if (s.direction === 'LONG') result.summary.long++;
                if (s.direction === 'SHORT') result.summary.short++;
            }
        }

        return result;
    } catch (error) {
        return { error: error.message };
    }
}

// Export for OpenClaw
module.exports = { getSignals };

// Test directly
if (require.main === module) {
    getSignals().then(data => {
        console.log(JSON.stringify(data, null, 2));
    }).catch(err => {
        console.error(err);
    });
}
