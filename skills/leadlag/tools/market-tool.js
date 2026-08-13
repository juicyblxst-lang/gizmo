const axios = require('axios');
const { PAIRS } = require('../data');

/**
 * market-tool.js
 * 
 * Returns current market data for specified pair or all pairs.
 * Called by OpenClaw when user asks about prices.
 */
async function getMarketData(pair = null) {
    try {
        const pairs = pair ? [pair] : PAIRS;
        const results = {};

        for (const p of pairs) {
            try {
                const response = await axios.get('https://www.okx.com/api/v5/market/ticker', {
                    params: { instId: p }
                });
                
                if (response.data.data && response.data.data[0]) {
                    const ticker = response.data.data[0];
                    results[p] = {
                        price: parseFloat(ticker.last),
                        volume24h: parseFloat(ticker.vol24h),
                        high24h: parseFloat(ticker.high24h),
                        low24h: parseFloat(ticker.low24h),
                        change24h: parseFloat(ticker.change24h) || 0,
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (error) {
                results[p] = { error: error.message };
            }
            
            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 100));
        }

        return pair ? results[pair] : results;
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = { getMarketData };

if (require.main === module) {
    getMarketData('ETH-USDT-SWAP').then(data => {
        console.log(JSON.stringify(data, null, 2));
    }).catch(err => {
        console.error(err);
    });
}
