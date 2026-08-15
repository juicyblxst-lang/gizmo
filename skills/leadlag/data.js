// Live market data source for the six supported pairs.
// Uses Node's native fetch so the deployed backend does not depend on axios.

const PAIRS = [
    'BTC-USDT-SWAP',
    'ETH-USDT-SWAP',
    'SOL-USDT-SWAP',
    'XRP-USDT-SWAP',
    'DOGE-USDT-SWAP',
    'HYPE-USDT-SWAP'
];

async function fetchPrices(pair) {
    try {
        const url = new URL('https://www.okx.com/api/v5/market/history-candles');
        url.searchParams.set('instId', pair);
        url.searchParams.set('bar', '1H');
        url.searchParams.set('limit', '168'); // 7 days

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`OKX history API returned HTTP ${response.status}`);
        }

        const body = await response.json();
        if (!body.data) return null;

        return body.data.map(candle => ({
            timestamp: parseInt(candle[0]),
            close: parseFloat(candle[4])
        }));
    } catch (error) {
        console.error(`Failed to fetch ${pair}:`, error.message);
        return null;
    }
}

async function fetchAllPrices() {
    const results = {};
    for (const pair of PAIRS) {
        const prices = await fetchPrices(pair);
        if (prices) results[pair] = prices;
        // Avoid rate limiting.
        await new Promise(r => setTimeout(r, 120));
    }
    return results;
}

module.exports = { PAIRS, fetchPrices, fetchAllPrices };
