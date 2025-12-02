# Smart Account Subscription System

A demonstration project for learning ERC-4337 (Account Abstraction) and ERC-7579 (Modular Smart Accounts) with automated subscription payments.

## 🎯 Features

- **ERC-4337 Account Abstraction**: Create smart accounts controlled by your EOA
- **ERC-7579 Modular Architecture**: Install/uninstall modules dynamically
- **Automated Subscriptions**: Hourly recurring payments without manual approval
- **Session Keys**: Secure payment automation with policy-based permissions
- **Modern UI**: Premium dark theme with React + Vite

## 🏗️ Architecture

```
├── contracts/              # Solidity smart contracts
│   ├── SubscriptionModule.sol    # ERC-7579 subscription module
│   ├── SubscriptionService.sol   # Service contract for plans
│   └── MockERC20.sol             # Test token
├── scripts/               # Deployment scripts
├── web/                   # React frontend
│   └── src/
│       ├── components/    # React components
│       ├── config/        # Configuration files
│       └── App.jsx        # Main application
└── docker-compose.yml     # Local AA infrastructure
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker Desktop
- Git

### Installation

1. **Clone and install dependencies:**
```bash
cd AA-dApp-Sergio
npm install
cd web && npm install && cd ..
```

2. **Start Docker infrastructure:**
```bash
docker-compose up -d
```

This starts:
- Anvil (local Ethereum node)
- Alto bundler (ERC-4337 bundler)

3. **Verify AA infrastructure:**
```bash
npm run setup-aa
```

4. **Deploy contracts:**
```bash
npm run deploy
```

5. **Start frontend:**
```bash
npm run dev
```

6. **Open browser:**
Navigate to `http://localhost:3000`

## 📖 Usage

### 1. Connect Wallet
- Click "Connect Wallet" in the top right
- Select your wallet (MetaMask, etc.)
- Make sure you're on the Hardhat network (Chain ID: 31337)

### 2. Create Smart Account
- Click "Create Smart Account"
- Approve the transaction
- Your ERC-4337 smart account will be deployed

### 3. Subscribe to a Plan
- Choose from Basic, Premium, or Token plans
- Review the session key policies
- Click "Subscribe Now"
- Approve the initial payment

### 4. Automated Payments
- Payments will be executed automatically every hour
- Use "Trigger Payment (Test)" to manually test a payment
- View payment history in real-time

### 5. Manage Subscription
- Cancel anytime with "Cancel Subscription"
- Subscription module can be uninstalled from your smart account

## 🔧 Development

### Project Structure

**Smart Contracts:**
- `SubscriptionModule.sol`: ERC-7579 module for subscription management
- `SubscriptionService.sol`: Manages plans and receives payments
- `MockERC20.sol`: Test ERC20 token (USDC)

**Frontend:**
- **RainbowKit + Wagmi**: EOA wallet connection
- **Viem**: Ethereum interactions
- **Permissionless.js**: Smart account SDK
- **React**: UI framework

### Available Scripts

```bash
# Root directory
npm run compile        # Compile contracts
npm run deploy         # Deploy contracts
npm run setup-aa       # Verify AA infrastructure
npm run test           # Run contract tests
npm run dev            # Start frontend

# Frontend directory (web/)
npm run dev            # Start dev server
npm run build          # Build for production
```

### Testing

Run contract tests:
```bash
npx hardhat test
```

### Configuration

Environment variables (`.env`):
```env
VITE_RPC_URL=http://127.0.0.1:8545
VITE_BUNDLER_URL=http://127.0.0.1:4337
VITE_SUBSCRIPTION_MODULE_ADDRESS=<from deployment>
VITE_SUBSCRIPTION_SERVICE_ADDRESS=<from deployment>
```

## 📚 Learn More

### ERC-4337 (Account Abstraction)
- [EIP-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- Enables smart contract wallets
- User operations instead of transactions
- Bundlers aggregate and submit operations

### ERC-7579 (Modular Smart Accounts)
- [ERC-7579 Specification](https://eips.ethereum.org/EIPS/eip-7579)
- Standardizes module interfaces
- Plug-and-play functionality
- Validators, executors, hooks, and fallbacks

### Session Keys
- Delegate specific permissions to keys
- Policy-based restrictions (amount, recipient, time)
- Enable automated transactions
- Revocable at any time

## 🛠️ Tech Stack

- **Solidity 0.8.23**: Smart contract language
- **Hardhat**: Development environment
- **React 18**: Frontend framework
- **Vite**: Build tool
- **RainbowKit**: Wallet connection
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript Ethereum library
- **Docker**: Local infrastructure

## ⚠️ Important Notes

- This is a **learning/demo project** - not production ready
- Uses hourly payments for testing (production would use monthly/yearly)
- Simplified smart account creation (production needs full AA SDK integration)
- Local testing only - not deployed to mainnet/testnet

## 🤝 Contributing

This is a learning project. Feel free to:
- Report issues
- Suggest improvements
- Fork and experiment
- Share your learnings

## 📝 License

MIT

## 🙏 Acknowledgments

- ZeroDev for Kernel smart account implementation
- Pimlico for Alto bundler
- OpenZeppelin for contract libraries
- Ethereum Foundation for ERC standards

---

Built with ❤️ for learning Account Abstraction
# web-aa-subscription
