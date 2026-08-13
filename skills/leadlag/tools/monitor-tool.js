const fs = require('fs');
const path = require('path');

const MONITOR_FILE = '/Users/mac/.openclaw/workspace/monitor/monitored_pairs.json';

/**
 * monitor-tool.js
 * 
 * Adds or removes pairs from monitoring list.
 * Called by OpenClaw when user says "monitor this" or "stop monitoring".
 */
async function addMonitor(pair) {
    try {
        let monitored = [];
        if (fs.existsSync(MONITOR_FILE)) {
            const data = fs.readFileSync(MONITOR_FILE, 'utf8');
            monitored = JSON.parse(data);
        }

        if (!monitored.includes(pair)) {
            monitored.push(pair);
            fs.writeFileSync(MONITOR_FILE, JSON.stringify(monitored, null, 2));
            return { 
                success: true, 
                message: `Added ${pair} to monitoring list`,
                monitored: monitored
            };
        } else {
            return { 
                success: false, 
                message: `${pair} is already being monitored`,
                monitored: monitored
            };
        }
    } catch (error) {
        return { error: error.message };
    }
}

async function removeMonitor(pair) {
    try {
        if (!fs.existsSync(MONITOR_FILE)) {
            return { error: 'No monitored pairs found' };
        }

        const data = fs.readFileSync(MONITOR_FILE, 'utf8');
        let monitored = JSON.parse(data);
        const index = monitored.indexOf(pair);
        
        if (index > -1) {
            monitored.splice(index, 1);
            fs.writeFileSync(MONITOR_FILE, JSON.stringify(monitored, null, 2));
            return { 
                success: true, 
                message: `Removed ${pair} from monitoring list`,
                monitored: monitored
            };
        } else {
            return { 
                success: false, 
                message: `${pair} is not in the monitoring list`,
                monitored: monitored
            };
        }
    } catch (error) {
        return { error: error.message };
    }
}

async function getMonitored() {
    try {
        if (!fs.existsSync(MONITOR_FILE)) {
            return { monitored: [] };
        }
        const data = fs.readFileSync(MONITOR_FILE, 'utf8');
        return { monitored: JSON.parse(data) };
    } catch (error) {
        return { error: error.message };
    }
}

module.exports = { addMonitor, removeMonitor, getMonitored };

if (require.main === module) {
    getMonitored().then(data => {
        console.log(JSON.stringify(data, null, 2));
    }).catch(err => {
        console.error(err);
    });
}
