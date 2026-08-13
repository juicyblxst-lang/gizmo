const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const SIGNALS_FILE = path.join(__dirname, 'signals.json');
const LOG_FILE = path.join(__dirname, 'monitor.log');

// Function to log messages
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(logMessage);
}

// Function to run the leadlag skill
function runLeadlag() {
  return new Promise((resolve) => {
    exec('node /Users/mac/.openclaw/workspace/skills/leadlag/run.js', 
      { timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          log(`❌ Error: ${error.message}`);
          resolve(null);
          return;
        }
        if (stderr) {
          log(`⚠️ Stderr: ${stderr}`);
        }
        resolve(stdout);
      }
    );
  });
}

// Function to parse the output and extract signal data
function parseSignal(output) {
  if (!output) return null;
  
  const data = {
    timestamp: new Date().toISOString(),
    fullOutput: output
  };
  
  // Extract key metrics with regex
  const lagMatch = output.match(/BTC leads SOL by (\d+) hours/);
  if (lagMatch) data.lag = parseInt(lagMatch[1]);
  
  const corrMatch = output.match(/correlation of ([\d.]+)/);
  if (corrMatch) data.correlation = parseFloat(corrMatch[1]);
  
  const zMatch = output.match(/z-score is ([\d.]+)/);
  if (zMatch) data.zscore = parseFloat(zMatch[1]);
  
  const signalMatch = output.match(/signal at this time/i);
  data.hasSignal = !signalMatch;
  
  if (output.includes('LONG')) data.direction = 'LONG';
  else if (output.includes('SHORT')) data.direction = 'SHORT';
  else data.direction = 'NEUTRAL';
  
  const priceMatch = output.match(/BTC at \$(\d+), SOL at \$([\d.]+)/);
  if (priceMatch) {
    data.btcPrice = parseFloat(priceMatch[1]);
    data.solPrice = parseFloat(priceMatch[2]);
  }
  
  const txMatch = output.match(/Transaction hash: (0x[a-fA-F0-9]+)/);
  if (txMatch) data.txHash = txMatch[1];
  
  return data;
}

// Function to save signal data
function saveSignal(data) {
  try {
    let signals = [];
    if (fs.existsSync(SIGNALS_FILE)) {
      const content = fs.readFileSync(SIGNALS_FILE, 'utf8');
      signals = JSON.parse(content);
    }
    
    signals.push(data);
    
    // Keep only last 1000 signals
    if (signals.length > 1000) {
      signals = signals.slice(-1000);
    }
    
    fs.writeFileSync(SIGNALS_FILE, JSON.stringify(signals, null, 2));
    log(`✅ Signal saved (Total: ${signals.length})`);
  } catch (error) {
    log(`❌ Failed to save signal: ${error.message}`);
  }
}

// Main monitoring function
async function monitor() {
  log('🔍 Running leadlag signal check...');
  
  try {
    const output = await runLeadlag();
    
    if (output) {
      console.log('Output:', output);
      const data = parseSignal(output);
      
      if (data) {
        data.timestamp = new Date().toISOString();
        saveSignal(data);
        
        if (data.hasSignal) {
          log(`🚨 SIGNAL DETECTED! Direction: ${data.direction}, Z-score: ${data.zscore}`);
        } else {
          log(`✅ No signal. Z-score: ${data.zscore || 'N/A'}`);
        }
      }
    } else {
      log('⚠️ No output from leadlag skill');
    }
  } catch (error) {
    log(`❌ Monitoring error: ${error.message}`);
  }
}

// Run the monitor
monitor();

// Export for use in other scripts
module.exports = { monitor, runLeadlag, parseSignal, saveSignal };
