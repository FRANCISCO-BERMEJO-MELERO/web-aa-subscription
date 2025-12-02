const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require('readline');

/**
 * Script to predict smart account address
 * Uses the same salt (0) as the web frontend
 */

async function promptForAddress() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter EOA address (or press Enter for default Hardhat account): ', (answer) => {
            rl.close();
            resolve(answer.trim() || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
        });
    });
}

async function main() {
    // Get EOA address from environment variable or prompt
    let eoaAddress = process.env.EOA_ADDRESS;

    if (!eoaAddress) {
        eoaAddress = await promptForAddress();
    }

    // Validate address format
    if (!eoaAddress || !eoaAddress.startsWith('0x') || eoaAddress.length !== 42) {
        console.error('❌ Error: Invalid EOA address format');
        console.log('\nAddress must be 42 characters starting with 0x');
        process.exit(1);
    }

    console.log('\n🔮 Predicting Smart Account Address\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Load deployment info
    const deploymentPath = path.join(__dirname, "..", "deployments", "localhost.json");
    if (!fs.existsSync(deploymentPath)) {
        console.error('❌ Error: Deployment file not found');
        console.log('Please run: npm run deploy');
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const factoryAddress = deployment.contracts.SimpleAccountFactory;

    if (!factoryAddress) {
        console.error('❌ Error: SimpleAccountFactory not found in deployment');
        process.exit(1);
    }

    console.log('📋 Configuration:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`EOA Address:     ${eoaAddress}`);
    console.log(`Factory Address: ${factoryAddress}`);
    console.log(`Salt:            0 (same as web frontend)`);
    console.log('');

    // Get factory contract
    const factory = await hre.ethers.getContractAt("SimpleAccountFactory", factoryAddress);

    // Use salt 0 (same as web frontend)
    const salt = 0;

    try {
        // Predict account address
        console.log('🔍 Calculating counterfactual address...\n');
        const predictedAddress = await factory.getAddress(eoaAddress, salt);

        console.log('✅ Prediction Complete!\n');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('📍 Smart Account Address:');
        console.log(`   ${predictedAddress}`);
        console.log('');

        // Check if account is already deployed
        const code = await hre.ethers.provider.getCode(predictedAddress);
        const isDeployed = code !== '0x';

        console.log('📊 Deployment Status:');
        console.log('─────────────────────────────────────────────────────────────');
        if (isDeployed) {
            console.log('   ✅ DEPLOYED - Account exists on-chain');

            // Get account details
            const account = await hre.ethers.getContractAt("SimpleAccount", predictedAddress);
            const owner = await account.owner();
            const balance = await hre.ethers.provider.getBalance(predictedAddress);

            console.log('');
            console.log('📝 Account Details:');
            console.log('─────────────────────────────────────────────────────────────');
            console.log(`   Owner:   ${owner}`);
            console.log(`   Balance: ${hre.ethers.formatEther(balance)} ETH`);

            if (owner.toLowerCase() !== eoaAddress.toLowerCase()) {
                console.log('');
                console.log('⚠️  WARNING: Account owner does not match provided EOA!');
                console.log(`   Expected: ${eoaAddress}`);
                console.log(`   Actual:   ${owner}`);
            }
        } else {
            console.log('   ⏳ NOT DEPLOYED - Counterfactual address only');
            console.log('');
            console.log('💡 To deploy this account:');
            console.log('   1. Connect wallet with this EOA in the web app');
            console.log('   2. Click "Create Smart Account"');
            console.log('   3. Or call factory.createAccount() directly');
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // Additional info
        console.log('ℹ️  Additional Information:');
        console.log('─────────────────────────────────────────────────────────────');
        console.log(`   EntryPoint:     ${deployment.contracts.EntryPoint}`);
        console.log(`   Implementation: ${deployment.contracts.SimpleAccountImplementation}`);
        console.log('');

    } catch (error) {
        console.error('❌ Error predicting address:', error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
