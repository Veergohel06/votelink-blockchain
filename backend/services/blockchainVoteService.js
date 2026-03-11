/**
 * Backend Blockchain Vote Service
 * Signs transactions using the admin (deployer) key so voters don't need MetaMask.
 * Handles registerVoter + castVote on behalf of verified voters.
 */

const { ethers } = require('ethers');
const path = require('path');

// Load full ABI from hardhat artifact
let CONTRACT_ABI;
try {
  const artifact = require(path.join(__dirname, '../artifacts/contracts/SecureVoting.sol/SecureVoting.json'));
  CONTRACT_ABI = artifact.abi;
} catch {
  // Fallback minimal ABI
  CONTRACT_ABI = [
    "function registerVoter(bytes32 voterHash) external",
    "function castVote(bytes32 voterHash, bytes32 partyHash) external",
    "function isRegistered(bytes32 voterHash) external view returns (bool)",
    "function hasVotedCheck(bytes32 voterHash) external view returns (bool)",
    "function startElection(uint64 duration) external",
    "function electionInfo() external view returns (uint64 startTime, uint64 endTime, uint64 totalVotes, bool active)"
  ];
}

const CONTRACT_ADDRESS = process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const BLOCKCHAIN_RPC   = process.env.BLOCKCHAIN_RPC || 'http://127.0.0.1:8545';

// Hardhat account #0 — publicly known key, local dev only.
// Override with DEPLOYER_PRIVATE_KEY env var for any other network.
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

class BackendBlockchainService {
  async _getContract() {
    const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC);
    const wallet   = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);

    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      throw new Error(
        `Contract not deployed at ${CONTRACT_ADDRESS}. ` +
        `Run: cd backend && npx hardhat node  (then in another terminal) ` +
        `npx hardhat run scripts/deploy.js --network localhost`
      );
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    return { provider, wallet, contract };
  }

  _voterHash(voterId) {
    return ethers.keccak256(ethers.toUtf8Bytes(voterId));
  }

  _partyHash(partyId) {
    return ethers.keccak256(ethers.toUtf8Bytes(partyId));
  }

  async _ensureElectionActive(contract) {
    const info = await contract.electionInfo();
    const now  = BigInt(Math.floor(Date.now() / 1000));

    if (info.active && info.endTime > now) return; // already active

    // If ended or not started, start a new 100-year election
    if (info.active && info.endTime <= now) {
      const endTx = await contract.endElection();
      await endTx.wait();
    }

    console.log('⏳ Starting blockchain election (100-year duration)...');
    const duration = BigInt(100 * 365 * 24 * 60 * 60);
    const tx = await contract.startElection(duration);
    await tx.wait();
    console.log('✅ Blockchain election started');
  }

  /**
   * Record a vote on the blockchain.
   * Registers the voter (if needed) and casts the vote using the admin key.
   *
   * @param {string} voterId  Plain voter ID string
   * @param {string} partyId  Party/candidate ID string
   * @returns {{ transactionHash: string, blockNumber: number, blockHash: string }}
   */
  async recordVote(voterId, partyId) {
    const { contract } = await this._getContract();

    const voterHash = this._voterHash(voterId);
    const partyHash = this._partyHash(partyId);

    // Make sure election is active before attempting transactions
    await this._ensureElectionActive(contract);

    // Fetch nonce once and increment manually for sequential transactions
    const walletAddress = await contract.runner.getAddress();
    let nonce = await contract.runner.provider.getTransactionCount(walletAddress, 'pending');

    // Register voter if not already registered
    let alreadyRegistered = false;
    try {
      alreadyRegistered = await contract.isRegistered(voterHash);
    } catch {
      alreadyRegistered = false;
    }

    if (!alreadyRegistered) {
      console.log('📝 Registering voter on blockchain…');
      const regTx = await contract.registerVoter(voterHash, { nonce: nonce++ });
      await regTx.wait();
      console.log('✅ Voter registered on blockchain');
    } else {
      console.log('ℹ️  Voter already registered on blockchain');
    }

    // Cast the vote
    console.log('🗳️  Casting vote on blockchain…');
    const voteTx = await contract.castVote(voterHash, partyHash, { nonce });
    const receipt = await voteTx.wait();
    console.log('✅ Vote cast on blockchain, tx:', voteTx.hash);

    return {
      transactionHash: voteTx.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash
    };
  }
}

module.exports = new BackendBlockchainService();
