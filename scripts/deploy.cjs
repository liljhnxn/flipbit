const hre = require("hardhat");

async function main() {
  console.log("----------------------------------------------------");
  console.log("Deploying FlipBit to network:", hre.network.name);
  console.log("----------------------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account configured. Please ensure PRIVATE_KEY is set in your .env file."
    );
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "BOT");

  if (balance === 0n && hre.network.name !== "hardhat") {
    console.warn(
      "\n⚠️ WARNING: Deployer account has 0 BOT balance. Deployment might fail if funds are required for gas."
    );
  }

  const FlipBit = await hre.ethers.getContractFactory("FlipBit");
  const flipBit = await FlipBit.deploy();

  await flipBit.waitForDeployment();
  const contractAddress = await flipBit.getAddress();

  console.log("\n====================================================");
  console.log("✅ FlipBit deployed successfully!");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log("Explorer URL:", `https://scan.bohr.life/address/${contractAddress}`);
  console.log("====================================================\n");
  console.log("👉 Update NEXT_PUBLIC_FLIPBIT_CONTRACT_ADDRESS in your .env or src/config/contract.ts with this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
