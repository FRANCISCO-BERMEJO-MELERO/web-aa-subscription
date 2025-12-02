export const SIMPLE_ACCOUNT_ABI = [
    {
        name: 'execute',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'dest', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'func', type: 'bytes' }
        ],
        outputs: []
    }
]

export const SUBSCRIPTION_MODULE_ABI = [
    {
        name: 'createSubscription',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'service', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'interval', type: 'uint256' }
        ],
        outputs: [{ name: 'subscriptionId', type: 'uint256' }]
    },
    {
        name: 'cancelSubscription',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'subscriptionId', type: 'uint256' }],
        outputs: []
    },
    {
        name: 'executePayment',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'subscriptionId', type: 'uint256' }
        ],
        outputs: []
    },
    {
        name: 'subscriptionCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'getSubscription',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'account', type: 'address' },
            { name: 'subscriptionId', type: 'uint256' }
        ],
        outputs: [
            {
                components: [
                    { name: 'service', type: 'address' },
                    { name: 'token', type: 'address' },
                    { name: 'amount', type: 'uint256' },
                    { name: 'interval', type: 'uint256' },
                    { name: 'lastPayment', type: 'uint256' },
                    { name: 'active', type: 'bool' }
                ],
                type: 'tuple'
            }
        ]
    }
]

export const ENTRY_POINT_ABI = [
    {
        name: 'getUserOpHash',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            {
                name: 'userOp',
                type: 'tuple',
                components: [
                    { name: 'sender', type: 'address' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'initCode', type: 'bytes' },
                    { name: 'callData', type: 'bytes' },
                    { name: 'accountGasLimits', type: 'bytes32' },
                    { name: 'preVerificationGas', type: 'uint256' },
                    { name: 'gasFees', type: 'bytes32' },
                    { name: 'paymasterAndData', type: 'bytes' },
                    { name: 'signature', type: 'bytes' }
                ]
            }
        ],
        outputs: [{ name: '', type: 'bytes32' }]
    },
    {
        name: 'getNonce',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'sender', type: 'address' },
            { name: 'key', type: 'uint192' }
        ],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'depositTo',
        type: 'function',
        stateMutability: 'payable',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: []
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
    }
]


