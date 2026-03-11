const { User, Vote, Session, AuditLog } = require('../models');
const { sendSignupOTP, sendSigninOTPEmail } = require("../utils/emailService");
const asynchandler = require("../utils/asynchandler");
const blockchainVoteService = require('../services/blockchainVoteService');
const apiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const {
  generateOTP,
  generateOTPExpiry,
  verifyOTP,
  canResendOTP,
} = require("../utils/otpGenerator");

// Check if voter is already registered
exports.checkRegistrationStatus = async (req, res) => {
  try {
    const { email, mobile, voterID } = req.query;

    if (!email && !mobile && !voterID) {
      return res.status(400).json({
        success: false,
        error: 'At least one parameter (email, mobile, or voterID) is required'
      });
    }

    const results = {
      email: { exists: false, message: 'Available' },
      mobile: { exists: false, message: 'Available' },
      voterID: { exists: false, message: 'Available' }
    };

    // Check email
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const userByEmail = await User.findOne({ email: normalizedEmail });
      results.email.exists = !!userByEmail;
      results.email.message = userByEmail ? 'Already registered' : 'Available';
    }

    // Check mobile
    if (mobile) {
      const cleanMobile = mobile.replace(/\D/g, '');
      const userByMobile = await User.findOne({ mobile: cleanMobile });
      results.mobile.exists = !!userByMobile;
      results.mobile.message = userByMobile ? 'Already registered' : 'Available';
    }

    // Check voterID
    if (voterID) {
      const cleanVoterID = voterID.toUpperCase().trim();
      const userByVoterID = await User.findOne({ voterID: cleanVoterID });
      results.voterID.exists = !!userByVoterID;
      results.voterID.message = userByVoterID ? 'Already registered' : 'Available';
    }

    const anyExists = results.email.exists || results.mobile.exists || results.voterID.exists;

    res.json({
      success: true,
      available: !anyExists,
      results
    });
  } catch (error) {
    console.error('Check registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check registration status'
    });
  }
};

