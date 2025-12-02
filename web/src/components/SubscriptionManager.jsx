import { useState, useMemo, useEffect } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { encodeFunctionData, parseEther } from 'viem'
import { SIMPLE_ACCOUNT_ABI, SUBSCRIPTION_MODULE_ABI } from '../config/abis'

const BILLING_FREQUENCIES = [
    { value: 'minute', label: 'Minuto', description: 'Cada minuto', intervalText: '1 minuto', durationMs: 60 * 1000 },
    { value: 'hour', label: 'Hora', description: 'Cada hora', intervalText: '1 hora', durationMs: 60 * 60 * 1000 },
    { value: 'day', label: 'Día', description: 'Cada día', intervalText: '1 día', durationMs: 24 * 60 * 60 * 1000 }
]

const BILLING_LOOKUP = BILLING_FREQUENCIES.reduce((acc, item) => {
    acc[item.value] = item
    return acc
}, {})

const formatPaidAmount = (value) => {
    if (value >= 1) {
        return value.toFixed(3).replace(/\.?0+$/, '')
    }
    return value.toFixed(6).replace(/\.?0+$/, '')
}

const MODULE_CATALOG = {
    'session-key': {
        id: 'session-key',
        name: 'Session Key Module',
        description: 'Gestiona claves de sesión específicas para autorizar pagos automatizados con límites claros.',
        type: 'Seguridad',
        category: 'Autorización',
        defaultInstalled: true,
        configurable: false
    },
    'subscription-guard': {
        id: 'subscription-guard',
        name: 'Subscription Guard',
        description: 'Valida límites de gasto y destinatarios de las suscripciones activas.',
        type: 'Política',
        category: 'Supervisión',
        defaultInstalled: true,
        configurable: false
    },
    'daily-limit': {
        id: 'daily-limit',
        name: 'Limitador Diario',
        description: 'Define un límite máximo de gasto diario para toda la cuenta.',
        type: 'Riesgo',
        category: 'Límites',
        defaultInstalled: false,
        configurable: true,
        configFields: [
            { name: 'dailyLimit', label: 'Límite diario (ETH)', type: 'number', min: 0, step: 0.001, suffix: ' ETH' }
        ],
        defaultConfig: { dailyLimit: 0.05 }
    },
    'time-window': {
        id: 'time-window',
        name: 'Ventana Horaria',
        description: 'Restringe la ejecución de pagos a una franja horaria diaria.',
        type: 'Automatización',
        category: 'Horario',
        defaultInstalled: false,
        configurable: true,
        configFields: [
            { name: 'start', label: 'Hora de inicio', type: 'time' },
            { name: 'end', label: 'Hora de fin', type: 'time' }
        ],
        defaultConfig: { start: '08:00', end: '18:00' }
    },
    'trusted-recipients': {
        id: 'trusted-recipients',
        name: 'Destinatarios Confiables',
        description: 'Limita los pagos a una lista blanca de direcciones aprobadas.',
        type: 'Control',
        category: 'Listas',
        defaultInstalled: false,
        configurable: true,
        configFields: [
            { name: 'recipients', label: 'Direcciones permitidas', type: 'textarea', placeholder: '0xabc...,0xdef...' }
        ],
        defaultConfig: { recipients: '' }
    }
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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
    const [selectedFrequency, setSelectedFrequency] = useState('hour')
    const [paymentHistory, setPaymentHistory] = useState([])
    const [activeTab, setActiveTab] = useState('subscriptions')
    const [installedModules, setInstalledModules] = useState(() =>
        Object.values(MODULE_CATALOG)
            .filter(module => module.defaultInstalled)
            .map(module => ({
                ...module,
                status: 'Instalado',
                installedAt: new Date()
            }))
    )
    const [moduleConfigs, setModuleConfigs] = useState(() => {
        const defaults = {}
        Object.values(MODULE_CATALOG).forEach(module => {
            if (module.defaultInstalled && module.configurable && module.defaultConfig) {
                defaults[module.id] = { ...module.defaultConfig }
            }
        })
        return defaults
    })
    const [moduleActions, setModuleActions] = useState({})
    const [configSaving, setConfigSaving] = useState({})

    const selectedPlanData = plans.find(plan => plan.id === selectedPlan)
    const currentFrequency = BILLING_LOOKUP[selectedFrequency] || BILLING_LOOKUP.hour
    const availableModules = useMemo(() => {
        const installedIds = new Set(installedModules.map(module => module.id))
        return Object.values(MODULE_CATALOG).filter(module => !installedIds.has(module.id))
    }, [installedModules])
    const configurableModules = useMemo(
        () => installedModules.filter(module => module.configurable),
        [installedModules]
    )
    const hasConfigurableModules = configurableModules.length > 0
    const [onchainSubs, setOnchainSubs] = useState([])
    const [loadingSubs, setLoadingSubs] = useState(false)
    const [subsError, setSubsError] = useState(null)

    const paymentTotals = useMemo(() => {
        return paymentHistory.reduce((acc, payment) => {
            const [rawAmount, token] = payment.amount.split(' ')
            const numeric = parseFloat(rawAmount)
            if (!Number.isNaN(numeric) && token) {
                acc[token] = (acc[token] || 0) + numeric
            }
            return acc
        }, {})
    }, [paymentHistory])

    const executeThroughSmartAccount = async (to, value, data) => {
        if (!walletClient) throw new Error('Wallet client no disponible')
        if (!smartAccountAddress) throw new Error('SmartAccount no disponible')

        return walletClient.writeContract({
            address: smartAccountAddress,
            abi: SIMPLE_ACCOUNT_ABI,
            functionName: 'execute',
            args: [to, value, data]
        })
    }

    const encodePlanParams = (plan, freq) => {
        const moduleAddr = deploymentInfo?.contracts?.SubscriptionModule
        const service = deploymentInfo?.contracts?.SubscriptionService
        if (!moduleAddr || !service) {
            throw new Error('Faltan direcciones de SubscriptionModule o SubscriptionService')
        }

        const intervalSeconds = freq.value === 'minute'
            ? 60
            : freq.value === 'day'
                ? 24 * 60 * 60
                : 60 * 60

        let token = '0x0000000000000000000000000000000000000000'
        let amount

        if (plan.token === 'ETH') {
            const raw = plan.price.split(' ')[0]
            amount = parseEther(raw)
        } else {
            const raw = plan.price.split(' ')[0]
            amount = parseEther(raw)
            token = deploymentInfo.contracts.MockERC20
        }

        return { moduleAddr, service, token, amount, intervalSeconds }
    }

    const loadSubscriptions = async () => {
        if (!smartAccountAddress || !deploymentInfo?.contracts?.SubscriptionModule || !publicClient) return
        setLoadingSubs(true)
        setSubsError(null)
        try {
            const moduleAddr = deploymentInfo.contracts.SubscriptionModule
            const count = await publicClient.readContract({
                address: moduleAddr,
                abi: SUBSCRIPTION_MODULE_ABI,
                functionName: 'subscriptionCount',
                args: [smartAccountAddress]
            })

            const subs = []
            for (let i = 0n; i < count; i++) {
                const sub = await publicClient.readContract({
                    address: moduleAddr,
                    abi: SUBSCRIPTION_MODULE_ABI,
                    functionName: 'getSubscription',
                    args: [smartAccountAddress, i]
                })
                subs.push({
                    id: Number(i),
                    ...sub
                })
            }
            setOnchainSubs(subs)
        } catch (err) {
            console.error('Error cargando suscripciones:', err)
            setSubsError(err.message || 'Error cargando suscripciones')
        } finally {
            setLoadingSubs(false)
        }
    }

    useEffect(() => {
        loadSubscriptions()
    }, [smartAccountAddress, deploymentInfo])

    const subscribe = async (planId) => {
        setSubscribing(true)
        try {
            const plan = plans.find(p => p.id === planId)
            if (!plan) throw new Error('Plan no encontrado')

            const { moduleAddr, service, token, amount, intervalSeconds } = encodePlanParams(plan, currentFrequency)

            const data = encodeFunctionData({
                abi: SUBSCRIPTION_MODULE_ABI,
                functionName: 'createSubscription',
                args: [service, token, amount, BigInt(intervalSeconds)]
            })

            console.log('Subscribing to plan (on-chain):', planId, 'freq:', currentFrequency.value)
            const txHash = await executeThroughSmartAccount(moduleAddr, 0n, data)
            console.log('Tx suscripción enviada:', txHash)
            await publicClient.waitForTransactionReceipt({ hash: txHash })

            setActiveSubscription({
                ...plan,
                interval: currentFrequency.intervalText,
                frequencyKey: currentFrequency.value,
                frequencyMs: currentFrequency.durationMs,
                startTime: new Date(),
                nextPayment: new Date(Date.now() + currentFrequency.durationMs),
                status: 'active'
            })

            setSelectedPlan(null)
            setSelectedFrequency('hour')
            await loadSubscriptions()

        } catch (error) {
            console.error('Error subscribing:', error)
            alert('Failed to subscribe: ' + error.message)
        } finally {
            setSubscribing(false)
        }
    }

    const cancelSubscription = async (subscriptionId) => {
        setCancelling(true)
        try {
            console.log('Cancelling subscription', subscriptionId)

            const moduleAddr = deploymentInfo.contracts.SubscriptionModule
            const data = encodeFunctionData({
                abi: SUBSCRIPTION_MODULE_ABI,
                functionName: 'cancelSubscription',
                args: [BigInt(subscriptionId)]
            })

            const txHash = await executeThroughSmartAccount(moduleAddr, 0n, data)
            await publicClient.waitForTransactionReceipt({ hash: txHash })

            setActiveSubscription(null)
            await loadSubscriptions()

        } catch (error) {
            console.error('Error cancelling:', error)
            alert('Failed to cancel: ' + error.message)
        } finally {
            setCancelling(false)
        }
    }

    const triggerPayment = async (subscriptionId) => {
        try {
            console.log('Triggering manual payment for subscription', subscriptionId)

            const sub = onchainSubs.find(s => s.id === subscriptionId)
            if (!sub || !sub.active) {
                alert('La suscripción no está activa')
                return
            }

            const amountWei = sub.amount
            const tokenAddress = sub.token.toLowerCase()

            // Módulo: destintarios confiables
            const trustedCfg = moduleConfigs['trusted-recipients']
            if (trustedCfg && trustedCfg.recipients) {
                const list = trustedCfg.recipients
                    .split(',')
                    .map(a => a.trim().toLowerCase())
                    .filter(Boolean)
                if (list.length > 0 && !list.includes(sub.service.toLowerCase())) {
                    alert('El servicio de esta suscripción no está en la lista de destinatarios confiables')
                    return
                }
            }

            // Convertir a ETH-like valor para límites (asumimos 18 decimales)
            const amountEth = Number(String(amountWei)) / 1e18

            // Módulo: límite diario
            const dailyCfg = moduleConfigs['daily-limit']
            if (dailyCfg && typeof dailyCfg.dailyLimit === 'number') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const dayStart = today.getTime()
                const dayEnd = dayStart + 24 * 60 * 60 * 1000

                const spentToday = paymentHistory.reduce((acc, p) => {
                    const ts = p.timestamp?.getTime?.() || 0
                    if (ts < dayStart || ts >= dayEnd) return acc
                    const [rawAmount, tokenLabel] = p.amount.split(' ')
                    const value = parseFloat(rawAmount)
                    if (!Number.isNaN(value) && tokenLabel === (tokenAddress === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TOKEN')) {
                        return acc + value
                    }
                    return acc
                }, 0)

                if (spentToday + amountEth > dailyCfg.dailyLimit) {
                    alert('Se superaría el límite diario configurado para este módulo')
                    return
                }
            }

            // Módulo: ventana horaria
            const windowCfg = moduleConfigs['time-window']
            if (windowCfg && windowCfg.start && windowCfg.end) {
                const now = new Date()
                const [sh, sm] = windowCfg.start.split(':').map(Number)
                const [eh, em] = windowCfg.end.split(':').map(Number)
                const minutesNow = now.getHours() * 60 + now.getMinutes()
                const minutesStart = sh * 60 + sm
                const minutesEnd = eh * 60 + em
                if (minutesNow < minutesStart || minutesNow > minutesEnd) {
                    alert('El pago está fuera de la ventana horaria permitida')
                    return
                }
            }

            const moduleAddr = deploymentInfo.contracts.SubscriptionModule
            const data = encodeFunctionData({
                abi: SUBSCRIPTION_MODULE_ABI,
                functionName: 'executePayment',
                args: [smartAccountAddress, BigInt(subscriptionId)]
            })

            const txHash = await executeThroughSmartAccount(moduleAddr, 0n, data)
            await publicClient.waitForTransactionReceipt({ hash: txHash })

            // Actualizar historial de pagos local para totales y límites
            const displayToken = tokenAddress === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TOKEN'
            const payment = {
                timestamp: new Date(),
                amount: `${amountEth} ${displayToken}`,
                status: 'success',
                txHash
            }
            setPaymentHistory(prev => [payment, ...prev])

            await loadSubscriptions()

        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Failed to process payment: ' + (error.message || error))
        }
    }

    const uninstallModule = async (moduleId) => {
        setModuleActions(prev => ({ ...prev, [moduleId]: true }))
        try {
            console.log('Desinstalando módulo:', moduleId)
            await delay(1200)
            setInstalledModules(prev => prev.filter(module => module.id !== moduleId))
            setModuleConfigs(prev => {
                if (!prev[moduleId]) return prev
                const updated = { ...prev }
                delete updated[moduleId]
                return updated
            })
            setActiveTab('modules')
        } catch (error) {
            console.error('Error uninstalling module:', error)
            alert('No se pudo desinstalar el módulo: ' + error.message)
        } finally {
            setModuleActions(prev => ({ ...prev, [moduleId]: false }))
        }
    }

    const installModule = async (moduleId) => {
        if (installedModules.some(module => module.id === moduleId)) {
            return
        }
        setModuleActions(prev => ({ ...prev, [moduleId]: true }))
        try {
            console.log('Instalando módulo:', moduleId)
            await delay(1200)
            const metadata = MODULE_CATALOG[moduleId]
            if (!metadata) {
                throw new Error('Módulo desconocido')
            }
            setInstalledModules(prev => ([
                ...prev,
                {
                    ...metadata,
                    status: 'Instalado',
                    installedAt: new Date()
                }
            ]))
            if (metadata.configurable && metadata.defaultConfig) {
                setModuleConfigs(prev => ({
                    ...prev,
                    [moduleId]: { ...metadata.defaultConfig }
                }))
            }
            setActiveTab(metadata.configurable ? 'config' : 'modules')
        } catch (error) {
            console.error('Error installing module:', error)
            alert('No se pudo instalar el módulo: ' + (error.message || 'Error desconocido'))
        } finally {
            setModuleActions(prev => ({ ...prev, [moduleId]: false }))
        }
    }

    const handleConfigChange = (moduleId, field, value) => {
        setModuleConfigs(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId],
                [field]: value
            }
        }))
    }

    const saveModuleConfiguration = async (moduleId) => {
        setConfigSaving(prev => ({ ...prev, [moduleId]: true }))
        try {
            await delay(800)
            console.log('Configuración guardada para', moduleId, moduleConfigs[moduleId])
        } catch (error) {
            console.error('Error guardando configuración:', error)
            alert('No se pudo guardar la configuración: ' + (error.message || 'Error desconocido'))
        } finally {
            setConfigSaving(prev => ({ ...prev, [moduleId]: false }))
        }
    }

    const renderConfigFieldInput = (moduleId, field) => {
        const value = moduleConfigs[moduleId]?.[field.name] ?? ''
        const baseStyle = {
            width: '100%',
            padding: 'var(--spacing-sm)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)'
        }

        const handleChange = (event) => handleConfigChange(moduleId, field.name, event.target.value)

        if (field.type === 'textarea') {
            return (
                <textarea
                    rows={3}
                    value={value}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    style={baseStyle}
                />
            )
        }

        return (
            <input
                type={field.type || 'text'}
                value={value}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                onChange={handleChange}
                style={baseStyle}
            />
        )
    }

    const renderActiveSubscriptionSection = () => (
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
                {Object.keys(paymentTotals).length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                            Total pagado
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                            {Object.entries(paymentTotals).map(([token, total]) => (
                                <div
                                    key={token}
                                    style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600
                                    }}
                                >
                                    {formatPaidAmount(total)} {token}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                    <button
                        className="btn-primary"
                        onClick={() => triggerPayment(0)}
                        style={{ flex: 1, minWidth: '200px' }}
                    >
                        💳 Trigger Payment (Test)
                    </button>
                    <button
                        className="btn-danger"
                        onClick={() => cancelSubscription(0)}
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
    )

    const renderAvailablePlansSection = () => (
        <div>
            <h2>Available Subscription Plans</h2>
            <p style={{ marginBottom: 'var(--spacing-xl)' }}>
                Elige un plan y selecciona la frecuencia de cobro que prefieras para activar los pagos automáticos
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
                            Ejemplo de intervalo: cada {plan.interval}
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

            {selectedPlanData && (
                <div className="card" style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
                    <h3>Subscription Details</h3>
                    <p>
                        Estás a punto de suscribirte a <strong>{selectedPlanData.name}</strong>.
                        Esto creará una session key con políticas que permiten pagos automáticos de{' '}
                        <strong>{selectedPlanData.price}</strong> {currentFrequency.description.toLowerCase()}.
                    </p>
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)' }}>
                            <strong>Frecuencia de cobro</strong>
                        </div>
                        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                            {BILLING_FREQUENCIES.map(freq => (
                                <button
                                    key={freq.value}
                                    type="button"
                                    onClick={() => setSelectedFrequency(freq.value)}
                                    className={selectedFrequency === freq.value ? 'btn-primary' : 'btn-secondary'}
                                    style={{ flex: '1 1 120px' }}
                                >
                                    {freq.description}
                                </button>
                            ))}
                        </div>
                    </div>
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
                            ✓ Max amount: {selectedPlanData.price}<br />
                            ✓ Interval: {currentFrequency.intervalText}<br />
                            ✓ Recipient: Subscription Service Contract<br />
                            ✓ Token: {selectedPlanData.token}
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
    )

    const renderInfoBox = () => (
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
    )

    const renderSubscriptionsTab = () => (
        <div>
            {activeSubscription ? renderActiveSubscriptionSection() : renderAvailablePlansSection()}
            {renderInfoBox()}
            <div className="mt-xl">
                <h3>Suscripciones on-chain</h3>
                {loadingSubs && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cargando suscripciones desde el contrato...</p>
                )}
                {subsError && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--error)' }}>
                        Error cargando suscripciones: {subsError}
                    </p>
                )}
                {!loadingSubs && onchainSubs.length === 0 && !subsError && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        No hay suscripciones registradas todavía para esta Smart Account.
                    </p>
                )}
                {!loadingSubs && onchainSubs.length > 0 && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                        {onchainSubs.map(sub => (
                            <div key={sub.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            ID #{sub.id} · {sub.active ? 'Activa' : 'Inactiva'}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', marginTop: '4px' }}>
                                            Servicio: {sub.service}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                            Token: {sub.token}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                                        <div>Monto: {String(sub.amount)}</div>
                                        <div>Intervalo (s): {String(sub.interval)}</div>
                                        <div>Último pago: {String(sub.lastPayment)}</div>
                                    </div>
                                </div>
                                <div className="flex gap-md mt-md" style={{ flexWrap: 'wrap' }}>
                                    <button
                                        className="btn-primary"
                                        onClick={() => triggerPayment(sub.id)}
                                        disabled={!sub.active}
                                    >
                                        Ejecutar pago
                                    </button>
                                    <button
                                        className="btn-danger"
                                        onClick={() => cancelSubscription(sub.id)}
                                        disabled={!sub.active}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    const renderModulesTab = () => (
        <div>
            <h2>Módulos instalados en tu Smart Account</h2>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
                Revisa los módulos activos en tu cuenta modular y desinstala los que ya no necesites.
            </p>
            {installedModules.length === 0 ? (
                <div className="card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <p style={{ marginBottom: 'var(--spacing-md)' }}>
                        No tienes módulos instalados actualmente.
                    </p>
                    <small style={{ color: 'var(--text-secondary)' }}>
                        Instala módulos desde la sección inferior o durante tu flujo de suscripción.
                    </small>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 'var(--spacing-lg)'
                }}>
                    {installedModules.map(module => (
                        <div key={module.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {module.type} · {module.category}
                                </div>
                                <h3 style={{ margin: 'var(--spacing-xs) 0' }}>{module.name}</h3>
                                <p style={{ margin: 0 }}>{module.description}</p>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                <div><strong>Estado:</strong> {module.status || 'Instalado'}</div>
                                <div><strong>Instalado:</strong> {module.installedAt?.toLocaleString?.() || 'Desconocido'}</div>
                                {module.configurable && (
                                    <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--accent-primary)', fontSize: '0.8rem' }}>
                                        Configurable
                                    </div>
                                )}
                            </div>
                            <button
                                className="btn-danger"
                                onClick={() => uninstallModule(module.id)}
                                disabled={moduleActions[module.id]}
                            >
                                {moduleActions[module.id] ? 'Desinstalando...' : 'Desinstalar'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-xl">
                <h3>Nuevos módulos disponibles</h3>
                <p style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--text-secondary)' }}>
                    Activa capacidades adicionales como límites diarios, ventanas horarias o destinatarios aprobados.
                </p>
                {availableModules.length === 0 ? (
                    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                        <p style={{ margin: 0 }}>Ya instalaste todos los módulos de ejemplo.</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 'var(--spacing-lg)'
                    }}>
                        {availableModules.map(module => (
                            <div key={module.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                        {module.type} · {module.category}
                                    </div>
                                    <h4 style={{ margin: 'var(--spacing-xs) 0' }}>{module.name}</h4>
                                    <p style={{ margin: 0 }}>{module.description}</p>
                                </div>
                                {module.configurable && (
                                    <small style={{ color: 'var(--accent-primary)' }}>
                                        Requiere configuración tras la instalación.
                                    </small>
                                )}
                                <button
                                    className="btn-primary"
                                    onClick={() => installModule(module.id)}
                                    disabled={moduleActions[module.id]}
                                >
                                    {moduleActions[module.id] ? 'Instalando...' : 'Instalar módulo'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )

    const renderConfigTab = () => (
        <div>
            <h2>Configura tus módulos</h2>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
                Ajusta las políticas activas directamente sobre cada módulo configurable.
            </p>
            {configurableModules.length === 0 ? (
                <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                    <p style={{ margin: 0 }}>Instala al menos un módulo configurable para habilitar esta sección.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    {configurableModules.map(module => (
                        <div key={module.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <h3 style={{ margin: 0 }}>{module.name}</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{module.description}</p>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                {module.configFields?.map(field => (
                                    <div key={field.name}>
                                        <label htmlFor={`${module.id}-${field.name}`} style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--spacing-xs)' }}>
                                            {field.label}{field.suffix ? <span style={{ color: 'var(--text-secondary)' }}> ({field.suffix.trim()})</span> : null}
                                        </label>
                                        {renderConfigFieldInput(module.id, field)}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-md" style={{ marginTop: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => saveModuleConfiguration(module.id)}
                                    disabled={configSaving[module.id]}
                                >
                                    {configSaving[module.id] ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => setActiveTab('modules')}
                                >
                                    Ver módulos
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    const tabs = [
        { id: 'subscriptions', label: 'Suscripciones' },
        { id: 'modules', label: 'Módulos' }
    ]
    if (hasConfigurableModules) {
        tabs.push({ id: 'config', label: 'Configuración' })
    }

    return (
        <div className="fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="card-glass mb-xl ">
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

            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ flex: '1 1 160px' }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-xl">
                {activeTab === 'subscriptions' && renderSubscriptionsTab()}
                {activeTab === 'modules' && renderModulesTab()}
                {activeTab === 'config' && renderConfigTab()}
            </div>
        </div>
    )
}
