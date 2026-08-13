/**
 * LeadLag Tools Index
 * 
 * Exports all tools for OpenClaw to use.
 */
const { getSignals } = require('./signal-tool');
const { getMarketData } = require('./market-tool');
const { getHistory } = require('./history-tool');
const { addMonitor, removeMonitor, getMonitored } = require('./monitor-tool');

module.exports = {
    getSignals,
    getMarketData,
    getHistory,
    addMonitor,
    removeMonitor,
    getMonitored
};