// Create or update user
exports.createOrUpdateUser = async (req, res) => {
  try {
    const {
      email,
      mobile,
      voterID,
      name,
      role,
      username,
      fullname,
      password,
      phone,
      address,
      isVerified,
      isEmailVerified,
      isDisabledVoter,
      region,
      blockchainAddress,
      voterIDImage,
      disabilityCertificate,
      faceData,
      securityBreach
    } = req.body;

    if (!email || !mobile || !voterID) {
      return res.status(400).json({
        success: false,
        error: 'Email, mobile, and voter ID are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanMobile = mobile.replace(/\D/g, '');
    const normalizedUsername = username ? username.toLowerCase().trim() : undefined;

    // ============================================
    // SECURITY CHECK: Validate unique email-mobile mapping
    // ============================================

    // Check if mobile is already registered to a different email
    const existingUserWithMobile = await User.findOne({
      mobile: cleanMobile,
      email: { $ne: normalizedEmail }
    });

    if (existingUserWithMobile) {
      console.log(`⚠️ Security: Mobile ${cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')} already registered to another account`);

      await AuditLog.create({
        action: 'registration_blocked',
        userEmail: normalizedEmail,
        details: {
          reason: 'mobile_already_registered',
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
        },
        status: 'failure',
        errorMessage: 'Mobile number already registered to another account',
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(409).json({
        success: false,
        error: 'MOBILE_ALREADY_REGISTERED',
        message: 'This mobile number is already registered with another email address.'
      });
    }

    // Check if email already exists with a different mobile (prevent mobile change)
    const existingUserWithEmail = await User.findOne({ email: normalizedEmail });

    if (existingUserWithEmail && existingUserWithEmail.mobile && existingUserWithEmail.mobile !== cleanMobile) {
      console.log(`⚠️ Security: Email ${normalizedEmail} attempting to use different mobile number`);

      await AuditLog.create({
        action: 'registration_blocked',
        userEmail: normalizedEmail,
        details: {
          reason: 'mobile_mismatch',
          registeredMobile: existingUserWithEmail.mobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          attemptedMobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
        },
        status: 'failure',
        errorMessage: 'Cannot change registered mobile number',
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(409).json({
        success: false,
        error: 'MOBILE_MISMATCH',
        message: 'This email is already registered with a different mobile number.'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // Update all relevant fields from model
      user.mobile = cleanMobile;
      user.voterID = voterID.toUpperCase();
      if (name !== undefined) user.name = name;
      if (role !== undefined) user.role = role;
      if (normalizedUsername !== undefined) user.username = normalizedUsername;
      if (fullname !== undefined) user.fullname = fullname;
      if (password !== undefined) user.password = password;
      if (phone !== undefined) user.phone = phone;
      if (address !== undefined) user.address = address;
      if (isVerified !== undefined) user.isVerified = isVerified;
      if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
      if (isDisabledVoter !== undefined) user.isDisabledVoter = isDisabledVoter;
      if (region !== undefined) user.region = region;
      if (blockchainAddress !== undefined) user.blockchainAddress = blockchainAddress;
      if (voterIDImage !== undefined) user.voterIDImage = voterIDImage;
      if (disabilityCertificate !== undefined) user.disabilityCertificate = disabilityCertificate;
      if (faceData !== undefined) user.faceData = faceData;
      if (securityBreach !== undefined) user.securityBreach = securityBreach;
      user.lastLogin = new Date();
      user.ipAddress = req.ip;
      user.deviceInfo = req.get('User-Agent');
      await user.save();

      await AuditLog.create({
        action: 'login',
        userEmail: normalizedEmail,
        voterID: voterID.toUpperCase(),
        status: 'success',
        ipAddress: req.ip,
        deviceInfo: req.get('User-Agent')
      });

      return res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          voterID: user.voterID,
          name: user.name,
          hasVoted: user.hasVoted,
          role: user.role,
          username: user.username,
          fullname: user.fullname,
          phone: user.phone,
          address: user.address,
          isVerified: user.isVerified,
          isEmailVerified: user.isEmailVerified,
          isDisabledVoter: user.isDisabledVoter,
          region: user.region,
          blockchainAddress: user.blockchainAddress,
          voterIDImage: user.voterIDImage,
          disabilityCertificate: user.disabilityCertificate,
          faceData: user.faceData,
          securityBreach: user.securityBreach,
          lastLogin: user.lastLogin,
          ipAddress: user.ipAddress,
          deviceInfo: user.deviceInfo
        }
      });
    }

    // Create new user
    user = await User.create({
      email: normalizedEmail,
      mobile: cleanMobile,
      voterID: voterID.toUpperCase(),
      name: name || '',
      role: role || 'voter',
      username: normalizedUsername,
      fullname: fullname,
      password: password,
      phone: phone,
      address: address,
      isVerified: isVerified,
      isEmailVerified: isEmailVerified,
      isDisabledVoter: isDisabledVoter,
      region: region,
      blockchainAddress: blockchainAddress,
      voterIDImage: voterIDImage,
      disabilityCertificate: disabilityCertificate,
      faceData: faceData,
      securityBreach: securityBreach,
      lastLogin: new Date(),
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });

    await AuditLog.create({
      action: 'login',
      userEmail: email,
      voterID: voterID.toUpperCase(),
      status: 'success',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        voterID: user.voterID,
        name: user.name,
        hasVoted: user.hasVoted,
        role: user.role,
        username: user.username,
        fullname: user.fullname,
        phone: user.phone,
        address: user.address,
        isVerified: user.isVerified,
        isEmailVerified: user.isEmailVerified,
        isDisabledVoter: user.isDisabledVoter,
        region: user.region,
        blockchainAddress: user.blockchainAddress,
        voterIDImage: user.voterIDImage,
        disabilityCertificate: user.disabilityCertificate,
        faceData: user.faceData,
        securityBreach: user.securityBreach,
        lastLogin: user.lastLogin,
        ipAddress: user.ipAddress,
        deviceInfo: user.deviceInfo
      }
    });
  } catch (error) {
    console.error('Create/Update user error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Voter ID already registered'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create/update user'
    });
  }
};

// Store face data
exports.storeFaceData = async (req, res) => {
  try {
    const { email, descriptor, image } = req.body;

    if (!email || !descriptor) {
      return res.status(400).json({
        success: false,
        error: 'Email and face descriptor are required'
      });
    }

    const user = await User.findOneAndUpdate(
      { email },
      {
        faceData: {
          descriptor: Array.from(descriptor),
          image: image || null,
          capturedAt: new Date()
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await AuditLog.create({
      action: 'face_capture',
      userEmail: email,
      status: 'success',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Face data stored successfully'
    });
  } catch (error) {
    console.error('Store face data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store face data'
    });
  }
};

// Get face data
exports.getFaceData = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email }, 'faceData');

    if (!user || !user.faceData || !user.faceData.descriptor) {
      return res.status(404).json({
        success: false,
        error: 'Face data not found'
      });
    }

    res.json({
      success: true,
      faceData: {
        descriptor: user.faceData.descriptor,
        image: user.faceData.image,
        capturedAt: user.faceData.capturedAt
      }
    });
  } catch (error) {
    console.error('Get face data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve face data'
    });
  }
};

// Check if user has voted
exports.checkVotingStatus = async (req, res) => {
  try {
    const { voterID } = req.params;

    const user = await User.findOne({ voterID: voterID.toUpperCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Voter not found'
      });
    }

    res.json({
      success: true,
      hasVoted: user.hasVoted,
      votedAt: user.votedAt
    });
  } catch (error) {
    console.error('Check voting status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check voting status'
    });
  }
};

