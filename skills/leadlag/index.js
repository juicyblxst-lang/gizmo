module.exports = {
  async run(agent, ...args) {
    const axios = require('axios');
    
    // Fetch BTC and SOL prices from OKX
    async function fetchPrices() {
      const btcRes = await axios.get('https://www.okx.com/api/v5/market/history-candles', {
        params: { instId: 'BTC-USDT-SWAP', bar: '1H', limit: '168' }
      });
      const solRes = await axios.get('https://www.okx.com/api/v5/market/history-candles', {
        params: { instId: 'SOL-USDT-SWAP', bar: '1H', limit: '168' }
      });
      
      const btcPrices = btcRes.data.data.map(c => ({ timestamp: parseInt(c[0]), close: parseFloat(c[4]) }));
      const solPrices = solRes.data.data.map(c => ({ timestamp: parseInt(c[0]), close: parseFloat(c[4]) }));
      return { btcPrices, solPrices };
    }

    // Calculate log returns
    function logReturns(prices) {
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        if (prices[i-1].close > 0 && prices[i].close > 0) {
          returns.push({ timestamp: prices[i].timestamp, return: Math.log(prices[i].close / prices[i-1].close) });
        }
      }
      return returns;
    }

    // Pearson correlation
    function pearson(x, y) {
      if (x.length !== y.length || x.length < 3) return null;
      const mx = x.reduce((a,b) => a + b, 0) / x.length;
      const my = y.reduce((a,b) => a + b, 0) / y.length;
      const numerator = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
      const dx = Math.sqrt(x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0));
      const dy = Math.sqrt(y.reduce((sum, yi) => sum + (yi - my) ** 2, 0));
      if (dx === 0 || dy === 0) return null;
      return numerator / (dx * dy);
    }

    // Find best lag
    function findBestLag(btcReturns, solReturns) {
      let bestLag = 1;
      let bestCorr = -Infinity;
      for (let lag = 1; lag <= 24; lag++) {
        const pairs = [];
        for (let i = 0; i < btcReturns.length - lag; i++) {
          pairs.push({ btc: btcReturns[i].return, sol: solReturns[i + lag].return });
        }
        if (pairs.length < 20) continue;
        const x = pairs.map(p => p.btc);
        const y = pairs.map(p => p.sol);
        const corr = pearson(x, y);
        if (corr !== null && Math.abs(corr) > Math.abs(bestCorr)) {
          bestCorr = corr;
          bestLag = lag;
        }
      }
      return { lag: bestLag, correlation: bestCorr };
    }

    // Linear regression
    function linearRegression(x, y) {
      const mx = x.reduce((a,b) => a + b, 0) / x.length;
      const my = y.reduce((a,b) => a + b, 0) / y.length;
      const numerator = x.reduce((sum, xi, i) => sum + (xi - mx) * (y[i] - my), 0);
      const denominator = x.reduce((sum, xi) => sum + (xi - mx) ** 2, 0);
      if (denominator === 0) return { alpha: 0, beta: 0 };
      const beta = numerator / denominator;
      const alpha = my - beta * mx;
      return { alpha, beta };
    }

    // Main
    try {
      const prices = await fetchPrices();
      const btcReturns = logReturns(prices.btcPrices);
      const solReturns = logReturns(prices.solPrices);
      
      const { lag, correlation } = findBestLag(btcReturns, solReturns);
      
      // Align data for regression
      const pairs = [];
      for (let i = 0; i < btcReturns.length - lag; i++) {
        pairs.push({ btc: btcReturns[i].return, sol: solReturns[i + lag].return });
      }
      const x = pairs.map(p => p.btc);
      const y = pairs.map(p => p.sol);
      const { alpha, beta } = linearRegression(x, y);
      
      // Calculate residuals
      const residuals = pairs.map((p, i) => {
        const expected = alpha + beta * p.btc;
        return p.sol - expected;
      });
      
      // Z-score (last 168 hours)
      const window = 168;
      const recent = residuals.slice(-window);
      const mean = recent.reduce((a,b) => a + b, 0) / recent.length;
      const variance = recent.reduce((a,b) => a + (b - mean) ** 2, 0) / recent.length;
      const std = Math.sqrt(variance);
      const zscore = std > 0 ? (residuals[residuals.length - 1] - mean) / std : 0;
      
      // Determine direction
      let direction = 'NEUTRAL';
      let confidence = 0;
      if (zscore > 2.0) { direction = 'SHORT'; confidence = Math.min((zscore - 2.0) / 1.0, 1.0); }
      else if (zscore < -2.0) { direction = 'LONG'; confidence = Math.min((-zscore - 2.0) / 1.0, 1.0); }
      
      const response = `
📊 BTC/SOL LEAD-LAG SIGNAL

🔄 Lag: ${lag}H
📈 Correlation: ${correlation.toFixed(4)}
📐 Alpha: ${alpha.toFixed(6)} | Beta: ${beta.toFixed(6)}
📉 Z-Score: ${zscore.toFixed(2)}
🎯 Direction: ${direction}
💪 Confidence: ${(confidence * 100).toFixed(0)}%
💰 BTC: $${prices.btcPrices[prices.btcPrices.length-1].close.toFixed(2)}
💰 SOL: $${prices.solPrices[prices.solPrices.length-1].close.toFixed(2)}
📊 Residuals: ${residuals.length} observations

${Math.abs(zscore) > 2.0 ? '🚨 SIGNAL ALERT: Z-score threshold crossed!' : '✓ No threshold crossed. Monitoring...'}
`;
      
      return { content: response };
    } catch (error) {
      return { content: `❌ Error: ${error.message}` };
    }
  }
};
