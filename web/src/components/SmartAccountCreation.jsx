import { useState, useEffect } from 'react'
import { useWalletClient, useSwitchChain } from 'wagmi'
import { createPublicClient, http, encodeFunctionData, parseEther } from 'viem'
import { hardhat } from '../config/chains'
import { getSmartAccountAddress, isAccountDeployed } from '../config/smartAccount'
import { ENTRYPOINT_ADDRESS, BUNDLER_URL } from '../config/contracts'
import { ENTRY_POINT_ABI } from '../config/abis'
import { buildUserOperation } from '../config/userOp'

const CREATE_ACCOUNT_ABI = [
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'salt', type: 'uint256' }
        ],
        name: 'createAccount',
        outputs: [{ name: 'account', type: 'address' }],
        stateMutability: 'nonpayable',
        type: 'function'
    }
]

const DEFAULT_SALT = 0

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default function SmartAccountCreation({ eoaAddress, deploymentInfo, onAccountCreated }) {
    const { data: walletClient, isLoading: isLoadingWallet } = useWalletClient({ chainId: hardhat.id })
    const { switchChain } = useSwitchChain()
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState(null)
    const [switchingChain, setSwitchingChain] = useState(false)
    const [smartAccountAddress, setSmartAccountAddress] = useState(null)
    const [isDeployed, setIsDeployed] = useState(false)
    const [initCode, setInitCode] = useState(null)
    const [userOpHash, setUserOpHash] = useState(null)
    const [bundlerStatus, setBundlerStatus] = useState(null)

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
            const salt = DEFAULT_SALT // Using deterministic salt for simplicity
            const address = await getSmartAccountAddress(
                eoaAddress,
                salt,
                deploymentInfo.contracts.SimpleAccountFactory,
                publicClient
            )
            setSmartAccountAddress(address)
            const encodedCreateCall = encodeFunctionData({
                abi: CREATE_ACCOUNT_ABI,
                functionName: 'createAccount',
                args: [eoaAddress, BigInt(salt)]
            })
            setInitCode(`${deploymentInfo.contracts.SimpleAccountFactory}${encodedCreateCall.slice(2)}`)
            setUserOpHash(null)
            setBundlerStatus(null)

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

    const buildCreationUserOperation = async (entryPointAddress) => {
        // Para cuentas no desplegadas, el nonce suele empezar en 0
        let nonce = 0n
        try {
            nonce = await publicClient.readContract({
                address: entryPointAddress,
                abi: ENTRY_POINT_ABI,
                functionName: 'getNonce',
                args: [smartAccountAddress, 0n]
            })
        } catch {
            nonce = 0n
        }

        const verificationGasLimit = 2_000_000n
        const callGasLimit = 0n
        const preVerificationGas = 100_000n
        const maxFeePerGas = 10_000_000_000n // 10 gwei
        const maxPriorityFeePerGas = 1_000_000_000n // 1 gwei

        return buildUserOperation({
            sender: smartAccountAddress,
            nonce,
            initCode,
            callData: '0x',
            verificationGasLimit,
            callGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
            paymasterAndData: '0x',
            signature: '0x'
        })
    }

    const waitForUserOperation = async (hash) => {
        const maxAttempts = 10
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await sleep(2000)
            try {
                const receipt = await sendBundlerRequest('eth_getUserOperationReceipt', [hash])
                if (receipt) {
                    return true
                }
            } catch (err) {
                console.warn('Error consultando el receipt del bundler', err)
            }
        }
        return false
    }

    const sendBundlerRequest = async (method, params) => {
        const response = await fetch(`${BUNDLER_URL}/rpc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params
            })
        })

        if (!response.ok) {
            throw new Error('No se pudo contactar con el bundler')
        }
        const data = await response.json()
        if (data.error) {
            throw new Error(data.error.message || 'Error en la llamada al bundler')
        }
        return data.result
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
            setError('Wallet client not available. Please make sure you are connected a la red Hardhat (Chain ID: 31337)')
            return
        }

        if (isDeployed) {
            setError('Smart account ya desplegada')
            onAccountCreated(smartAccountAddress)
            return
        }

        if (!initCode || !smartAccountAddress) {
            setError('No se pudo construir el initCode del smart account. Intenta recargar la página.')
            return
        }

        setCreating(true)
        setError(null)
        setBundlerStatus(null)
        setUserOpHash(null)

        try {
            const entryPointAddress = deploymentInfo?.contracts?.EntryPoint || ENTRYPOINT_ADDRESS

            // Asegurar que la SmartAccount tiene depósito en el EntryPoint para pagar el prefund
            try {
                const currentDeposit = await publicClient.readContract({
                    address: entryPointAddress,
                    abi: ENTRY_POINT_ABI,
                    functionName: 'balanceOf',
                    args: [smartAccountAddress]
                })
                if (currentDeposit === 0n) {
                    console.log('Realizando depósito inicial en EntryPoint para la SmartAccount')
                    await walletClient.writeContract({
                        address: entryPointAddress,
                        abi: ENTRY_POINT_ABI,
                        functionName: 'depositTo',
                        args: [smartAccountAddress],
                        value: parseEther('0.1')
                    })
                }
            } catch (depErr) {
                console.warn('No se pudo comprobar/realizar el depósito en EntryPoint:', depErr)
            }
            console.log('Creando smart account mediante UserOperation')
            const userOperation = await buildCreationUserOperation(entryPointAddress)

            // Calcular hash real de la UserOp usando EntryPoint
            const userOpHash = await publicClient.readContract({
                address: entryPointAddress,
                abi: ENTRY_POINT_ABI,
                functionName: 'getUserOpHash',
                args: [userOperation]
            })

            // Firmar el hash con la EOA (owner de la Smart Account)
            const signature = await walletClient.signMessage({
                account: eoaAddress,
                message: { raw: userOpHash }
            })

            const signedUserOp = {
                ...userOperation,
                signature
            }

            const hash = await sendBundlerRequest('eth_sendUserOperation', [signedUserOp, entryPointAddress])
            setUserOpHash(hash)
            setBundlerStatus('pending')

            const included = await waitForUserOperation(hash)
            if (!included) {
                setBundlerStatus('timeout')
                throw new Error('No se pudo confirmar la inclusión de la UserOperation. Verifica el bundler.')
            }

            setBundlerStatus('included')
            setIsDeployed(true)
            onAccountCreated(smartAccountAddress)

        } catch (err) {
            console.error('Error creando smart account via bundler:', err)
            setError(err.message || 'No se pudo enviar la UserOperation')
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

            {initCode && (
                <div className="card mb-lg">
                    <h3 style={{ marginTop: 0 }}>InitCode preparado</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Este initCode se inyectará en la próxima UserOperation para que el EntryPoint llame al <strong>SimpleAccountFactory.createAccount</strong>.
                    </p>
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        wordBreak: 'break-all'
                    }}>
                        {initCode}
                    </div>
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

            {userOpHash && (
                <div className="card" style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderColor: bundlerStatus === 'included' ? 'var(--success)' : 'rgba(251, 191, 36, 0.3)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    <strong style={{ color: 'var(--success)' }}>UserOperation enviada</strong>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        Hash: {userOpHash}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Estado: {bundlerStatus === 'included' ? 'Incluida' : bundlerStatus === 'pending' ? 'Pendiente en el bundler' : 'Esperando confirmación'}
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