// Record vote
exports.recordVote = async (req, res) => {
  try {
    const { voterID, userEmail, candidateId, candidateName, partyName, region, blockchainTxHash, electionId } = req.body;

    if (!userEmail || !candidateId || !region) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Find user by voterID first, then by email as fallback
    let user = null;
    if (voterID && voterID !== 'Not Set') {
      user = await User.findOne({ voterID: voterID.toUpperCase() });
    }

    // If not found by voterID, try by email
    if (!user && userEmail) {
      user = await User.findOne({ email: userEmail.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Voter not found'
      });
    }

    // Resolve the effective Voter ID for this request
    const effectiveVoterID = (user.voterID || voterID || '').toUpperCase().trim() || null;
    const resolvedElectionIdForDupCheck = electionId || 'default_election';

    // ── PRIMARY GUARD: block by Voter ID (across all accounts) ────────────
    // This prevents a voter from casting more than one vote per election even
    // if they register/login with a different email or phone number.
    if (effectiveVoterID && effectiveVoterID !== 'NOT_SET') {
      const existingVoteByVoterId = await Vote.findOne({
        voterID: effectiveVoterID,
        electionId: resolvedElectionIdForDupCheck
      });
      if (existingVoteByVoterId) {
        console.log(`🚫 Duplicate vote blocked by Voter ID: ${effectiveVoterID} already voted in election ${resolvedElectionIdForDupCheck}`);
        return res.status(403).json({
          success: false,
          error: 'VOTER_ID_ALREADY_VOTED',
          message: 'This Voter ID has already been used to cast a vote in this election. Each Voter ID may only be used once per election.'
        });
      }
    }

    // ── SECONDARY GUARD: block by email (same account, same election) ─────
    const existingVote = await Vote.findOne({
      userEmail: user.email,
      electionId: resolvedElectionIdForDupCheck
    });

    if (existingVote) {
      return res.status(403).json({
        success: false,
        error: 'You have already voted in this election'
      });
    }

    // Also check the general hasVoted flag as a secondary check
    if (user.hasVoted) {
      console.log('⚠️ User hasVoted flag is set but no vote record found for this election');
    }

    // ============================================
    // ELECTION TIME WINDOW VALIDATION
    // Reject votes outside the admin-configured start/end times
    // ============================================
    const Election = require('../models/Election');
    const resolvedElectionId = electionId || 'default_election';

    if (resolvedElectionId !== 'default_election') {
      try {
        const election = await Election.findById(resolvedElectionId);
        if (election) {
          const now = new Date();
          const electionStart = new Date(election.startDate);
          const electionEnd = new Date(election.endDate);

          if (now < electionStart) {
            console.log(`🚫 Vote rejected: Election "${election.title}" has not started yet. Start: ${electionStart.toISOString()}, Now: ${now.toISOString()}`);
            return res.status(403).json({
              success: false,
              error: 'ELECTION_NOT_STARTED',
              message: `Voting has not started yet. The election "${election.title}" begins on ${electionStart.toLocaleString()}.`,
              electionStart: electionStart.toISOString(),
              electionEnd: electionEnd.toISOString(),
              serverTime: now.toISOString()
            });
          }

          if (now > electionEnd) {
            console.log(`🚫 Vote rejected: Election "${election.title}" has ended. End: ${electionEnd.toISOString()}, Now: ${now.toISOString()}`);
            return res.status(403).json({
              success: false,
              error: 'ELECTION_ENDED',
              message: `The election period has ended. Voting for "${election.title}" closed on ${electionEnd.toLocaleString()}.`,
              electionStart: electionStart.toISOString(),
              electionEnd: electionEnd.toISOString(),
              serverTime: now.toISOString()
            });
          }

          console.log(`✅ Election time window valid: "${election.title}" is active (${electionStart.toISOString()} to ${electionEnd.toISOString()})`);
        }
      } catch (electionLookupError) {
        console.warn('⚠️ Could not validate election time window:', electionLookupError.message);
        // Continue with vote recording — don't block if election lookup fails
      }
    }

    // Attempt blockchain recording via admin key (non-fatal if node is offline)
    let finalBlockchainTxHash = blockchainTxHash || null;
    let blockchainConfirmed = !!blockchainTxHash;

    if (!finalBlockchainTxHash) {
      try {
        const effectiveVoterId = user.voterID || voterID || 'NOT_SET';
        const bcReceipt = await blockchainVoteService.recordVote(effectiveVoterId, candidateId);
        finalBlockchainTxHash = bcReceipt.transactionHash;
        blockchainConfirmed = true;
        console.log('✅ Backend blockchain recording succeeded:', finalBlockchainTxHash);
      } catch (bcError) {
        console.warn('⚠️ Backend blockchain recording failed (node may not be running):', bcError.message);
      }
    }

    // Record vote - use the actual voterID from user record
    const vote = await Vote.create({
      voterID: user.voterID || voterID || 'NOT_SET',
      userEmail: user.email,
      electionId: electionId || 'default_election',
      candidateId,
      candidateName,
      partyName,
      region,
      blockchainTxHash: finalBlockchainTxHash,
      blockchainConfirmed,
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent'),
      votedAt: new Date()
    });

    // Update user
    user.hasVoted = true;
    user.votedAt = new Date();
    user.region = region;
    await user.save();

    console.log('✅ Vote recorded successfully for user:', user.email, 'hasVoted:', user.hasVoted);

    await AuditLog.create({
      action: 'vote_cast',
      userEmail: user.email,
      voterID: user.voterID || 'NOT_SET',
      details: {
        candidateId,
        candidateName,
        partyName,
        constituency: region.constituency,
        blockchainTxHash: finalBlockchainTxHash,
        electionId
      },
      status: 'success',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      voteId: vote._id,
      userId: user._id,
      blockchainTxHash: finalBlockchainTxHash,
      blockchainConfirmed
    });
  } catch (error) {
    console.error('Record vote error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    });
  }
};

// Get voting statistics
exports.getVotingStats = async (req, res) => {
  try {
    const totalVoters = await User.countDocuments();
    const totalVotes = await Vote.countDocuments();
    const activeVoters = await User.countDocuments({ hasVoted: true });

    // Votes by constituency
    const votesByConstituency = await Vote.aggregate([
      {
        $group: {
          _id: '$region.constituency',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Recent votes
    const recentVotes = await Vote.find()
      .sort({ votedAt: -1 })
      .limit(10)
      .select('voterID candidateName partyName region.constituency votedAt');

    res.json({
      success: true,
      stats: {
        totalVoters,
        totalVotes,
        activeVoters,
        turnoutPercentage: totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : 0
      },
      votesByConstituency,
      recentVotes
    });
  } catch (error) {
    console.error('Get voting stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voting statistics'
    });
  }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, email, limit = 50 } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (email) filter.userEmail = email;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit logs'
    });
  }
};

