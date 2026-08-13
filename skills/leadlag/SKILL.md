---
name: leadlag
description: BTC/SOL lead-lag signal generator. Fetches prices from OKX, calculates correlation, regression, residuals, and z-score.
triggers:
  - leadlag
  - btc sol signal
  - z-score
  - lead lag
---

# Lead-Lag Signal Generator

This skill analyzes the lead-lag relationship between BTC and SOL using OKX data.

## How It Works

1. Fetches 168 hours of BTC and SOL price data from OKX
2. Calculates log returns
3. Finds the best lag (1-24 hours) using Pearson correlation
4. Fits linear regression model: SOL = α + β*BTC
5. Calculates residuals and rolling z-score
6. Determines trade direction based on z-score threshold (±2.0)

## Usage

cat > run.js << 'EOF'
const axios = require('axios');

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

function logReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1].close > 0 && prices[i].close > 0) {
      returns.push({ timestamp: prices[i].timestamp, return: Math.log(prices[i].close / prices[i-1].close) });
    }
  }
  return returns;
}

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

async function generateSignal() {
  try {
    const prices = await fetchPrices();
    const btcReturns = logReturns(prices.btcPrices);
    const solReturns = logReturns(prices.solPrices);
    
    const { lag, correlation } = findBestLag(btcReturns, solReturns);
    
    const pairs = [];
    for (let i = 0; i < btcReturns.length - lag; i++) {
      pairs.push({ btc: btcReturns[i].return, sol: solReturns[i + lag].return });
    }
    const x = pairs.map(p => p.btc);
    const y = pairs.map(p => p.sol);
    const { alpha, beta } = linearRegression(x, y);
    
    const residuals = pairs.map((p) => {
      const expected = alpha + beta * p.btc;
      return p.sol - expected;
    });
    
    const window = 168;
    const recent = residuals.slice(-window);
    const mean = recent.reduce((a,b) => a + b, 0) / recent.length;
    const variance = recent.reduce((a,b) => a + (b - mean) ** 2, 0) / recent.length;
    const std = Math.sqrt(variance);
    const zscore = std > 0 ? (residuals[residuals.length - 1] - mean) / std : 0;
    
    let direction = 'NEUTRAL';
    let confidence = 0;
    if (zscore > 2.0) { direction = 'SHORT'; confidence = Math.min((zscore - 2.0) / 1.0, 1.0); }
    else if (zscore < -2.0) { direction = 'LONG'; confidence = Math.min((-zscore - 2.0) / 1.0, 1.0); }
    
    return {
      lag,
      correlation,
      alpha,
      beta,
      zscore,
      direction,
      confidence,
      btcPrice: prices.btcPrices[prices.btcPrices.length-1].close,
      solPrice: prices.solPrices[prices.solPrices.length-1].close,
      observations: residuals.length,
      alert: Math.abs(zscore) > 2.0
    };
  } catch (error) {
    throw new Error(`Signal generation failed: ${error.message}`);
  }
}

// Export for OpenClaw
module.exports = { generateSignal };

// If run directly
if (require.main === module) {
  generateSignal().then(signal => {
    console.log(JSON.stringify(signal, null, 2));
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
