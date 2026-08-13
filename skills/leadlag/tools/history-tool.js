const fs = require('fs');
const path = require('path');

const SIGNALS_FILE = '/Users/mac/.openclaw/workspace/monitor/signals.json';

/**
 * history-tool.js
 * 
 * Returns signal history from the database.
 * Called by OpenClaw when user asks about past signals.
 */
async function getHistory(limit = 20, pair = null) {
    try {
        if (!fs.existsSync(SIGNALS_FILE)) {
            return { error: 'No signals recorded yet' };
        }

        const data = fs.readFileSync(SIGNALS_FILE, 'utf8');
        let signals = JSON.parse(data);

        // Filter by pair if specified
        if (pair) {
            signals = signals.filter(s => s.pair === pair);
        }

        // Sort by timestamp descending
        signals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Limit results
        const limited = signals.slice(0, limit);

        return {
            total: signals.length,
            returned: limited.length,
            pair: pair || 'all',
            signals: limited.map(s => ({
                timestamp: s.timestamp,
                pair: s.pair || 'BTC-USDT-SWAP',
                zscore: s.zscore || 0,
                direction: s.direction || 'NEUTRAL',
                confidence: s.confidence || 0,
                price: s.price || 0
            }))
        };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = { getHistory };

if (require.main === module) {
    getHistory(5).then(data => {
        console.log(JSON.stringify(data, null, 2));
    }).catch(err => {
        console.error(err);
    });
}