// Get all users from database
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, hasVoted, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build filter
    const filter = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { voterID: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    if (hasVoted !== undefined) {
      filter.hasVoted = hasVoted === 'true';
    }

    if (role) {
      filter.role = role;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const totalUsers = await User.countDocuments(filter);

    // Get paginated users
    const users = await User.find(filter)
      .select('-faceData.descriptor -faceData.image -voterIDImage -disabilityCertificate') // Exclude large binary data
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Calculate statistics
    const stats = {
      totalUsers: await User.countDocuments(),
      verifiedUsers: await User.countDocuments({ isVerified: true }),
      votedUsers: await User.countDocuments({ hasVoted: true }),
      adminUsers: await User.countDocuments({ role: 'admin' }),
      disabledVoters: await User.countDocuments({ isDisabledVoter: true })
    };

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          email: user.email,
          mobile: user.mobile,
          voterID: user.voterID,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          hasVoted: user.hasVoted,
          votedAt: user.votedAt,
          region: user.region,
          isDisabledVoter: user.isDisabledVoter,
          hasFaceData: !!(user.faceData && user.faceData.descriptor),
          blockchainAddress: user.blockchainAddress,
          lastLogin: user.lastLogin,
          ipAddress: user.ipAddress,
          deviceInfo: user.deviceInfo,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers: totalUsers,
          limit: parseInt(limit)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users'
    });
  }
};

