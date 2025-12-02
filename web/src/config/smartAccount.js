import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { hardhat } from './chains'

/**
 * Create a smart account client using permissionless.js
 * This handles the creation of ERC-4337 compliant smart accounts
 */
export async function createSmartAccountClient(walletClient, deploymentInfo) {
    const { EntryPoint, SimpleAccountFactory } = deploymentInfo.contracts

    // Create public client for reading blockchain state
    const publicClient = createPublicClient({
        chain: hardhat,
        transport: http()
    })

    return {
        publicClient,
        walletClient,
        entryPoint: EntryPoint,
        factory: SimpleAccountFactory
    }
}

/**
 * Get the counterfactual address of a smart account
 * This calculates the address without deploying the account
 */
export async function getSmartAccountAddress(owner, salt, factoryAddress, publicClient) {
    try {
        // Call the factory's getAddress function
        const address = await publicClient.readContract({
            address: factoryAddress,
            abi: [{
                inputs: [
                    { name: 'owner', type: 'address' },
                    { name: 'salt', type: 'uint256' }
                ],
                name: 'getAddress',
                outputs: [{ name: '', type: 'address' }],
                stateMutability: 'view',
                type: 'function'
            }],
            functionName: 'getAddress',
            args: [owner, BigInt(salt)]
        })

        return address
    } catch (error) {
        console.error('Error getting smart account address:', error)
        throw error
    }
}

/**
 * Deploy a smart account
 * This creates the account on-chain using the factory
 */
export async function deploySmartAccount(owner, salt, factoryAddress, walletClient) {
    try {
        // Call the factory's createAccount function
        const hash = await walletClient.writeContract({
            address: factoryAddress,
            abi: [{
                inputs: [
                    { name: 'owner', type: 'address' },
                    { name: 'salt', type: 'uint256' }
                ],
                name: 'createAccount',
                outputs: [{ name: 'account', type: 'address' }],
                stateMutability: 'nonpayable',
                type: 'function'
            }],
            functionName: 'createAccount',
            args: [owner, BigInt(salt)]
        })

        return hash
    } catch (error) {
        console.error('Error deploying smart account:', error)
        throw error
    }
}

/**
 * Check if a smart account is deployed
 */
export async function isAccountDeployed(address, publicClient) {
    const code = await publicClient.getBytecode({ address })
    return code && code !== '0x'
}
