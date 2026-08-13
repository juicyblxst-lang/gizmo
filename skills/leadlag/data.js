const axios = require('axios');

// Your 6 specified pairs
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
        const response = await axios.get('https://www.okx.com/api/v5/market/history-candles', {
            params: {
                instId: pair,
                bar: '1H',
                limit: '168' // 7 days
            }
        });
        
        if (!response.data.data) return null;
        
        return response.data.data.map(candle => ({
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
        // Avoid rate limiting
        await new Promise(r => setTimeout(r, 120));
    }
    return results;
}

module.exports = { PAIRS, fetchPrices, fetchAllPrices };
