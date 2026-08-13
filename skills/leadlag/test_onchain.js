const { ethers } = require('ethers');

// Connect to X Layer testnet
const provider = new ethers.JsonRpcProvider('https://testrpc.xlayer.tech/terigon');

const WALLET_ADDRESS = '0x21d35b82dFdd91e6A312d4C0Acff276CdE3D2B58';

// REPLACE THIS WITH YOUR ACTUAL PRIVATE KEY
const PRIVATE_KEY = '0x9c5f81515c243e596dc4c6ca99ced95cc2499dfa4a275a1a81ddaf2a38db29fd';

async function sendTestTransaction() {
  try {
    console.log('🔍 Checking connection...');
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Connected to X Layer testnet');
    console.log('Current block:', blockNumber);
    console.log('Wallet:', WALLET_ADDRESS);

    // Check balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    console.log('💰 Balance:', ethers.formatEther(balance), 'OKB');

    // Create wallet from private key
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log('✅ Wallet loaded:', wallet.address);

    // Send a test transaction
    console.log('\n📡 Sending test transaction...');
    const tx = await wallet.sendTransaction({
      to: WALLET_ADDRESS, // Sending to yourself
      value: ethers.parseEther('0.001')
    });

    console.log('✅ Transaction sent!');
    console.log('📊 Transaction hash:', tx.hash);
    console.log('🔗 Explorer: https://www.okx.com/xlayer/explorer/tx/' + tx.hash);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Confirmed! Block:', receipt.blockNumber);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendTestTransaction();
