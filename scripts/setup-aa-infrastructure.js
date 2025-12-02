const hre = require("hardhat");

async function main() {
    console.log("🔍 Checking ERC-4337 Infrastructure...\n");

    // EntryPoint v0.7 address (standard across all chains)
    const ENTRYPOINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

    console.log("EntryPoint v0.7:", ENTRYPOINT_V07);

    // Check if EntryPoint is deployed
    const entryPointCode = await hre.ethers.provider.getCode(ENTRYPOINT_V07);

    if (entryPointCode === "0x") {
        console.log("❌ EntryPoint NOT deployed");
        console.log("\n⚠️  Make sure Docker containers are running:");
        console.log("   docker-compose up -d");
        console.log("\nThe Alto bundler should automatically deploy the EntryPoint contract.");
    } else {
        console.log("✅ EntryPoint is deployed");
        console.log("   Code length:", entryPointCode.length, "bytes");
    }

    // Get network info
    const network = await hre.ethers.provider.getNetwork();
    console.log("\n📡 Network Information:");
    console.log("   Chain ID:", network.chainId.toString());
    console.log("   Network:", hre.network.name);

    // Get latest block
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("   Latest block:", blockNumber);

    // Get accounts
    const [deployer] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(deployer.address);

    console.log("\n👤 Deployer Account:");
    console.log("   Address:", deployer.address);
    console.log("   Balance:", hre.ethers.formatEther(balance), "ETH");

    console.log("\n💡 Next Steps:");
    console.log("1. Make sure Docker is running: docker-compose up -d");
    console.log("2. Deploy contracts: npm run deploy");
    console.log("3. Start frontend: npm run dev");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
