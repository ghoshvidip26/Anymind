const { ethers } = require("hardhat");

async function main() {
    // Deploy AgentRegistry
    const AgentRegistry = await ethers.getContractFactory(
        "AgentRegistry"
    );
    const registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddr = await registry.getAddress();
    console.log("AgentRegistry deployed to:", registryAddr);

    // Deploy Reputation
    const Reputation = await ethers.getContractFactory(
        "Reputation"
    );
    const reputation = await Reputation.deploy();
    await reputation.waitForDeployment();
    const reputationAddr = await reputation.getAddress();
    console.log("Reputation deployed to:", reputationAddr);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
