// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SecureVoting
 * @dev Enhanced blockc
 * 
 * chain-based voting system with privacy, security, and gas optimization
 * @author VoteLink Team
 */
contract SecureVoting is ReentrancyGuard, AccessControl, Pausable {
    // Roles
    bytes32 public constant ELECTION_ADMIN_ROLE = keccak256("ELECTION_ADMIN_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // State variables (packed for gas optimization)
    struct ElectionInfo {
        uint64 startTime;
        uint64 endTime;
        uint64 totalVotes;
        bool active;
    }
    
    ElectionInfo public electionInfo;
    
    // Mappings
    mapping(bytes32 => bool) private registeredVoters;
    mapping(bytes32 => bool) private hasVoted;
    mapping(bytes32 => uint64) private voteCounts;
    mapping(bytes32 => uint64) private voteTimestamps;
    mapping(bytes32 => bytes32) private voteHashes; // voter hash => vote hash
    
    // Arrays for auditing (with gas-efficient storage)
    bytes32[] private allVoteHashes;
    bytes32[] private registeredParties;
    
    // Events (optimized for gas)
    event VoterRegistered(bytes32 indexed voterHash, uint64 timestamp);
    event VoteCast(bytes32 indexed partyHash, uint64 timestamp, bytes32 indexed voteHash);
    event ElectionStarted(uint64 startTime, uint64 endTime);
    event ElectionEndedEvent(uint64 endTime, uint64 totalVotes);
    event PartyRegistered(bytes32 indexed partyHash, string partyName);
    event EmergencyStop(address indexed admin, string reason);
    
    // Custom errors (gas efficient)
    error ElectionNotActive();
    error ElectionAlreadyActive();
    error ElectionNotStarted();
    error ElectionHasEnded();
    error VoterAlreadyRegistered();
    error VoterNotRegistered();
    error VoterAlreadyVoted();
    error InvalidHash();
    error InvalidDuration();
    error PartyNotRegistered();
    error UnauthorizedAccess();
    
    // Modifiers
    modifier onlyElectionAdmin() {
        if (!hasRole(ELECTION_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAccess();
        }
        _;
    }
    
    modifier electionIsActive() {
        ElectionInfo memory info = electionInfo;
        if (!info.active) revert ElectionNotActive();
        if (block.timestamp > info.endTime) revert ElectionHasEnded();
        _;
    }
    
    modifier validHash(bytes32 hash) {
        if (hash == bytes32(0)) revert InvalidHash();
        _;
    }
    
    /**
     * @dev Constructor - sets up roles and initial state
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ELECTION_ADMIN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
        
        // Auto-start election with a 100-year duration so votes can be cast
        // without a separate startElection() admin call.
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime   = startTime + 100 * 365 * 24 * 60 * 60;
        
        electionInfo = ElectionInfo({
            startTime: startTime,
            endTime:   endTime,
            totalVotes: 0,
            active: true
        });
    }
    
    /**
     * @dev Register a political party
     * @param partyHash Keccak256 hash of party ID
     * @param partyName Human-readable party name
     */
    function registerParty(bytes32 partyHash, string calldata partyName) 
        external 
        onlyElectionAdmin 
        validHash(partyHash) 
    {
        registeredParties.push(partyHash);
        emit PartyRegistered(partyHash, partyName);
    }
    
    /**
     * @dev Start the election with gas-optimized state updates
     * @param duration Duration of the election in seconds
     */
    function startElection(uint64 duration) external onlyElectionAdmin whenNotPaused {
        if (electionInfo.active) revert ElectionAlreadyActive();
        if (duration == 0) revert InvalidDuration();
        
        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = startTime + duration;
        
        // Gas-optimized single storage update
        electionInfo = ElectionInfo({
            startTime: startTime,
            endTime: endTime,
            totalVotes: 0,
            active: true
        });
        
        emit ElectionStarted(startTime, endTime);
    }
    
    /**
     * @dev End the election
     */
    function endElection() external onlyElectionAdmin {
        if (!electionInfo.active) revert ElectionNotActive();
        
        electionInfo.active = false;
        emit ElectionEndedEvent(uint64(block.timestamp), electionInfo.totalVotes);
    }
    
    /**
     * @dev Batch register multiple voters (gas efficient)
     * @param voterHashes Array of voter hashes
     */
    function batchRegisterVoters(bytes32[] calldata voterHashes) 
        external 
        onlyElectionAdmin 
    {
        uint256 length = voterHashes.length;
        for (uint256 i = 0; i < length;) {
            bytes32 voterHash = voterHashes[i];
            if (voterHash == bytes32(0)) revert InvalidHash();
            if (registeredVoters[voterHash]) revert VoterAlreadyRegistered();
            
            registeredVoters[voterHash] = true;
            emit VoterRegistered(voterHash, uint64(block.timestamp));
            
            unchecked { ++i; }
        }
    }
    
    /**
     * @dev Register a single voter
     * @param voterHash Keccak256 hash of voter ID
     */
    function registerVoter(bytes32 voterHash) 
        external 
        onlyElectionAdmin 
        validHash(voterHash) 
    {
        if (registeredVoters[voterHash]) revert VoterAlreadyRegistered();
        
        registeredVoters[voterHash] = true;
        emit VoterRegistered(voterHash, uint64(block.timestamp));
    }
    
    /**
     * @dev Cast a vote with enhanced security and gas optimization
     * @param voterHash Hash of the voter's ID
     * @param partyHash Hash of the party ID
     */
    function castVote(bytes32 voterHash, bytes32 partyHash) 
        external 
        electionIsActive 
        whenNotPaused 
        nonReentrant
        validHash(voterHash)
        validHash(partyHash)
    {
        if (!registeredVoters[voterHash]) revert VoterNotRegistered();
        if (hasVoted[voterHash]) revert VoterAlreadyVoted();
        
        // Mark voter as having voted
        hasVoted[voterHash] = true;
        
        // Create unique vote hash for this transaction
        bytes32 voteHash = keccak256(
            abi.encodePacked(voterHash, partyHash, block.timestamp, block.prevrandao)
        );
        
        // Store vote data
        voteHashes[voterHash] = voteHash;
        voteTimestamps[voteHash] = uint64(block.timestamp);
        allVoteHashes.push(voteHash);
        
        // Increment counters
        unchecked {
            voteCounts[partyHash] += 1;
            electionInfo.totalVotes += 1;
        }
        
        emit VoteCast(partyHash, uint64(block.timestamp), voteHash);
    }
    
    /**
     * @dev Emergency pause function
     * @param reason Reason for emergency stop
     */
    function emergencyStop(string calldata reason) external onlyElectionAdmin {
        _pause();
        emit EmergencyStop(msg.sender, reason);
    }
    
    /**
     * @dev Resume operations
     */
    function resume() external onlyElectionAdmin {
        _unpause();
    }
    
    // View functions (gas optimized)
    
    /**
     * @dev Check if a voter has voted
     */
    function hasVotedCheck(bytes32 voterHash) external view returns (bool) {
        return hasVoted[voterHash];
    }
    
    /**
     * @dev Check if a voter is registered
     */
    function isRegistered(bytes32 voterHash) external view returns (bool) {
        return registeredVoters[voterHash];
    }
    
    /**
     * @dev Get vote count for a specific party
     */
    function getVoteCount(bytes32 partyHash) external view returns (uint64) {
        return voteCounts[partyHash];
    }
    
    /**
     * @dev Get multiple vote counts at once (gas efficient)
     */
    function getBatchVoteCounts(bytes32[] calldata partyHashes) 
        external 
        view 
        returns (uint64[] memory) 
    {
        uint256 length = partyHashes.length;
        uint64[] memory counts = new uint64[](length);
        
        for (uint256 i = 0; i < length;) {
            counts[i] = voteCounts[partyHashes[i]];
            unchecked { ++i; }
        }
        
        return counts;
    }
    
    /**
     * @dev Get total number of votes cast
     */
    function getTotalVotes() external view returns (uint64) {
        return electionInfo.totalVotes;
    }
    
    /**
     * @dev Get all vote hashes (for auditing) - paginated to avoid gas limit
     */
    function getVoteHashes(uint256 offset, uint256 limit) 
        external 
        view 
        onlyRole(AUDITOR_ROLE)
        returns (bytes32[] memory) 
    {
        uint256 totalVotes = allVoteHashes.length;
        if (offset >= totalVotes) {
            return new bytes32[](0);
        }
        
        uint256 end = offset + limit;
        if (end > totalVotes) {
            end = totalVotes;
        }
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end;) {
            result[i - offset] = allVoteHashes[i];
            unchecked { ++i; }
        }
        
        return result;
    }
    
    /**
     * @dev Get vote timestamp
     */
    function getVoteTimestamp(bytes32 voteHash) external view returns (uint64) {
        return voteTimestamps[voteHash];
    }
    
    /**
     * @dev Get election status
     */
    function getElectionStatus() external view returns (
        bool active, 
        uint64 startTime, 
        uint64 endTime, 
        uint64 totalVotes
    ) {
        ElectionInfo memory info = electionInfo;
        return (info.active, info.startTime, info.endTime, info.totalVotes);
    }
    
    /**
     * @dev Get registered parties count
     */
    function getRegisteredPartiesCount() external view returns (uint256) {
        return registeredParties.length;
    }
    
    /**
     * @dev Get voter's vote hash (for verification)
     */
    function getVoterVoteHash(bytes32 voterHash) 
        external 
        view 
        onlyRole(AUDITOR_ROLE)
        returns (bytes32) 
    {
        return voteHashes[voterHash];
    }
    
    /**
     * @dev Verify vote integrity
     */
    function verifyVote(
        bytes32 voterHash, 
        bytes32 partyHash, 
        uint64 timestamp
    ) external view returns (bool) {
        bytes32 expectedHash = keccak256(
            abi.encodePacked(voterHash, partyHash, timestamp, block.prevrandao)
        );
        return voteHashes[voterHash] == expectedHash;
    }
}