// Get single user by ID or email
exports.getUserDetails = async (req, res) => {
  try {
    const { identifier } = req.params;

    // Search by email or voterID
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { voterID: identifier.toUpperCase() },
        { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null }
      ]
    }).select('-faceData.image -voterIDImage -disabilityCertificate');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's voting history if they voted
    let voteInfo = null;
    if (user.hasVoted) {
      voteInfo = await Vote.findOne({
        $or: [
          { userEmail: user.email },
          { voterID: user.voterID }
        ]
      }).select('candidateName partyName region votedAt blockchainTxHash blockchainConfirmed');
    }

    // Get audit logs for user
    const auditLogs = await AuditLog.find({ userEmail: user.email })
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          mobile: user.mobile,
          voterID: user.voterID,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          hasVoted: user.hasVoted,
          votedAt: user.votedAt,
          region: user.region,
          isDisabledVoter: user.isDisabledVoter,
          hasFaceData: !!(user.faceData && user.faceData.descriptor),
          faceDataCapturedAt: user.faceData?.capturedAt,
          blockchainAddress: user.blockchainAddress,
          lastLogin: user.lastLogin,
          ipAddress: user.ipAddress,
          deviceInfo: user.deviceInfo,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        voteInfo,
        auditLogs
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user details'
    });
  }
};

