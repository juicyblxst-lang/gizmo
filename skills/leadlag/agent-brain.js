const { getSignals } = require('./tools/signal-tool');
const { getMarketData } = require('./tools/market-tool');
const { getHistory } = require('./tools/history-tool');
const { addMonitor, getMonitored } = require('./tools/monitor-tool');

/**
 * Agent Brain — The Intelligence Layer
 * 
 * This file handles:
 * 1. Intent detection
 * 2. Tool routing
 * 3. Response formatting
 */

// ============================================
// INTENT DETECTION
// ============================================

function detectIntent(message) {
    const lower = message.toLowerCase().trim();
    
    // Greeting detection
    if (lower.match(/^(hello|hi|hey|good morning|good afternoon|good evening|yo|sup|what's up|howdy)/i)) {
        return { type: 'greeting' };
    }
    
    // Help detection
    if (lower.match(/^(help|what can you do|how do you work|guide|commands|capabilities)/i)) {
        return { type: 'help' };
    }
    
    // Signal detection
    if (lower.match(/^(signal|signals|active signals|current signals|z-score|zscore|leadlag)/i)) {
        return { type: 'signals' };
    }
    
    // Market price detection
    if (lower.match(/^(price|market|price of|current price|ticker|value|cost|worth|how much is)/i)) {
        const pairMatch = lower.match(/\b(btc|eth|sol|xrp|doge|hype)\b/i);
        const pair = pairMatch ? pairMatch[1].toUpperCase() : null;
        return { type: 'market', pair: pair };
    }
    
    // History detection
    if (lower.match(/^(history|past signals|previous signals|signal history|historical)/i)) {
        return { type: 'history' };
    }
    
    // Monitor detection
    if (lower.match(/^(monitor|watch|track|start monitoring|add to watchlist)/i)) {
        const pairMatch = lower.match(/\b(btc|eth|sol|xrp|doge|hype)\b/i);
        const pair = pairMatch ? pairMatch[1].toUpperCase() : null;
        return { type: 'monitor', pair: pair };
    }
    
    // Status detection
    if (lower.match(/^(status|health|check|how are you|is it working)/i)) {
        return { type: 'status' };
    }
    
    // Unknown
    return { type: 'unknown' };
}

// ============================================
// TOOL ROUTER
// ============================================

async function routeIntent(intent) {
    switch (intent.type) {
        case 'greeting':
            return handleGreeting(intent);
            
        case 'help':
            return handleHelp(intent);
            
        case 'signals':
            return handleSignals(intent);
            
        case 'market':
            return handleMarket(intent);
            
        case 'history':
            return handleHistory(intent);
            
        case 'monitor':
            return handleMonitor(intent);
            
        case 'status':
            return handleStatus(intent);
            
        case 'unknown':
        default:
            return handleUnknown(intent);
    }
}

// ============================================
// INTENT HANDLERS
// ============================================

function handleGreeting(intent) {
    return {
        success: true,
        response: "Hello! I'm LeadLag. I analyze lead-lag relationships between BTC, ETH, SOL, XRP, DOGE, and HYPE.\n\nTry asking: 'signals', 'market ETH', 'history', or 'help'."
    };
}

function handleHelp(intent) {
    return {
        success: true,
        response: `📖 Commands I understand:

🔹 "signals" — Show current signals across all pairs
🔹 "market [pair]" — Show price data (e.g., "market ETH")
🔹 "history" — Show past signals
🔹 "monitor [pair]" — Start monitoring a pair
🔹 "status" — Check if the system is running
🔹 "help" — Show this guide

All data comes from OKX. No invented numbers.`
    };
}

async function handleSignals(intent) {
    try {
        const data = await getSignals();
        const active = data.activeSignals || [];
        
        if (active.length === 0) {
            return {
                success: true,
                response: "✅ No active signals. All z-scores are within normal range (±2.0)."
            };
        }
        
        let response = `🚨 ${active.length} active signal(s) detected:\n\n`;
        for (const s of active) {
            const emoji = s.direction === 'LONG' ? '📈' : '📉';
            response += `${emoji} ${s.pair}\n`;
            response += `   Direction: ${s.direction} (${s.confidence}% confidence)\n`;
            response += `   Z-Score: ${s.zscore.toFixed(2)}\n`;
            response += `   Price: $${s.price.toFixed(2)}\n\n`;
        }
        return { success: true, response: response };
    } catch (error) {
        return { success: false, response: `❌ Error fetching signals: ${error.message}` };
    }
}

async function handleMarket(intent) {
    const pair = intent.pair ? `${intent.pair}-USDT-SWAP` : 'ETH-USDT-SWAP';
    try {
        const data = await getMarketData(pair);
        if (!data || data.error) {
            return { success: false, response: `❌ Could not fetch data for ${pair}` };
        }
        return {
            success: true,
            response: `📊 ${pair}\nPrice: $${data.price || 'N/A'}\n24h Volume: $${(data.volume24h || 0).toLocaleString()}\n24h High: $${data.high24h || 'N/A'}\n24h Low: $${data.low24h || 'N/A'}\nChange: ${data.change24h || 0}%`
        };
    } catch (error) {
        return { success: false, response: `❌ Error fetching market data: ${error.message}` };
    }
}

async function handleHistory(intent) {
    try {
        const data = await getHistory(10);
        if (data.signals.length === 0) {
            return { success: true, response: "📜 No signals recorded yet." };
        }
        let response = "📜 Last 10 signals:\n\n";
        for (const s of data.signals) {
            const dir = s.direction || 'NEUTRAL';
            response += `• ${s.pair}: ${dir} (Z: ${s.zscore.toFixed(2)}) — ${new Date(s.timestamp).toLocaleString()}\n`;
        }
        return { success: true, response: response };
    } catch (error) {
        return { success: false, response: `❌ Error fetching history: ${error.message}` };
    }
}

async function handleMonitor(intent) {
    if (!intent.pair) {
        return {
            success: true,
            response: "Which pair would you like to monitor? Try: 'monitor ETH' or 'monitor SOL'."
        };
    }
    const pair = `${intent.pair}-USDT-SWAP`;
    try {
        const result = await addMonitor(pair);
        if (result.success) {
            return { success: true, response: `✅ ${result.message}` };
        } else {
            return { success: true, response: `⚠️ ${result.message}` };
        }
    } catch (error) {
        return { success: false, response: `❌ Error updating monitoring: ${error.message}` };
    }
}

async function handleStatus(intent) {
    try {
        const signals = await getSignals();
        const monitored = await getMonitored();
        const totalPairs = signals.pairs ? Object.keys(signals.pairs).length : 0;
        const activeSignals = signals.activeSignals ? signals.activeSignals.length : 0;
        
        return {
            success: true,
            response: `📊 System Status\n\n✅ OpenClaw: Running\n✅ Tools: ${totalPairs} pairs loaded\n✅ Signals: ${activeSignals} active\n✅ Monitoring: ${monitored.monitored ? monitored.monitored.join(', ') : 'none'}\n✅ Wallet: 0x21d35b82...dFdd91e6\n🌐 Network: X Layer testnet\n🕐 ${new Date().toISOString()}`
        };
    } catch (error) {
        return { success: false, response: `❌ Error checking status: ${error.message}` };
    }
}

function handleUnknown(intent) {
    return {
        success: true,
        response: "I didn't understand that. Try: 'signals', 'market ETH', 'history', 'monitor SOL', or 'help'."
    };
}

// ============================================
// MAIN ENTRY POINT
// ============================================

async function processMessage(message) {
    const intent = detectIntent(message);
    const result = await routeIntent(intent);
    return result;
}

module.exports = { processMessage, detectIntent };

// ============================================
// TEST DIRECTLY
// ============================================

if (require.main === module) {
    const testMessages = [
        "hello",
        "signals",
        "market ETH",
        "history",
        "monitor SOL",
        "status",
        "help",
        "what's the price of BTC",
        "something random"
    ];
    
    (async function test() {
        for (const msg of testMessages) {
            console.log(`\n👤 ${msg}`);
            const result = await processMessage(msg);
            console.log(`🤖 ${result.response}`);
            console.log('---');
        }
    })();
}
