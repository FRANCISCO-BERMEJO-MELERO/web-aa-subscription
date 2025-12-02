// Contract addresses - update these after deployment
export const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'

// These will be populated from deployment artifacts
export const contracts = {
    subscriptionModule: {
        address: import.meta.env.VITE_SUBSCRIPTION_MODULE_ADDRESS || '',
    },
    subscriptionService: {
        address: import.meta.env.VITE_SUBSCRIPTION_SERVICE_ADDRESS || '',
    },
    mockToken: {
        address: import.meta.env.VITE_MOCK_TOKEN_ADDRESS || '',
    },
}

// Bundler configuration
export const BUNDLER_URL = import.meta.env.VITE_BUNDLER_URL || 'http://127.0.0.1:4337'

// Load deployment info if available
export async function loadDeploymentInfo() {
    try {
        const response = await fetch('/deployments/localhost.json')
        if (response.ok) {
            const data = await response.json()
            return data  // Return full deployment info, not just contracts
        }
    } catch (error) {
        console.warn('Could not load deployment info:', error)
    }
    return null
}
