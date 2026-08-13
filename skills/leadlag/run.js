const { processMessage } = require('./agent-brain');

async function generateSignal(message) {
    try {
        const userMessage = message || 'signals';
        const result = await processMessage(userMessage);
        return { content: result.response };
    } catch (error) {
        return { content: `❌ Error: ${error.message}` };
    }
}

if (require.main === module) {
    const message = process.argv[2] || 'signals';
    generateSignal(message).then(result => {
        console.log(result.content);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { generateSignal };
