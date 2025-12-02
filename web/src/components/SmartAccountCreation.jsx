import { useState, useEffect } from 'react'
import { useWalletClient, useSwitchChain } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { hardhat } from '../config/chains'
import { getSmartAccountAddress, deploySmartAccount, isAccountDeployed } from '../config/smartAccount'

export default function SmartAccountCreation({ eoaAddress, deploymentInfo, onAccountCreated }) {
    const { data: walletClient, isLoading: isLoadingWallet } = useWalletClient({ chainId: hardhat.id })
    const { switchChain } = useSwitchChain()
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState(null)
    const [txHash, setTxHash] = useState(null)
    const [switchingChain, setSwitchingChain] = useState(false)
    const [smartAccountAddress, setSmartAccountAddress] = useState(null)
    const [isDeployed, setIsDeployed] = useState(false)

    const publicClient = createPublicClient({
        chain: hardhat,
        transport: http()
    })

    // Calculate smart account address on component mount
    useEffect(() => {
        if (eoaAddress && deploymentInfo?.contracts?.SimpleAccountFactory) {
            calculateAccountAddress()
        }
    }, [eoaAddress, deploymentInfo])

    const calculateAccountAddress = async () => {
        try {
            const salt = 0 // Using salt 0 for simplicity - could be customizable
            const address = await getSmartAccountAddress(
                eoaAddress,
                salt,
                deploymentInfo.contracts.SimpleAccountFactory,
                publicClient
            )
            setSmartAccountAddress(address)

            // Check if already deployed
            const deployed = await isAccountDeployed(address, publicClient)
            setIsDeployed(deployed)

            if (deployed) {
                // Account already exists, notify parent
                onAccountCreated(address)
            }
        } catch (err) {
            console.error('Error calculating account address:', err)
        }
    }

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

        if (isDeployed) {
            setError('Smart account already deployed!')
            onAccountCreated(smartAccountAddress)
            return
        }

        setCreating(true)
        setError(null)

        try {
            console.log('Creating smart account for EOA:', eoaAddress)
            console.log('Factory address:', deploymentInfo.contracts.SimpleAccountFactory)

            const salt = 0 // Using salt 0 for simplicity

            // Deploy the smart account using the factory
            const hash = await deploySmartAccount(
                eoaAddress,
                salt,
                deploymentInfo.contracts.SimpleAccountFactory,
                walletClient
            )

            console.log('Deployment transaction hash:', hash)
            setTxHash(hash)

            // Wait for transaction to be mined
            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            console.log('Transaction mined:', receipt)

            // Verify deployment
            const deployed = await isAccountDeployed(smartAccountAddress, publicClient)
            if (deployed) {
                console.log('Smart account deployed successfully:', smartAccountAddress)
                setIsDeployed(true)
                onAccountCreated(smartAccountAddress)
            } else {
                throw new Error('Account deployment verification failed')
            }

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

            {smartAccountAddress && (
                <div className="card-glass mb-lg">
                    <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        <h3 style={{ margin: 0 }}>Your Smart Account Address</h3>
                        {isDeployed && (
                            <span style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: 'var(--success)',
                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                ✓ DEPLOYED
                            </span>
                        )}
                    </div>
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all'
                    }}>
                        {smartAccountAddress}
                    </div>
                    {!isDeployed && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            💡 This is your counterfactual address - it will be deployed when you create the account
                        </p>
                    )}
                </div>
            )}

            <div className="card mb-lg">
                <h3>What happens next?</h3>
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div className="flex gap-md">
                        <div style={{ fontSize: '1.5rem' }}>1️⃣</div>
                        <div>
                            <strong>Deploy Smart Account</strong>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>
                                Deploy an ERC-4337 compliant smart account using SimpleAccountFactory
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
                    💡 <strong>Real ERC-4337 Implementation:</strong> This uses actual EntryPoint and SimpleAccountFactory contracts for authentic Account Abstraction testing on your local Hardhat network.
                </p>
            </div>
        </div>
    )
}
