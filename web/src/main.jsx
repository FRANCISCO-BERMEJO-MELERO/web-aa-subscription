import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { hardhat } from './config/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected } from 'wagmi/connectors'
import App from './App'
import './index.css'

// Configure Wagmi with injected connector (MetaMask)
const config = createConfig({
    chains: [hardhat],
    connectors: [
        injected({ target: 'metaMask' }),
    ],
    transports: {
        [hardhat.id]: http(),
    },
})

// Create React Query client
const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </WagmiProvider>
    </React.StrictMode>,
)
