const axios = require('axios');
const ONCHAINOS_API_KEY = process.env.ONCHAINOS_API_KEY;

async function test() {
    try {
        console.log('Testing OnchainOS health endpoint...');
        const response = await axios.get('https://web3.okx.com/health', {
            headers: {
                'Authorization': `Bearer ${ONCHAINOS_API_KEY}`
            }
        });
        console.log('✅ Connected!', response.status);
    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
    }
}
test();
