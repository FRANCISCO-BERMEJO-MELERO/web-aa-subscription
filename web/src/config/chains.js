import { defineChain } from 'viem'

export const hardhat = defineChain({
    id: 31337,
    name: 'Hardhat',
    network: 'hardhat',
    nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: {
            http: ['http://127.0.0.1:8545'],
        },
        public: {
            http: ['http://127.0.0.1:8545'],
        },
    },
    blockExplorers: {
        default: { name: 'Explorer', url: 'http://localhost' },
    },
    testnet: true,
})
