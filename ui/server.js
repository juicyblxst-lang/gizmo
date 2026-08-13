const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3001;
const SIGNALS_FILE = '/Users/mac/.openclaw/workspace/monitor/signals.json';

app.use(express.json());
app.use(express.static('public'));

app.get('/api/signals', (req, res) => {
    fs.readFile(SIGNALS_FILE, (err, data) => {
        if (err) { res.json([]); return; }
        try { res.json(JSON.parse(data)); }
        catch (e) { res.json([]); }
    });
});

app.post('/api/run', (req, res) => {
    exec('cd /Users/mac/.openclaw/workspace/skills/leadlag && node run.js',
        { timeout: 30000 },
        (error, stdout, stderr) => {
            if (error) {
                res.json({ error: error.message, stderr });
                return;
            }
            res.json({ output: stdout });
        }
    );
});

app.post('/api/execute', (req, res) => {
    const { direction } = req.body;
    // Here you would call your actual transaction function
    // For now, return a placeholder
    res.json({
        success: true,
        txHash: '0x' + Math.random().toString(16).slice(2, 18),
        direction: direction
    });
});

io.on('connection', (socket) => {
    console.log('Client connected');
    fs.readFile(SIGNALS_FILE, (err, data) => {
        if (!err && data) {
            try { socket.emit('signals', JSON.parse(data)); }
            catch (e) {}
        }
    });

    fs.watch(SIGNALS_FILE, () => {
        fs.readFile(SIGNALS_FILE, (err, data) => {
            if (!err && data) {
                try { io.emit('signals', JSON.parse(data)); }
                catch (e) {}
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`🧠 LeadLag Agent UI running at http://localhost:${PORT}`);
    console.log(`📊 Monitoring: ${SIGNALS_FILE}`);
});
// Add after the existing routes

// Tool endpoints
app.get('/api/tools/signals', async (req, res) => {
    try {
        const { getSignals } = require('../skills/leadlag/tools/signal-tool');
        const data = await getSignals();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tools/market', async (req, res) => {
    try {
        const { getMarketData } = require('../skills/leadlag/tools/market-tool');
        const pair = req.query.pair || null;
        const data = await getMarketData(pair);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tools/history', async (req, res) => {
    try {
        const { getHistory } = require('../skills/leadlag/tools/history-tool');
        const limit = parseInt(req.query.limit) || 20;
        const data = await getHistory(limit);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tools/monitor', async (req, res) => {
    try {
        const { addMonitor } = require('../skills/leadlag/tools/monitor-tool');
        const { pair } = req.body;
        if (!pair) {
            res.status(400).json({ error: 'Pair required' });
            return;
        }
        const data = await addMonitor(pair);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
