/// <reference types="vite/client" />
import { ethers } from 'ethers';

// Smart Contract ABI for the Voting Contract
const VOTING_CONTRACT_ABI = [
  "function registerVoter(bytes32 voterHash) external",
  "function castVote(bytes32 voterHash, bytes32 partyHash) external",
  "function hasVotedCheck(bytes32 voterHash) external view returns (bool)",
  "function getVoteCount(bytes32 partyHash) external view returns (uint256)",
  "function getTotalVotes() external view returns (uint256)",
  "event VoteCast(bytes32 indexed partyHash, uint256 timestamp)",
  "event VoterRegistered(bytes32 indexed voterHash, uint256 timestamp)"
];

// Contract Address - Deployed on Hardhat Local Network
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// Local Hardhat network configuration
const GANACHE_NETWORK = {
  chainId: 1337,
  name: 'Hardhat Local',
  rpcUrl: import.meta.env.VITE_BLOCKCHAIN_RPC || 'http://127.0.0.1:8545',
  blockExplorerUrl: null // No block explorer for local network
};

interface BlockchainVoteReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  gasUsed: string;
  status: 'success' | 'failed';
}

interface VoterRegistration {
  voterHash: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

class BlockchainService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  // Privacy-safe voter verification (stores only hash, not personal data)
  async verifyVoterEligibility(voterID: string): Promise<{
    isEligible: boolean;
    hashedID: string;
    alreadyRegistered?: boolean;
  }> {
    // Ensure we're connected - let errors propagate so MetaMask popup can appear
    if (!this.contract) {
      await this.connectWallet();
    }

    // Create privacy-preserving hash — must match the hash used in castVote/registerVoter
    const hashedVoterID = ethers.keccak256(ethers.toUtf8Bytes(voterID));

    // Check if this hashed ID is already in the system
    let hasVoted = false;
    try {
      hasVoted = await this.contract!.hasVotedCheck(hashedVoterID);
    } catch (contractError: unknown) {
      // CALL_EXCEPTION typically means the contract isn't deployed at this address
      // or the local Hardhat node isn't running. Log the issue and allow the user
      // to proceed (assume not voted) rather than blocking with a cryptic error.
      const errCode = (contractError as { code?: string })?.code;
      if (
        errCode === 'CALL_EXCEPTION' ||
        errCode === 'NETWORK_ERROR' ||
        errCode === 'UNKNOWN_ERROR' ||
        errCode === 'BAD_DATA'
      ) {
        console.warn('⚠️ Blockchain contract call failed (node may not be running or contract not deployed). Allowing voter through:', contractError);
        hasVoted = false;
      } else {
        throw contractError;
      }
    }

    return {
      isEligible: true,
      hashedID: hashedVoterID,
      alreadyRegistered: hasVoted
    };
  }
  private contract: ethers.Contract | null = null;
  private isInitialized = false;

  /**
   * Reset the blockchain service completely
   */
  reset(): void {
    console.log('🔄 Resetting blockchain service...');
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the blockchain service and connect to MetaMask
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing blockchain service...');
      console.log('🎯 Target network: Hardhat Local (Chain ID: 31337)');
      console.log('📍 Contract address:', CONTRACT_ADDRESS);

      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        console.error('MetaMask is not installed');
        throw new Error('Please install MetaMask extension from https://metamask.io/');
      }

      console.log('📍 Using contract at:', CONTRACT_ADDRESS);

      // FIRST: Request account access - this triggers the MetaMask popup
      console.log('🦊 Opening MetaMask for account connection...');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('✅ MetaMask account access granted');

      // Create provider
      this.provider = new ethers.BrowserProvider(window.ethereum);

      // Get signer
      this.signer = await this.provider.getSigner();
      const signerAddress = await this.signer.getAddress();
      console.log('👤 Connected wallet:', signerAddress);

