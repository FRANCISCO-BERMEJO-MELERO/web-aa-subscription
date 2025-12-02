const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

// Mock bundler state
const userOperations = [];
let nonce = 0;

// EntryPoint address (standard v0.7)
const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

/**
 * Mock Bundler - Simplified ERC-4337 Bundler for Testing
 * 
 * This is a simplified bundler that simulates ERC-4337 UserOperation handling
 * for local development and testing purposes.
 */

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', bundler: 'mock-bundler-v1' });
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
    const [userOp, entryPoint] = params;

    console.log('📤 Sending UserOperation:', {
        sender: userOp.sender,
        nonce: userOp.nonce,
        callData: userOp.callData?.slice(0, 20) + '...'
    });

    // Simulate UserOperation processing
    const userOpHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'uint256', 'bytes'],
            [userOp.sender, Date.now(), userOp.callData || '0x']
        )
    );

    // Store UserOperation
    userOperations.push({
        hash: userOpHash,
        userOp,
        entryPoint,
        timestamp: Date.now(),
        status: 'pending'
    });

    // Simulate async execution
    setTimeout(async () => {
        try {
            // In a real bundler, this would submit to EntryPoint
            // For mock, we'll simulate successful execution
            const op = userOperations.find(o => o.hash === userOpHash);
            if (op) {
                op.status = 'included';
                op.txHash = ethers.keccak256(ethers.toUtf8Bytes(`tx-${userOpHash}`));
                op.blockNumber = await provider.getBlockNumber();
                console.log('✅ UserOperation executed:', userOpHash);
            }
        } catch (error) {
            console.error('❌ Error executing UserOp:', error);
            const op = userOperations.find(o => o.hash === userOpHash);
            if (op) {
                op.status = 'failed';
                op.error = error.message;
            }
        }
    }, 2000); // Simulate 2 second block time

    return res.json({
        jsonrpc: '2.0',
        id,
        result: userOpHash
    });
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
