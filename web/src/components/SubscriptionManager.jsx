import { useState, useEffect } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, formatEther } from 'viem'

export default function SubscriptionManager({ smartAccountAddress, eoaAddress, deploymentInfo }) {
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [plans, setPlans] = useState([
        { id: 0, name: 'Basic Plan', price: '0.001 ETH', interval: '1 hour', token: 'ETH' },
        { id: 1, name: 'Premium Plan', price: '0.002 ETH', interval: '1 hour', token: 'ETH' },
        { id: 2, name: 'Token Plan', price: '10 USDC', interval: '1 hour', token: 'USDC' }
    ])

    const [activeSubscription, setActiveSubscription] = useState(null)
    const [subscribing, setSubscribing] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [paymentHistory, setPaymentHistory] = useState([])

    const subscribe = async (planId) => {
        setSubscribing(true)
        try {
            // In a real implementation, this would:
            // 1. Call the subscription service contract to subscribe
            // 2. Create a session key with payment policies
            // 3. Install the subscription module if not already installed

            console.log('Subscribing to plan:', planId)

            // Simulate subscription
            await new Promise(resolve => setTimeout(resolve, 2000))

            const plan = plans.find(p => p.id === planId)
            setActiveSubscription({
                ...plan,
                startTime: new Date(),
                nextPayment: new Date(Date.now() + 3600000), // 1 hour from now
                status: 'active'
            })

            setSelectedPlan(null)

        } catch (error) {
            console.error('Error subscribing:', error)
            alert('Failed to subscribe: ' + error.message)
        } finally {
            setSubscribing(false)
        }
    }

    const cancelSubscription = async () => {
        setCancelling(true)
        try {
            console.log('Cancelling subscription')

            // Simulate cancellation
            await new Promise(resolve => setTimeout(resolve, 1500))

            setActiveSubscription(null)

        } catch (error) {
            console.error('Error cancelling:', error)
            alert('Failed to cancel: ' + error.message)
        } finally {
            setCancelling(false)
        }
    }

    const triggerPayment = async () => {
        try {
            console.log('Triggering manual payment')

            // Simulate payment
            await new Promise(resolve => setTimeout(resolve, 1500))

            const payment = {
                timestamp: new Date(),
                amount: activeSubscription.price,
                status: 'success',
                txHash: '0x' + Math.random().toString(16).slice(2)
            }

            setPaymentHistory([payment, ...paymentHistory])

            // Update next payment time
            setActiveSubscription({
                ...activeSubscription,
                nextPayment: new Date(Date.now() + 3600000)
            })

        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Failed to process payment: ' + error.message)
        }
    }

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Smart Account Info */}
            <div className="card-glass mb-xl">
                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                    <div>
                        <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>Your Smart Account</h3>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            wordBreak: 'break-all'
                        }}>
                            {smartAccountAddress}
                        </div>
                    </div>
                    <div className="badge-success">
                        ✓ Active
                    </div>
                </div>
            </div>

            {/* Active Subscription */}
            {activeSubscription ? (
                <div className="mb-xl">
                    <h2>Active Subscription</h2>
                    <div className="card" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'var(--accent-primary)' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                            <div>
                                <h3 style={{ margin: 0, marginBottom: 'var(--spacing-xs)' }}>{activeSubscription.name}</h3>
                                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                                    {activeSubscription.price} / {activeSubscription.interval}
                                </p>
                            </div>
                            <div className="badge-success" style={{ fontSize: '1rem', padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                                {activeSubscription.status}
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 'var(--spacing-md)',
                            marginBottom: 'var(--spacing-lg)'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Started</div>
                                <div style={{ fontWeight: 600 }}>{activeSubscription.startTime.toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Next Payment</div>
                                <div style={{ fontWeight: 600 }}>{activeSubscription.nextPayment.toLocaleString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Payment Token</div>
                                <div style={{ fontWeight: 600 }}>{activeSubscription.token}</div>
                            </div>
                        </div>

                        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                            <button
                                className="btn-primary"
                                onClick={triggerPayment}
                                style={{ flex: 1, minWidth: '200px' }}
                            >
                                💳 Trigger Payment (Test)
                            </button>
                            <button
                                className="btn-danger"
                                onClick={cancelSubscription}
                                disabled={cancelling}
                                style={{ flex: 1, minWidth: '200px' }}
                            >
                                {cancelling ? 'Cancelling...' : '❌ Cancel Subscription'}
                            </button>
                        </div>
                    </div>

                    {/* Payment History */}
                    {paymentHistory.length > 0 && (
                        <div className="mt-lg">
                            <h3>Payment History</h3>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {paymentHistory.map((payment, index) => (
                                    <div key={index} className="card" style={{ padding: 'var(--spacing-md)' }}>
                                        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{payment.amount}</div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {payment.timestamp.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-md">
                                                <div className="badge-success">{payment.status}</div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontFamily: 'monospace',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    {payment.txHash.slice(0, 10)}...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Available Plans */
                <div>
                    <h2>Available Subscription Plans</h2>
                    <p style={{ marginBottom: 'var(--spacing-xl)' }}>
                        Choose a plan to start your subscription with automated hourly payments
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 'var(--spacing-lg)',
                        marginBottom: 'var(--spacing-xl)'
                    }}>
                        {plans.map(plan => (
                            <div
                                key={plan.id}
                                className="card"
                                style={{
                                    cursor: 'pointer',
                                    border: selectedPlan === plan.id ? '2px solid var(--accent-primary)' : undefined,
                                    background: selectedPlan === plan.id ? 'rgba(99, 102, 241, 0.1)' : undefined
                                }}
                                onClick={() => setSelectedPlan(plan.id)}
                            >
                                <h3>{plan.name}</h3>
                                <div style={{
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    marginBottom: 'var(--spacing-md)',
                                    background: 'var(--accent-gradient)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    {plan.price}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                    Billed every {plan.interval}
                                </div>
                                <div style={{
                                    padding: 'var(--spacing-sm)',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem'
                                }}>
                                    Payment: {plan.token}
                                </div>
                            </div>
                        ))}
                    </div>

                    {selectedPlan !== null && (
                        <div className="card" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                            <h3>Subscription Details</h3>
                            <p>
                                You're about to subscribe to <strong>{plans[selectedPlan].name}</strong>.
                                This will create a session key with payment policies allowing automated payments of{' '}
                                <strong>{plans[selectedPlan].price}</strong> every <strong>{plans[selectedPlan].interval}</strong>.
                            </p>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                <div style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
                                    <strong>Session Key Policies:</strong>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    ✓ Max amount: {plans[selectedPlan].price}<br />
                                    ✓ Interval: {plans[selectedPlan].interval}<br />
                                    ✓ Recipient: Subscription Service Contract<br />
                                    ✓ Token: {plans[selectedPlan].token}
                                </div>
                            </div>
                            <button
                                className="btn-primary"
                                onClick={() => subscribe(selectedPlan)}
                                disabled={subscribing}
                                style={{ width: '100%', padding: 'var(--spacing-md)' }}
                            >
                                {subscribing ? (
                                    <span className="flex items-center justify-center gap-md">
                                        <span className="spinner"></span>
                                        Creating Subscription...
                                    </span>
                                ) : (
                                    '🚀 Subscribe Now'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Info Box */}
            <div className="mt-xl" style={{
                padding: 'var(--spacing-lg)',
                background: 'rgba(139, 92, 246, 0.1)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(139, 92, 246, 0.3)'
            }}>
                <h3>How It Works</h3>
                <div style={{ display: 'grid', gap: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                    <div>
                        <strong>🔐 Session Keys:</strong> Your smart account creates a session key with specific payment policies
                    </div>
                    <div>
                        <strong>⚡ Automated Payments:</strong> Payments are executed automatically every hour without manual approval
                    </div>
                    <div>
                        <strong>🛡️ Secure:</strong> Policies ensure payments can only go to the subscription service for the specified amount
                    </div>
                    <div>
                        <strong>🔧 Modular:</strong> The subscription module can be installed/uninstalled at any time (ERC-7579)
                    </div>
                </div>
            </div>
        </div>
    )
}
