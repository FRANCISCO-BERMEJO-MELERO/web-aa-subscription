const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying contracts...\n");

    // Deploy MockERC20 for testing
    console.log("📝 Deploying MockERC20...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy();
    await mockToken.waitForDeployment();
    const mockTokenAddress = await mockToken.getAddress();
    console.log("✅ MockERC20 deployed to:", mockTokenAddress);

    // Deploy SubscriptionModule
    console.log("\n📝 Deploying SubscriptionModule...");
    const SubscriptionModule = await hre.ethers.getContractFactory("SubscriptionModule");
    const subscriptionModule = await SubscriptionModule.deploy();
    await subscriptionModule.waitForDeployment();
    const subscriptionModuleAddress = await subscriptionModule.getAddress();
    console.log("✅ SubscriptionModule deployed to:", subscriptionModuleAddress);

    // Deploy SubscriptionService
    console.log("\n📝 Deploying SubscriptionService...");
    const SubscriptionService = await hre.ethers.getContractFactory("SubscriptionService");
    const subscriptionService = await SubscriptionService.deploy();
    await subscriptionService.waitForDeployment();
    const subscriptionServiceAddress = await subscriptionService.getAddress();
    console.log("✅ SubscriptionService deployed to:", subscriptionServiceAddress);

    // Create subscription plans
    console.log("\n📝 Creating subscription plans...");

    // Plan 1: Basic - 0.001 ETH per hour
    const basicTx = await subscriptionService.createPlan(
        "Basic Plan",
        hre.ethers.parseEther("0.001"),
        3600, // 1 hour in seconds
        hre.ethers.ZeroAddress // ETH
    );
    await basicTx.wait();
    console.log("✅ Created Basic Plan (0.001 ETH/hour)");

    // Plan 2: Premium - 0.002 ETH per hour
    const premiumTx = await subscriptionService.createPlan(
        "Premium Plan",
        hre.ethers.parseEther("0.002"),
        3600, // 1 hour
        hre.ethers.ZeroAddress // ETH
    );
    await premiumTx.wait();
    console.log("✅ Created Premium Plan (0.002 ETH/hour)");

    // Plan 3: Token Plan - 10 USDC per hour
    const tokenTx = await subscriptionService.createPlan(
        "Token Plan",
        hre.ethers.parseEther("10"),
        3600, // 1 hour
        mockTokenAddress // Mock USDC
    );
    await tokenTx.wait();
    console.log("✅ Created Token Plan (10 USDC/hour)");

    // Save deployment addresses
    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        contracts: {
            MockERC20: mockTokenAddress,
            SubscriptionModule: subscriptionModuleAddress,
            SubscriptionService: subscriptionServiceAddress,
        },
        plans: [
            {
                id: 0,
                name: "Basic Plan",
                price: "0.001 ETH",
                interval: "1 hour"
            },
            {
                id: 1,
                name: "Premium Plan",
                price: "0.002 ETH",
                interval: "1 hour"
            },
            {
                id: 2,
                name: "Token Plan",
                price: "10 USDC",
                interval: "1 hour"
            }
        ],
        timestamp: new Date().toISOString()
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n📄 Deployment info saved to:", deploymentPath);
    console.log("\n✨ Deployment complete!\n");
    console.log("Contract Addresses:");
    console.log("-------------------");
    console.log("MockERC20:", mockTokenAddress);
    console.log("SubscriptionModule:", subscriptionModuleAddress);
    console.log("SubscriptionService:", subscriptionServiceAddress);
    console.log("\nUpdate your .env file with these addresses!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
