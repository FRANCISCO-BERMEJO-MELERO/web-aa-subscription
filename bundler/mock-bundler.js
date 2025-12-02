const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const entryPointArtifact = require('../artifacts/@account-abstraction/contracts/core/EntryPoint.sol/EntryPoint.json');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

// Bundler signer (puede venir de una private key fija de Hardhat)
const BUNDLER_PRIVATE_KEY =
    process.env.BUNDLER_PRIVATE_KEY ||
    // Primera cuenta por defecto de Hardhat (solo para entorno local)
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const bundlerWallet = new ethers.Wallet(BUNDLER_PRIVATE_KEY, provider);

// Mock bundler state
const userOperations = [];
let nonce = 0;

// Load EntryPoint address from deployment
let ENTRYPOINT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Default fallback
let entryPoint;

try {
    const deploymentPath = path.join(__dirname, '..', 'deployments', 'localhost.json');
    if (fs.existsSync(deploymentPath)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        ENTRYPOINT_ADDRESS = deployment.contracts.EntryPoint;
        console.log('✅ Loaded EntryPoint from deployment:', ENTRYPOINT_ADDRESS);

        // Usamos el provider para lecturas y conectamos el wallet sólo para las tx
        entryPoint = new ethers.Contract(ENTRYPOINT_ADDRESS, entryPointArtifact.abi, provider);
    }
} catch (error) {
    console.warn('⚠️  Could not load EntryPoint from deployment, using default');
}

/**
 * Simple Bundler - ERC-4337 Bundler for local testing
 *
 * Este bundler recibe UserOperations y las reenvía al EntryPoint real
 * llamando a handleOps en la red local de Hardhat.
 */

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', bundler: 'mock-bundler-v1', entryPoint: ENTRYPOINT_ADDRESS });
});

// Get supported EntryPoints
app.post('/rpc', async (req, res) => {
    const { method, params, id } = req.body;

    console.log(`📨 RPC Request: ${method}`);

    try {
        switch (method) {
            case 'eth_supportedEntryPoints':
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    result: [ENTRYPOINT_ADDRESS]
                });

            case 'eth_sendUserOperation':
                return handleSendUserOperation(req, res, params, id);

            case 'eth_estimateUserOperationGas':
                return handleEstimateGas(req, res, params, id);

            case 'eth_getUserOperationByHash':
                return handleGetUserOperation(req, res, params, id);

            case 'eth_getUserOperationReceipt':
                return handleGetUserOperationReceipt(req, res, params, id);

            default:
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32601,
                        message: `Method ${method} not supported`
                    }
                });
        }
    } catch (error) {
        console.error('❌ Error:', error);
        return res.json({
            jsonrpc: '2.0',
            id,
            error: {
                code: -32603,
                message: error.message
            }
        });
    }
});

async function handleSendUserOperation(req, res, params, id) {
    const [userOp] = params;

    console.log('📤 eth_sendUserOperation:', {
        sender: userOp.sender,
        nonce: userOp.nonce,
        callData: (userOp.callData || '').slice(0, 20) + '...'
    });

    try {
        if (!entryPoint) {
            throw new Error('EntryPoint contract not initialized');
        }

        // Calcular hash real de la UserOperation usando el EntryPoint
        const userOpHash = await entryPoint.getUserOpHash(userOp);

        // Beneficiario de las fees: el propio bundler
        const beneficiary = bundlerWallet.address;

        const tx = await entryPoint
            .connect(bundlerWallet)
            .handleOps([userOp], beneficiary);
        const receipt = await tx.wait();

        userOperations.push({
            hash: userOpHash,
            userOp,
            entryPoint: ENTRYPOINT_ADDRESS,
            timestamp: Date.now(),
            status: 'included',
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        });

        console.log('✅ UserOperation incluida en tx:', tx.hash);

        return res.json({
            jsonrpc: '2.0',
            id,
            result: userOpHash
        });
    } catch (error) {
        console.error('❌ Error ejecutando UserOp via EntryPoint:', error);
        return res.json({
            jsonrpc: '2.0',
            id,
            error: {
                code: -32603,
                message: error.message
            }
        });
    }
}

async function handleEstimateGas(req, res, params, id) {
    const [userOp, entryPoint] = params;

    console.log('⛽ Estimating gas for UserOperation');

    // Return mock gas estimates
    return res.json({
        jsonrpc: '2.0',
        id,
        result: {
            preVerificationGas: '0x186a0', // 100000
            verificationGasLimit: '0x186a0', // 100000
            callGasLimit: '0x186a0' // 100000
        }
    });
}

async function handleGetUserOperation(req, res, params, id) {
    const [userOpHash] = params;

    console.log('🔍 Getting UserOperation:', userOpHash);

    const op = userOperations.find(o => o.hash === userOpHash);

    if (!op) {
        return res.json({
            jsonrpc: '2.0',
            id,
            result: null
        });
    }

    return res.json({
        jsonrpc: '2.0',
        id,
        result: {
            userOperation: op.userOp,
            entryPoint: op.entryPoint,
            blockNumber: ethers.toQuantity(op.blockNumber || 0),
            blockHash: op.txHash || '0x0',
            transactionHash: op.txHash || '0x0'
        }
    });
}

async function handleGetUserOperationReceipt(req, res, params, id) {
    const [userOpHash] = params;

    console.log('🧾 Getting UserOperation receipt:', userOpHash);

    const op = userOperations.find(o => o.hash === userOpHash);

    if (!op || op.status === 'pending') {
        return res.json({
            jsonrpc: '2.0',
            id,
            result: null
        });
    }

    return res.json({
        jsonrpc: '2.0',
        id,
        result: {
            userOpHash: op.hash,
            sender: op.userOp.sender,
            nonce: op.userOp.nonce,
            actualGasCost: '0x5208', // 21000
            actualGasUsed: '0x5208',
            success: op.status === 'included',
            logs: [],
            receipt: {
                transactionHash: op.txHash,
                blockNumber: ethers.toQuantity(op.blockNumber || 0),
                status: op.status === 'included' ? '0x1' : '0x0'
            }
        }
    });
}

// Start server
const PORT = process.env.PORT || 4337;
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Mock Bundler Started');
    console.log('========================');
    console.log(`📡 Listening on: http://localhost:${PORT}`);
    console.log(`🔗 EntryPoint: ${ENTRYPOINT_ADDRESS}`);
    console.log(`🌐 RPC Endpoint: http://localhost:${PORT}/rpc`);
    console.log('');
    console.log('✅ Ready to accept UserOperations');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down mock bundler...');
    process.exit(0);
});
