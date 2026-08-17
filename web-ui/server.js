const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 8080;
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
    const { exec } = require('child_process');
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

// Workspace intelligence bridge. Existing endpoints remain unchanged.
app.post('/api/agent/chat', async (req, res) => {
    try {
        const { processConversation } = require('../skills/leadlag/workspace-intelligence');
        const result = await processConversation(Array.isArray(req.body?.messages) ? req.body.messages : []);
        res.json(result);
    } catch (error) {
        res.status(500).json({ handled: true, error: error.message, response: 'The Gizmo intelligence engine failed to respond. I did not substitute invented market data.' });
    }
});