// Update user details
exports.updateUser = async (req, res) => {
  try {
    const { identifier } = req.params;
    const {
      name,
      role,
      username,
      fullname,
      password,
      phone,
      address,
      isVerified,
      isEmailVerified,
      isDisabledVoter,
      region,
      blockchainAddress,
      voterIDImage,
      disabilityCertificate,
      faceData,
      securityBreach
    } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { voterID: identifier.toUpperCase() },
        { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update all relevant fields from model
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (username !== undefined) user.username = username.toLowerCase();
    if (fullname !== undefined) user.fullname = fullname;
    if (password !== undefined) user.password = password;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
    if (isDisabledVoter !== undefined) user.isDisabledVoter = isDisabledVoter;
    if (region !== undefined) user.region = region;
    if (blockchainAddress !== undefined) user.blockchainAddress = blockchainAddress;
    if (voterIDImage !== undefined) user.voterIDImage = voterIDImage;
    if (disabilityCertificate !== undefined) user.disabilityCertificate = disabilityCertificate;
    if (faceData !== undefined) user.faceData = faceData;
    if (securityBreach !== undefined) user.securityBreach = securityBreach;

    // Save the changes to the database
    await user.save();

    await AuditLog.create({
      action: 'user_updated',
      userEmail: user.email,
      voterID: user.voterID,
      details: { updatedFields: { name, role, isDisabledVoter, region, blockchainAddress, isVerified, isEmailVerified } },
      status: 'success',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });


    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        voterID: user.voterID,
        name: user.name,
        role: user.role,
        isDisabledVoter: user.isDisabledVoter,
        region: user.region
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { identifier } = req.params;

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { voterID: identifier.toUpperCase() },
        { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Don't allow deletion of users who have voted
    if (user.hasVoted) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete user who has already voted'
      });
    }

    await AuditLog.create({
      action: 'user_deleted',
      userEmail: user.email,
      voterID: user.voterID,
      status: 'success',
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });

    await User.deleteOne({ _id: user._id });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// Get vote results by candidate
exports.getVoteResults = async (req, res) => {
  try {
    const { electionId } = req.query;

    // Build filter - if electionId provided, filter by it
    const filter = {};
    if (electionId) {
      filter.electionId = electionId;
    }

    // Get votes grouped by candidate
    const votesByCandidate = await Vote.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            candidateId: '$candidateId',
            candidateName: '$candidateName',
            partyName: '$partyName'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalVotes = await Vote.countDocuments(filter);
    const totalVoters = await User.countDocuments();

    const results = votesByCandidate.map(item => ({
      candidateId: item._id.candidateId,
      candidateName: item._id.candidateName,
      partyName: item._id.partyName,
      votes: item.count,
      percentage: totalVotes > 0 ? ((item.count / totalVotes) * 100).toFixed(2) : 0
    }));

    res.json({
      success: true,
      data: {
        results,
        totalVotes,
        totalVoters,
        turnoutPercentage: totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : 0,
        electionId: electionId || 'all'
      }
    });
  } catch (error) {
    console.error('Get vote results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve vote results'
    });
  }
};

// ==========================================
// EMAIL OTP VERIFICATION FLOW
// ==========================================

// Send OTP for email verification during signup
exports.sendEmailVerificationOTP = asynchandler(async (req, res) => {
  const { email, username } = req.body;
  console.log("Email verification request:", { email, username });

  if (!email) {
    throw new apiError(400, "Email is required");
  }

  // Check if user already exists with this email (only fully registered users)
  const existingUser = await User.findOne({
    email,
    isEmailVerified: true,
    password: { $not: /^temp_password_/ },
    username: { $not: /^temp_/ },
  });

  if (existingUser) {
    throw new apiError(
      409,
      "Email is already registered. Please use login instead."
    );
  }

  // Check if someone else is trying to use this username (but different email)
  if (username) {
    const usernameExists = await User.findOne({
      username: username.toLowerCase(),
      email: { $ne: email },
      isEmailVerified: true,
      password: { $not: /^temp_password_/ },
    });

    if (usernameExists) {
      throw new apiError(409, "Username is already taken by another user");
    }
  }

  // Generate OTP
  const otp = generateOTP();
  const otpExpiry = generateOTPExpiry();

  try {
    // Send email
    console.log("Attempting to send OTP email to:", email);
    await sendSignupOTP(email, otp, username);
    console.log("Email sent successfully");

    // Delete any existing unverified/temp records for this email
    await User.deleteMany({
      email,
      $or: [
        { username: { $regex: /^temp_/ } },
        { password: { $regex: /^temp_password_/ } },
        { isEmailVerified: { $ne: true } },
      ],
    });

    // Create minimal temporary record just for OTP storage
    const timestamp = Date.now();
    const tempUsername = `temp_verification_${timestamp}`;

    await User.create({
      name: "Temp Verification",
      email,
      username: tempUsername,
      fullname: "Temp Verification",
      phone: `temp_${timestamp}`,
      password: `temp_password_${timestamp}`,
      address: {
        street: "Temporary",
        city: "Temporary",
        state: "Temporary",
        pincode: "000000",
        geolocation: { lat: 0.0, lng: 0.0 },
      },
      emailVerificationOTP: otp,
      emailVerificationOTPExpiry: otpExpiry,
      emailVerificationOTPLastSent: new Date(),
      isEmailVerified: false,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, "OTP sent successfully to your email", { email })
      );
  } catch (error) {
    console.error("Error in sendEmailVerificationOTP:", error);
    throw new apiError(
      500,
      `Failed to send verification email: ${error.message}`
    );
  }
});

