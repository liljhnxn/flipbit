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

  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("25", "gwei");
  console.log("Current network gas price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");

  const FlipBit = await hre.ethers.getContractFactory("FlipBit");
  const estimatedGas = await hre.ethers.provider.estimateGas(await FlipBit.getDeployTransaction());
  const estimatedCost = estimatedGas * gasPrice;
  console.log("Estimated deployment gas:", estimatedGas.toString());
  console.log("Estimated deployment fee:", hre.ethers.formatEther(estimatedCost), "BOT");

  if (balance < estimatedCost && hre.network.name !== "hardhat") {
    throw new Error(
      `Insufficient BOT for gas. Account balance is ${hre.ethers.formatEther(balance)} BOT, but estimated deployment cost is ${hre.ethers.formatEther(estimatedCost)} BOT. Please fund ${deployer.address} with at least ${hre.ethers.formatEther(estimatedCost)} BOT.`
    );
  }

  // Deploy with exact gas parameters to prevent overpaying
  const flipBit = await FlipBit.deploy({
    gasPrice: gasPrice,
  });

  await flipBit.waitForDeployment();
  const contractAddress = await flipBit.getAddress();

  const network = await hre.ethers.provider.getNetwork();
  const explorerBase = "https://scan.botchain.ai";

  console.log("\n====================================================");
  console.log("✅ FlipBit deployed successfully!");
  console.log("Contract Address:", contractAddress);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Explorer URL:", `${explorerBase}/address/${contractAddress}`);
  console.log("====================================================\n");
  console.log("👉 Update NEXT_PUBLIC_FLIPBIT_CONTRACT_ADDRESS in your .env or src/config/contract.ts with this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