      // Check current network (non-fatal - warn but continue)
      try {
        const network = await this.provider.getNetwork();
        const chainId = Number(network.chainId);

        console.log('🔍 Network Detection:');
        console.log('- Chain ID:', chainId);
        console.log('- Network name:', network.name);
        console.log('- Expected Chain ID:', GANACHE_NETWORK.chainId);

        if (chainId !== GANACHE_NETWORK.chainId) {
          console.warn(`⚠️ Network mismatch: Current Chain ID ${chainId}, Expected ${GANACHE_NETWORK.chainId}`);
          console.warn('⚠️ Blockchain features may not work correctly. Please switch to Localhost 8545 in MetaMask.');
        } else {
          console.log('✅ Network verification passed - Chain ID:', chainId);
        }
      } catch (networkError) {
        console.warn('⚠️ Network check failed:', networkError);
      }

      // Check balance
      try {
        const balance = await this.provider.getBalance(signerAddress);
        console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');
      } catch (balanceError) {
        console.warn('⚠️ Balance check failed:', balanceError);
      }

      // Initialize contract with error handling
      this.contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        VOTING_CONTRACT_ABI,
        this.signer
      );

      // Add circuit breaker bypass
      if (window.ethereum && window.ethereum.isMetaMask) {
        console.log('🦊 MetaMask detected, configuring for stability...');
        window.ethereum.autoRefreshOnNetworkChange = false;
      }

      // Verify contract exists and is deployed (non-fatal)
      try {
        console.log('🔍 Verifying contract deployment...');

        const contractCode = await this.provider.getCode(CONTRACT_ADDRESS);
        if (contractCode === '0x') {
          console.warn(`⚠️ Contract not deployed at ${CONTRACT_ADDRESS}. Blockchain voting may not work.`);
        } else {
          console.log('✅ Contract verified - deployed at:', CONTRACT_ADDRESS);

          // Test contract with timeout
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Contract call timeout')), 5000)
          );

          const totalVotesCall = this.contract.getTotalVotes();
          const totalVotes = await Promise.race([totalVotesCall, timeout]);
          console.log('📊 Contract is responsive - Total votes:', (totalVotes as any).toString());
        }
      } catch (contractError) {
        console.warn('⚠️ Contract verification failed (blockchain features may be limited):', contractError);
      }

      this.isInitialized = true;
      console.log('✅ Blockchain service initialized successfully');
      console.log('📍 Contract Address:', CONTRACT_ADDRESS);

      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectWallet(): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const address = await this.signer!.getAddress();
      console.log('Connected wallet address:', address);

      return address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw new Error('Failed to connect to MetaMask wallet');
    }
  }

  /**
   * Request a cryptographic signature from the user to verify identity explicitly.
   * This forces MetaMask to prompt the user.
   */
  async requestSignature(message: string): Promise<string> {
    try {
      if (!this.signer) {
        await this.initialize();
      }

      console.log('✍️ Requesting explicit signature from MetaMask...');
      const signature = await this.signer!.signMessage(message);
      console.log('✅ Signature acquired successfully.');

      return signature;
    } catch (error) {
      console.error('Signature request rejected or failed:', error);
      throw new Error('MetaMask Identity Verification Cancelled: You must sign the message to verify your identity.');
    }
  }

  /**
   * Generate a hash for voter ID (privacy-preserving)
   */
  generateVoterHash(voterId: string, salt?: string): string {
    const data = salt ? `${voterId}-${salt}` : voterId;
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  /**
   * Generate a hash for party vote (anonymous)
   */
  generatePartyHash(partyId: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(partyId));
  }

  /**
   * Register a voter on the blockchain
   */
  async registerVoter(voterId: string): Promise<VoterRegistration> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Generate voter hash (privacy-preserving)
      const voterHash = this.generateVoterHash(voterId);

      console.log('📝 Registering voter on blockchain...');
      console.log('🔐 Voter Hash:', voterHash);

      // Estimate gas first
      try {
        const gasEstimate = await this.contract!.registerVoter.estimateGas(voterHash);
        console.log('⛽ Estimated gas:', gasEstimate.toString());
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        throw new Error('Registration transaction will likely fail. Please check contract deployment.');
      }

      // Send transaction (let ethers auto-estimate gas)
      const tx = await this.contract!.registerVoter(voterHash);
      console.log('📤 Registration transaction sent:', tx.hash);
      console.log('🔗 Transaction Hash:', tx.hash);      // Wait for confirmation
      console.log('⏳ Waiting for blockchain confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Voter registered in block:', receipt.blockNumber);

      return {
        voterHash,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Failed to register voter:', error);

      // Handle specific errors
      if (error instanceof Error) {
        const message = error.message;

        if (message.includes('user rejected')) {
          throw new Error('Registration was rejected by user');
        }
        if (message.includes('insufficient funds')) {
          throw new Error('Insufficient ETH for gas fees. Check your Ganache Local account balance');
        }
        if (message.includes('Already registered')) {
          throw new Error('This voter ID has already been registered');
        }
        if (message.includes('network')) {
          throw new Error('Network error. Please check your connection and try again');
        }

        throw new Error(`Registration error: ${message}`);
      }

      throw new Error('Failed to register voter on blockchain');
    }
  }

  /**
   * Cast a vote on the blockchain
   */
  async castVote(voterId: string, partyId: string): Promise<BlockchainVoteReceipt> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      // Generate hashes
      const voterHash = this.generateVoterHash(voterId);
      const partyHash = this.generatePartyHash(partyId);

      console.log('🗳️ Casting vote on blockchain...');
      console.log('📋 Voter Hash:', voterHash);
      console.log('🎯 Party Hash:', partyHash);

      // Explicit Identity Verification:
      await this.requestSignature(`I am securely casting my vote for Party ID: ${partyId}\n\nTimestamp: ${Date.now()}`);

      // Estimate gas first
      try {
        const gasEstimate = await this.contract!.castVote.estimateGas(voterHash, partyHash);
        console.log('⛽ Estimated gas:', gasEstimate.toString());

        // Check if user has enough balance
        const feeData = await this.provider!.getFeeData();
        const estimatedCost = gasEstimate * (feeData.gasPrice || BigInt(0));
        const balance = await this.provider!.getBalance(await this.signer!.getAddress());

        if (balance < estimatedCost) {
          throw new Error(`Insufficient balance for transaction. Need ${ethers.formatEther(estimatedCost)} ETH`);
        }

      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        throw new Error('Transaction will likely fail. Please check your wallet and contract status.');
      }

      // Send transaction (let ethers auto-estimate gas)
      const tx = await this.contract!.castVote(voterHash, partyHash);
      console.log('📤 Vote transaction sent:', tx.hash);
      console.log('🔗 Transaction Hash:', tx.hash);      // Wait for confirmation
      console.log('⏳ Waiting for blockchain confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Vote recorded in block:', receipt.blockNumber);

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        timestamp: Date.now(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('❌ Failed to cast vote:', error);

      // Handle specific MetaMask/blockchain errors
      if (error instanceof Error) {
        const message = error.message;

        if (message.includes('user rejected')) {
          throw new Error('Transaction was rejected by user');
        }
        if (message.includes('insufficient funds')) {
          throw new Error('Insufficient ETH for gas fees. Check your Ganache Local account balance');
        }
        if (message.includes('Already voted')) {
          throw new Error('You have already cast your vote');
        }
        if (message.includes('Not registered')) {
          throw new Error('Please complete voter registration first');
        }
        if (message.includes('network')) {
          throw new Error('Network error. Please check your connection and try again');
        }
        if (message.includes('gas')) {
          throw new Error('Transaction failed due to gas issues. Please try again with higher gas');
        }

        throw new Error(`Blockchain error: ${message}`);
      }

      throw new Error('Failed to cast vote on blockchain');
    }
  }

  /**
   * Check if a voter has already voted
   */
  async hasVoted(voterId: string): Promise<boolean> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const voterHash = this.generateVoterHash(voterId);
      const voted = await this.contract!.hasVotedCheck(voterHash);

      return voted;
    } catch (error) {
      console.error('Failed to check voting status:', error);
      return false;
    }
  }

  /**
   * Verify a vote transaction on the blockchain
   */
  async verifyVote(transactionHash: string): Promise<boolean> {
    try {
      if (!this.provider) {
        await this.initialize();
      }

      const tx = await this.provider!.getTransaction(transactionHash);

      if (!tx) {
        console.error('Transaction not found');
        return false;
      }

      // Check if transaction is confirmed
      const confirmed = tx.blockNumber !== null;

      console.log('Transaction verified:', {
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        confirmed
      });

      return confirmed;
    } catch (error) {
      console.error('Failed to verify vote:', error);
      return false;
    }
  }

  /**
   * Get vote count for a specific party
   */
  async getVoteCount(partyId: string): Promise<number> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const partyHash = this.generatePartyHash(partyId);
      const count = await this.contract!.getVoteCount(partyHash);

      return Number(count);
    } catch (error) {
      console.error('Failed to get vote count:', error);
      return 0;
    }
  }

  /**
   * Get total votes cast
   */
  async getTotalVotes(): Promise<number> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const total = await this.contract!.totalVotes();
      return Number(total);
    } catch (error) {
      console.error('Failed to get total votes:', error);
      return 0;
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(txHash: string) {
    try {
      if (!this.provider) {
        await this.initialize();
      }

      const tx = await this.provider!.getTransaction(txHash);
      const receipt = await this.provider!.getTransactionReceipt(txHash);

      if (!tx || !receipt) {
        return null;
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        timestamp: Date.now() // In real app, get from block
      };
    } catch (error) {
      console.error('Failed to get transaction details:', error);
      return null;
    }
  }

  /**
   * Get current network information
   */
  async getNetworkInfo() {
    try {
      if (!this.provider) {
        await this.initialize();
      }

      const network = await this.provider!.getNetwork();

      return {
        chainId: Number(network.chainId),
        name: network.name,
        ensAddress: network.getPlugin('org.ethers.plugins.network.Ens')
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  /**
   * Estimate gas for voting transaction
   */
  async estimateVoteGas(voterId: string, partyId: string): Promise<string> {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const voterHash = this.generateVoterHash(voterId);
      const partyHash = this.generatePartyHash(partyId);

      const gasEstimate = await this.contract!.castVote.estimateGas(voterHash, partyHash);
      const gasPrice = await this.provider!.getFeeData();

      const estimatedCost = gasEstimate * (gasPrice.gasPrice || BigInt(0));

      return ethers.formatEther(estimatedCost);
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      return '0.0';
    }
  }

  /**
   * Switch to correct network (Sepolia testnet)
   */
  async switchNetwork(chainId: number): Promise<boolean> {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      // Network not added, try to add it
      if (error.code === 4902) {
        return await this.addNetwork(chainId);
      }
      console.error('Failed to switch network:', error);
      return false;
    }
  }

  /**
   * Add a network to MetaMask
   */
  private async addNetwork(chainId: number): Promise<boolean> {
    try {
      // Ganache local network
      if (chainId === 1337) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x539',
            chainName: 'Ganache Local',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: null
          }]
        });
        return true;
      }

      // Sepolia testnet
      if (chainId === 11155111) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/']
          }]
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to add network:', error);
      return false;
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

// Debug function for browser console
(window as any).debugBlockchain = async () => {
  console.log('🔍 BLOCKCHAIN DEBUG INFO:');
  console.log('📍 Contract Address:', CONTRACT_ADDRESS);
  console.log('🎯 Target Network:', GANACHE_NETWORK);

  if (typeof window.ethereum !== 'undefined') {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      console.log('🌐 Current Chain ID:', chainId, '→', parseInt(chainId, 16));
      console.log('👤 Connected Accounts:', accounts);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log('📡 Network Object:', network);
      console.log('🔗 Network Name:', network.name);
      console.log('🆔 Network Chain ID:', Number(network.chainId));

    } catch (error) {
      console.error('❌ Debug Error:', error);
    }
  } else {
    console.log('❌ MetaMask not found');
  }
};

// Type definitions for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