// Verify email OTP and automatically register user
exports.verifyEmailOTP = asynchandler(async (req, res) => {
  const { email, otp, username, password, name, fullname, phone } = req.body;

  if (!email || !otp) {
    throw new apiError(400, "Email and OTP are required");
  }

  if (!username || !password) {
    throw new apiError(
      400,
      "Username and password are required for registration"
    );
  }

  const tempUser = await User.findOne({
    email,
    $or: [
      { username: { $regex: /^temp_/ } },
      { password: { $regex: /^temp_password_/ } },
    ],
  });

  if (!tempUser) {
    throw new apiError(
      404,
      "Verification session not found. Please request OTP again"
    );
  }

  // Verify OTP
  const isValid = verifyOTP(
    otp,
    tempUser.emailVerificationOTP,
    tempUser.emailVerificationOTPExpiry
  );

  if (!isValid) {
    throw new apiError(400, "Invalid or expired OTP");
  }

  try {
    // Delete the temporary record first
    await User.deleteOne({ _id: tempUser._id });

    // Cleanup - Delete ANY other records with this email or username except verified
    console.log("Cleaning up before registration for:", { email, username });
    await User.deleteMany({ email: email, isEmailVerified: { $ne: true } });
    await User.deleteMany({ username: username.toLowerCase(), isEmailVerified: { $ne: true } });

    // Set default address values
    const userAddress = {
      street: "To be updated",
      city: "To be updated",
      state: "To be updated",
      pincode: "000000",
      geolocation: {
        lat: 0.0,
        lng: 0.0,
      },
    };

    // Create the actual user immediately after successful verification
    const newUser = await User.create({
      username: username.toLowerCase(),
      email,
      password, // Will be hashed by pre-save middleware
      name: name || username,
      fullname: fullname || username,
      phone: phone || `user_${Date.now()}`,
      address: userAddress,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=ffffff&size=200`,
      isEmailVerified: true,
      isVerified: true,
      lastLogin: new Date(),
      ipAddress: req.ip,
      deviceInfo: req.get('User-Agent')
    });

    // Generate tokens
    const accessToken = newUser.generateAccessToken();
    const refreshToken = newUser.generateRefreshToken();

    // Save refresh token
    newUser.refresh_token = refreshToken;
    await newUser.save({ validateBeforeSave: false });

    // Cookie options
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    };

    // Return user without password
    const createdUser = await User.findOne({ email, isEmailVerified: true }).select("-password -refresh_token");

    return res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          201,
          "Email verified and registration completed successfully!",
          {
            user: createdUser,
            accessToken,
            refreshToken,
          }
        )
      );
  } catch (error) {
    console.error("Registration error after email verification:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      console.log(`Duplicate ${field} error, performing cleanup and retry...`);

      try {
        // Aggressive cleanup
        await User.deleteMany({ email: email });
        await User.deleteMany({ username: username.toLowerCase() });

        // Wait a moment
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Retry user creation
        const retryUser = await User.create({
          username: username.toLowerCase(),
          email,
          password,
          name: name || username,
          fullname: fullname || username,
          phone: phone || `retry_${Date.now()}`,
          address: {
            street: "To be updated",
            city: "To be updated",
            state: "To be updated",
            pincode: "000000",
            geolocation: { lat: 0.0, lng: 0.0 },
          },
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=6366f1&color=ffffff&size=200`,
          isEmailVerified: true,
        });

        const accessToken = retryUser.generateAccessToken();
        const refreshToken = retryUser.generateRefreshToken();
        retryUser.refresh_token = refreshToken;
        await retryUser.save({ validateBeforeSave: false });

        const options = {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 24 * 60 * 60 * 1000,
        };

        const createdUser = await User.findById(retryUser._id).select(
          "-password -refresh_token"
        );

        return res
          .status(201)
          .cookie("accessToken", accessToken, options)
          .cookie("refreshToken", refreshToken, options)
          .json(
            new ApiResponse(
              201,
              "Email verified and registration completed successfully after cleanup!",
              {
                user: createdUser,
                accessToken,
                refreshToken,
              }
            )
          );
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        throw new apiError(
          500,
          "Registration failed due to database conflicts. Please try again."
        );
      }
    }

    throw new apiError(500, `Registration failed: ${error.message}`);
  }
});

