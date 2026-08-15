const { PAIRS } = require('../data');

/**
 * market-tool.js
 *
 * Returns current market data for specified pair or all pairs.
 * Uses Node's native fetch so deployment does not depend on axios being
 * present in a separate dependency tree. The source remains the live OKX API.
 */
async function getMarketData(pair = null) {
    try {
        const pairs = pair ? [pair] : PAIRS;
        const results = {};

        for (const p of pairs) {
            try {
                const url = new URL('https://www.okx.com/api/v5/market/ticker');
                url.searchParams.set('instId', p);

                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`OKX market API returned HTTP ${response.status}`);
                }

                const body = await response.json();

                if (body.data && body.data[0]) {
                    const ticker = body.data[0];
                    results[p] = {
                        price: parseFloat(ticker.last),
                        volume24h: parseFloat(ticker.vol24h),
                        high24h: parseFloat(ticker.high24h),
                        low24h: parseFloat(ticker.low24h),
                        change24h: parseFloat(ticker.change24h) || 0,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    results[p] = { error: body.msg || 'No market data returned by OKX' };
                }
            } catch (error) {
                results[p] = { error: error.message };
            }

            // Small delay to avoid rate limiting.
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
