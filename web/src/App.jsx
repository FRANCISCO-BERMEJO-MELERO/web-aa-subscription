import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import SmartAccountCreation from './components/SmartAccountCreation'
import SubscriptionManager from './components/SubscriptionManager'
import { loadDeploymentInfo } from './config/contracts'

function App() {
    const { address, isConnected } = useAccount()
    const { connect, connectors } = useConnect()
    const { disconnect } = useDisconnect()
    const [smartAccountAddress, setSmartAccountAddress] = useState(null)
    const [deploymentInfo, setDeploymentInfo] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadDeploymentInfo().then(info => {
            setDeploymentInfo(info)
            setLoading(false)
        })
    }, [])

    if (loading) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center">
                    <div className="spinner" style={{ width: '3rem', height: '3rem', margin: '0 auto' }}></div>
                    <p className="mt-md">Loading application...</p>
                </div>
            </div>
        )
    }

    if (!deploymentInfo) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card text-center" style={{ maxWidth: '600px' }}>
                    <h2>⚠️ Contracts Not Deployed</h2>
                    <p>Please deploy the smart contracts first:</p>
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'monospace',
                        textAlign: 'left',
                        marginTop: 'var(--spacing-lg)'
                    }}>
                        <div>1. Make sure Hardhat node is running</div>
                        <div>2. Deploy contracts: <code>npm run deploy</code></div>
                        <div>3. Refresh this page</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Header */}
            <header style={{
                borderBottom: '1px solid var(--border-color)',
                padding: 'var(--spacing-lg) 0',
                background: 'rgba(26, 26, 36, 0.6)',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <div className="container flex justify-between items-center">
                    <div>
                        <h2 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            🔐 Smart Account Subscriptions
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>
                            ERC-4337 + ERC-7579 Demo
                        </p>
                    </div>

                    {/* Simple Connect Button */}
                    <div>
                        {isConnected ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    borderRadius: 'var(--radius-md)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.875rem'
                                }}>
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </div>
                                <button className="btn-secondary" onClick={() => disconnect()}>
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                className="btn-primary"
                                onClick={() => connect({ connector: connectors[0] })}
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
                {!isConnected ? (
                    <div className="text-center fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>👛</div>
                        <h1>Welcome to Smart Account Subscriptions</h1>
                        <p style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-xl)' }}>
                            Connect your wallet to create a modular smart account and manage subscriptions with automated payments.
                        </p>
                        <div className="card-glass" style={{ padding: 'var(--spacing-xl)' }}>
                            <h3>Features</h3>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)', textAlign: 'left' }}>
                                <div>✅ <strong>ERC-4337</strong> Account Abstraction</div>
                                <div>✅ <strong>ERC-7579</strong> Modular Smart Accounts</div>
                                <div>✅ <strong>Automated Payments</strong> with Session Keys</div>
                                <div>✅ <strong>Hourly Subscriptions</strong> for Testing</div>
                            </div>
                        </div>
                    </div>
                ) : !smartAccountAddress ? (
                    <SmartAccountCreation
                        eoaAddress={address}
                        deploymentInfo={deploymentInfo}
                        onAccountCreated={setSmartAccountAddress}
                    />
                ) : (
                    <SubscriptionManager
                        smartAccountAddress={smartAccountAddress}
                        eoaAddress={address}
                        deploymentInfo={deploymentInfo}
                    />
                )}
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid var(--border-color)',
                padding: 'var(--spacing-xl) 0',
                marginTop: 'auto',
                textAlign: 'center'
            }}>
                <div className="container">
                    <p style={{ fontSize: '0.875rem' }}>
                        Built with ❤️ using ERC-4337 & ERC-7579
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default App