// Resend email verification OTP
exports.resendEmailVerificationOTP = asynchandler(async (req, res) => {
  const { email, username } = req.body;

  if (!email) {
    throw new apiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new apiError(400, "Email is already verified");
  }

  // Check rate limiting
  if (!canResendOTP(user.emailVerificationOTPLastSent)) {
    throw new apiError(
      429,
      "Please wait 30 seconds before requesting a new OTP"
    );
  }

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = generateOTPExpiry();

  try {
    // Send email
    await sendSignupOTP(email, otp, username || user.username);

    // Update OTP in database
    user.emailVerificationOTP = otp;
    user.emailVerificationOTPExpiry = otpExpiry;
    user.emailVerificationOTPLastSent = new Date();
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, "New OTP sent successfully", { email }));
  } catch (error) {
    throw new apiError(500, "Failed to resend verification email");
  }
});

// Fix corrupted username endpoint
exports.fixCorruptedUsername = asynchandler(async (req, res) => {
  const { email, newUsername } = req.body;

  if (!email || !newUsername) {
    throw new apiError(400, "Email and new username are required");
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new apiError(404, "User not found with this email");
    }

    console.log("Found user with corrupted username:", {
      currentUsername: user.username,
      email: user.email,
      id: user._id,
    });

    // Check if the new username is already taken by someone else
    const existingUser = await User.findOne({
      username: newUsername.toLowerCase(),
      _id: { $ne: user._id },
    });

    if (existingUser) {
      throw new apiError(409, "Username is already taken by another user");
    }

    // Update the username
    user.username = newUsername.toLowerCase();
    await user.save();

    console.log("Username successfully updated to:", newUsername.toLowerCase());

    return res.status(200).json(
      new ApiResponse(200, "Username fixed successfully", {
        oldUsername: user.username,
        newUsername: newUsername.toLowerCase(),
        email: user.email,
      })
    );
  } catch (error) {
    console.error("Error fixing username:", error);
    throw new apiError(500, `Failed to fix username: ${error.message}`);
  }
});

// Reset password for corrupted users
exports.resetUserPassword = asynchandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    throw new apiError(400, "Email and new password are required");
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new apiError(404, "User not found with this email");
    }

    console.log("Resetting password for user:", {
      username: user.username,
      email: user.email,
      id: user._id,
    });

    // Update the password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    console.log("Password successfully reset for user:", user.email);

    return res.status(200).json(
      new ApiResponse(200, "Password reset successfully", {
        email: user.email,
        username: user.username,
      })
    );
  } catch (error) {
    console.error("Error resetting password:", error);
    throw new apiError(500, `Failed to reset password: ${error.message}`);
  }
});

// Debug endpoint to check for conflicting users
exports.debugCheckUser = asynchandler(async (req, res) => {
  const { email, username } = req.query;

  console.log("Debug check for:", { email, username });

  try {
    const usersByEmail = await User.find({ email });
    const usersByUsername = await User.find({
      username: username?.toLowerCase(),
    });

    return res.status(200).json({
      email: email,
      username: username,
      usersByEmail: usersByEmail.map((u) => ({
        id: u._id,
        email: u.email,
        username: u.username,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
      })),
      usersByUsername: usersByUsername.map((u) => ({
        id: u._id,
        email: u.email,
        username: u.username,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
      })),
      totalEmailMatches: usersByEmail.length,
      totalUsernameMatches: usersByUsername.length,
    });
  } catch (error) {
    console.error("Debug check failed:", error);
    return res.status(500).json({ error: error.message });
  }
});
