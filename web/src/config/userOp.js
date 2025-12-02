import { toHex } from 'viem'

const toHexUint = (value) => {
    if (typeof value === 'string' && value.startsWith('0x')) return value
    return toHex(BigInt(value))
}

export const packAccountGasLimits = (verificationGasLimit, callGasLimit) => {
    const v = BigInt(verificationGasLimit)
    const c = BigInt(callGasLimit)
    return toHex((v << 128n) | c, { size: 32 })
}

export const packGasFees = (maxPriorityFeePerGas, maxFeePerGas) => {
    const p = BigInt(maxPriorityFeePerGas)
    const m = BigInt(maxFeePerGas)
    return toHex((p << 128n) | m, { size: 32 })
}

export const buildUserOperation = ({
    sender,
    nonce,
    initCode,
    callData,
    verificationGasLimit,
    callGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymasterAndData = '0x',
    signature = '0x'
}) => ({
    sender,
    nonce: toHexUint(nonce ?? 0),
    initCode,
    callData,
    accountGasLimits: packAccountGasLimits(verificationGasLimit, callGasLimit),
    preVerificationGas: toHexUint(preVerificationGas),
    gasFees: packGasFees(maxPriorityFeePerGas, maxFeePerGas),
    paymasterAndData,
    signature
})


