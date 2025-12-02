import { useState } from 'react'
import { useWalletClient, useSwitchChain } from 'wagmi'
import { createPublicClient, http, parseEther } from 'viem'
import { hardhat } from '../config/chains'

export default function SmartAccountCreation({ eoaAddress, deploymentInfo, onAccountCreated }) {
    const { data: walletClient, isLoading: isLoadingWallet } = useWalletClient({ chainId: hardhat.id })
    const { switchChain } = useSwitchChain()
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState(null)
    const [txHash, setTxHash] = useState(null)
    const [switchingChain, setSwitchingChain] = useState(false)

    const publicClient = createPublicClient({
        chain: hardhat,
        transport: http()
    })

    const handleSwitchChain = async () => {
        setSwitchingChain(true)
        setError(null)
        try {
            await switchChain({ chainId: hardhat.id })
        } catch (err) {
            console.error('Error switching chain:', err)
            setError('Failed to switch to Hardhat network. Please switch manually in MetaMask.')
        } finally {
            setSwitchingChain(false)
        }
    }

    const createSmartAccount = async () => {
        if (!walletClient) {
            setError('Wallet client not available. Please make sure you are connected to the Hardhat network (Chain ID: 31337)')
            return
        }

        setCreating(true)
        setError(null)

        try {
            // For this demo, we'll use a simple approach:
            // The smart account address will be deterministically derived from the EOA
            // In a production app, you would use ZeroDev SDK or similar to create the account

            // Simulate smart account creation
            // In reality, this would involve:
            // 1. Creating a Kernel account with ZeroDev SDK
            // 2. Deploying it via the bundler
            // 3. Installing the subscription module

            console.log('Creating smart account for EOA:', eoaAddress)
            console.log('Wallet client chain:', walletClient.chain)

            // For demo purposes, we'll use a deterministic address based on EOA
            // This is a simplified version - real implementation would use proper AA SDK
            const smartAccountAddress = `0x${eoaAddress.slice(2, 10)}${'0'.repeat(32)}SA`

            // Simulate deployment transaction
            await new Promise(resolve => setTimeout(resolve, 2000))

            setTxHash('0x' + '1'.repeat(64)) // Mock tx hash

            console.log('Smart account created:', smartAccountAddress)
            onAccountCreated(smartAccountAddress)

        } catch (err) {
            console.error('Error creating smart account:', err)
            setError(err.message || 'Failed to create smart account')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="text-center mb-xl">
                <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>🔐</div>
                <h1>Create Your Smart Account</h1>
                <p style={{ fontSize: '1.125rem' }}>
                    Transform your EOA into a powerful modular smart account with ERC-4337 and ERC-7579
                </p>
            </div>

            <div className="card-glass mb-lg">
                <h3>Your EOA Wallet</h3>
                <div style={{
                    background: 'var(--bg-tertiary)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    wordBreak: 'break-all'
                }}>
                    {eoaAddress}
                </div>
            </div>

            <div className="card mb-lg">
                <h3>What happens next?</h3>
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div className="flex gap-md">
                        <div style={{ fontSize: '1.5rem' }}>1️⃣</div>
                        <div>
                            <strong>Create Smart Account</strong>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                Deploy an ERC-4337 compliant smart account controlled by your EOA
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-md">
                        <div style={{ fontSize: '1.5rem' }}>2️⃣</div>
                        <div>
                            <strong>Install Subscription Module</strong>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                Add ERC-7579 subscription module for automated payments
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-md">
                        <div style={{ fontSize: '1.5rem' }}>3️⃣</div>
                        <div>
                            <strong>Manage Subscriptions</strong>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                Create and manage subscriptions with hourly automated payments
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="card" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'var(--error)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    <strong style={{ color: 'var(--error)' }}>Error:</strong> {error}
                </div>
            )}

            {txHash && (
                <div className="card" style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'var(--success)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    <strong style={{ color: 'var(--success)' }}>Success!</strong>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        Tx: {txHash}
                    </p>
                </div>
            )}

            {!walletClient && !isLoadingWallet ? (
                <div className="mb-lg">
                    <div className="card" style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderColor: 'rgba(251, 191, 36, 0.3)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <strong style={{ color: 'rgb(251, 191, 36)' }}>⚠️ Network Issue</strong>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>
                            Please connect MetaMask to the Hardhat network (Chain ID: 31337)
                        </p>
                    </div>
                    <button
                        className="btn-primary"
                        onClick={handleSwitchChain}
                        disabled={switchingChain}
                        style={{ width: '100%', padding: 'var(--spacing-md) var(--spacing-xl)', fontSize: '1.125rem' }}
                    >
                        {switchingChain ? (
                            <span className="flex items-center justify-center gap-md">
                                <span className="spinner"></span>
                                Switching Network...
                            </span>
                        ) : (
                            '🔄 Switch to Hardhat Network'
                        )}
                    </button>
                </div>
            ) : null}

            <button
                className="btn-primary"
                onClick={createSmartAccount}
                disabled={creating || !walletClient || isLoadingWallet}
                style={{ width: '100%', padding: 'var(--spacing-md) var(--spacing-xl)', fontSize: '1.125rem' }}
            >
                {isLoadingWallet ? (
                    <span className="flex items-center justify-center gap-md">
                        <span className="spinner"></span>
                        Loading Wallet...
                    </span>
                ) : creating ? (
                    <span className="flex items-center justify-center gap-md">
                        <span className="spinner"></span>
                        Creating Smart Account...
                    </span>
                ) : (
                    '🚀 Create Smart Account'
                )}
            </button>

            <div className="mt-lg" style={{
                padding: 'var(--spacing-md)',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.3)'
            }}>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    💡 <strong>Note:</strong> This demo uses a simplified smart account creation flow.
                    In production, this would integrate with ZeroDev SDK and Pimlico bundler for full ERC-4337 support.
                </p>
            </div>
        </div>
    )
}
