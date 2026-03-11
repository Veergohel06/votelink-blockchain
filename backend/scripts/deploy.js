const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying SecureVoting contract...");

  // Get the contract factory
  const SecureVoting = await hre.ethers.getContractFactory("SecureVoting");

  // Deploy the contract
  const voting = await SecureVoting.deploy();

  await voting.waitForDeployment();

  const address = await voting.getAddress();

  console.log("✅ SecureVoting deployed to:", address);
  console.log("\n📝 Next steps:");
  console.log("1. Copy the contract address above");
  console.log("2. Update frontend/src/services/blockchainService.ts");
  console.log("   - Replace CONTRACT_ADDRESS with:", address);

  // Election starts automatically in the constructor — no separate call needed.
  const electionInfo = await voting.electionInfo();
  console.log("\n📊 Election Status:");
  console.log("Active:", electionInfo.active);
  console.log("Start Time:", new Date(Number(electionInfo.startTime) * 1000).toLocaleString());
  console.log("End Time:", new Date(Number(electionInfo.endTime) * 1000).toLocaleString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
