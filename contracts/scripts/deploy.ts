import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AgentRegistry with account:", deployer.address);
  console.log("Network:", network.name);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("AgentRegistry deployed to:", address);

  // Write address to file for other scripts to read
  const deploymentInfo = {
    network: network.name,
    address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also update backend .env hint
  console.log("\n=================================================");
  console.log("Add this to your backend/.env:");
  console.log(`REGISTRY_CONTRACT_ADDRESS=${address}`);
  console.log("=================================================\n");

  // Verify on Basescan
  if (process.env.BASESCAN_API_KEY && process.env.BASESCAN_API_KEY !== "placeholder") {
    console.log("Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 15000));
    try {
      const { run } = await import("hardhat");
      await run("verify:verify", { address, constructorArguments: [] });
      console.log("Contract verified on Basescan");
    } catch (e: any) {
      console.log("Verification failed (may already be verified):", e.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
