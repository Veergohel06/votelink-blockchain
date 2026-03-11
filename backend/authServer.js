const express = require('express');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const sessionService = require('./services/sessionService');
const smsOTPService = require('./services/smsOTPService');
const emailService = require('./services/emailService');
const connectDB = require('./config/database');
const { User, Session, AuditLog, Vote } = require('./models');
const blockchainVoteService = require('./services/blockchainVoteService');

const app = express();

// ── Blockchain reconciliation ─────────────────────────────────────────────
// Finds votes where blockchainTxHash is null and retries recording them on
// the blockchain using the admin private key. Safe to call at any time.
async function confirmPendingBlockchainVotes() {
  try {
    const pendingVotes = await Vote.find({
      $or: [{ blockchainTxHash: null }, { blockchainConfirmed: false }]
    }).limit(50);

    if (pendingVotes.length === 0) {
      console.log('✅ No pending blockchain votes to confirm');
      return { confirmed: 0, failed: 0, total: 0 };
    }

    console.log(`🔗 Blockchain reconciliation: ${pendingVotes.length} pending vote(s) found`);
    let confirmed = 0;
    let failed = 0;

    for (const vote of pendingVotes) {
      try {
        const receipt = await blockchainVoteService.recordVote(vote.voterID, vote.candidateId);
        await Vote.findByIdAndUpdate(vote._id, {
          blockchainTxHash: receipt.transactionHash,
          blockchainConfirmed: true
        });
        console.log(`✅ Vote ${vote._id} confirmed on blockchain: ${receipt.transactionHash}`);
        confirmed++;
      } catch (err) {
        // If the voter already voted on blockchain (partial previous success),
        // mark confirmed so we don't retry forever.
        if (err.message && err.message.includes('VoterAlreadyVoted')) {
          await Vote.findByIdAndUpdate(vote._id, { blockchainConfirmed: true });
          console.log(`ℹ️  Vote ${vote._id} already on blockchain (no stored hash) — marked confirmed`);
          confirmed++;
        } else {
          console.warn(`⚠️  Could not confirm vote ${vote._id}:`, err.message);
          failed++;
        }
      }
    }

    console.log(`📊 Reconciliation complete — confirmed: ${confirmed}, failed: ${failed}`);
    return { confirmed, failed, total: pendingVotes.length };
  } catch (err) {
    console.error('❌ Blockchain reconciliation error:', err.message);
    return { confirmed: 0, failed: 0, total: 0, error: err.message };
  }
}

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 attempts per window (increased for development/testing)
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development or use custom key generator
  skip: (req) => process.env.NODE_ENV === 'development',
  keyGenerator: (req) => {
    // Use email or phone as key instead of IP for more precise limiting
    return req.body?.email || req.body?.mobile || req.ip;
  }
});

// Helper function to get client info
function getClientInfo(req) {
  return {
    userAgent: req.get('User-Agent') || '',
    ipAddress: req.ip || req.connection.remoteAddress || ''
  };
}

// Authentication middleware
function authenticateSession(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No session token provided'
    });
  }

  const session = sessionService.validateSession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session'
    });
  }

  req.user = session;
  next();
}

// Admin authentication middleware
// Checks the X-Admin-Token header against ADMIN_SECRET_TOKEN env var
function authenticateAdmin(req, res, next) {
  const adminToken = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_SECRET_TOKEN;

  if (!expectedToken) {
    console.error('⚠️ ADMIN_SECRET_TOKEN is not set in environment variables!');
    return res.status(503).json({
      success: false,
      error: 'Admin authentication is not configured on the server.'
    });
  }

  if (!adminToken || adminToken !== expectedToken) {
    console.warn(`🚫 Unauthorized admin access attempt from IP: ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid or missing admin credentials.'
    });
  }

  next();
}

// Routes

/**
 * Admin Login endpoint — validates credentials and returns admin token
 * POST /api/auth/admin-login
 */
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many admin login attempts. Please try again later.' }
});

app.post('/api/auth/admin-login', adminLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const allowedAdmins = ['admin', 'demo-admin', (process.env.ADMIN_EMAIL || '').toLowerCase()].filter(Boolean);
    const expectedPassword = process.env.ADMIN_PASSWORD;
    const adminToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedPassword || !adminToken) {
      console.error('⚠️ ADMIN_PASSWORD or ADMIN_SECRET_TOKEN not set in environment!');
      return res.status(503).json({ success: false, error: 'Admin authentication is not configured on the server.' });
    }

    if (!allowedAdmins.includes(email.toLowerCase()) || password !== expectedPassword) {
      console.warn(`🚫 Failed admin login attempt for: ${email} from IP: ${req.ip}`);

      try {
        await AuditLog.create({
          action: 'admin_login_failed',
          userEmail: email.toLowerCase(),
          status: 'failure',
          details: { reason: 'Invalid credentials', ip: req.ip },
          ipAddress: req.ip || '',
          deviceInfo: req.get('User-Agent') || ''
        });
      } catch (_) { /* non-critical */ }

      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }

    console.log(`✅ Admin login successful for: ${email} from IP: ${req.ip}`);

    try {
      await AuditLog.create({
        action: 'admin_login_success',
        userEmail: email.toLowerCase(),
        status: 'success',
        details: { ip: req.ip },
        ipAddress: req.ip || '',
        deviceInfo: req.get('User-Agent') || ''
      });
    } catch (_) { /* non-critical */ }

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      data: { adminToken, email: email.toLowerCase() }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Login endpoint - Creates new session if user doesn't have active one
 */
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validate input
    if (!email || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Email and mobile number are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate mobile number (flexible format - accepts Indian and international)
    // Remove any non-digit characters for validation
    const cleanMobile = mobile.replace(/\D/g, '');
    const mobileRegex = /^[6-9]\d{9}$/; // Indian format: 10 digits starting with 6-9
    const internationalRegex = /^\d{10,15}$/; // International: 10-15 digits

    if (!mobileRegex.test(cleanMobile) && !internationalRegex.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format. Please enter a valid 10-digit mobile number.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { userAgent, ipAddress } = getClientInfo(req);

    // ============================================
    // CHECK WHICH ELECTIONS USER HAS VOTED IN
    // Users can still login - voting is blocked per-election, not globally
    // ============================================
    let votedElections = [];
    try {
      // Get all elections this user has voted in
      const existingVotes = await Vote.find({
        userEmail: normalizedEmail
      }).select('electionId votedAt');

      if (existingVotes.length > 0) {
        votedElections = existingVotes.map(v => ({
          electionId: v.electionId,
          votedAt: v.votedAt
        }));
        console.log(`📋 User ${normalizedEmail} has voted in ${votedElections.length} election(s): ${votedElections.map(v => v.electionId).join(', ')}`);
      }

      // Also check by mobile number
      const userByMobile = await User.findOne({ mobile: cleanMobile });
      if (userByMobile && userByMobile.voterID) {
        const votesByVoterId = await Vote.find({ voterID: userByMobile.voterID }).select('electionId votedAt');
        for (const vote of votesByVoterId) {
          if (!votedElections.some(v => v.electionId === vote.electionId)) {
            votedElections.push({
              electionId: vote.electionId,
              votedAt: vote.votedAt
            });
          }
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database check for voted elections failed:', dbError.message);
    }

    // ============================================
    // CHECK FOR SECURITY BREACH - BLOCK LOGIN PERMANENTLY
    // ============================================
    try {
      const userWithBreach = await User.findOne({ email: normalizedEmail });

      if (userWithBreach && userWithBreach.securityBreach && userWithBreach.securityBreach.detected) {
        console.log(`🔒 Security breach detected for user: ${normalizedEmail}`);

        // Log the security breach attempt
        await AuditLog.create({
          action: 'security_breach',
          userEmail: normalizedEmail,
          status: 'success',
          details: {
            reason: userWithBreach.securityBreach.reason,
            breachDetectedAt: userWithBreach.securityBreach.detectedAt,
            loginAttemptAt: new Date(),
            ipAddress: ipAddress,
            deviceInfo: userAgent
          },
          ipAddress,
          deviceInfo: userAgent
        });

        return res.status(403).json({
          success: false,
          error: 'SECURITY_BREACH',
          message: 'Security breach detected. Your account has been permanently blocked for online voting. Please visit the nearest offline voting booth to cast your vote.',
          securityBreach: true,
          blockedSince: userWithBreach.securityBreach.detectedAt
        });
      }
    } catch (dbError) {
      console.warn('⚠️ Database check for security breach failed:', dbError.message);
    }

    // Check for existing active session
    if (sessionService.hasActiveSession(normalizedEmail)) {
      const existingSession = sessionService.getSessionInfo(normalizedEmail);

      return res.status(409).json({
        success: false,
        error: 'User already logged in',
        message: 'This Gmail account is already being used in another session. Please logout from other devices first.',
        details: {
          sessionStartTime: existingSession.createdAt,
          lastActive: existingSession.lastActive,
          currentDevice: existingSession.userAgent !== userAgent ? 'Different Device' : 'Same Device',
          currentIP: existingSession.ipAddress !== ipAddress ? 'Different IP' : 'Same IP'
        }
      });
    }

    // Create or update user in database
    try {
      await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: {
            email: normalizedEmail,
            mobile: cleanMobile,
            lastLogin: new Date(),
            ipAddress,
            deviceInfo: userAgent,
            isVerified: true,
            isEmailVerified: true
          }
        },
        { upsert: true, new: true }
      );
      console.log(`✅ User ${normalizedEmail} saved/updated in database`);
    } catch (dbError) {
      console.warn('⚠️ Failed to save user in database:', dbError.message);
    }

    // Create new session
    const session = sessionService.createSession(normalizedEmail, userAgent, ipAddress);

    // Fetch latest user data including voting status
    const userData = await User.findOne({ email: normalizedEmail });

    // Return success response with voting status and voted elections
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: session.token,
        email: session.email,
        expiresAt: session.expiresAt,
        user: {
          id: userData?._id,
          email: userData?.email,
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          hasVoted: userData?.hasVoted || false,
          voterID: userData?.voterID,
          votedElections: votedElections // Array of {electionId, votedAt} for per-election vote tracking
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    if (error.message === 'User already has an active session') {
      return res.status(409).json({
        success: false,
        error: 'User already logged in',
        message: 'This Gmail account is already being used in another session.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during login. Please try again.'
    });
  }
});

/**
 * Check email-mobile pairing endpoint
 * Called BEFORE OTP to validate that this email-mobile combination is allowed
 * First-time users pass through; returning users must use the same pairing
 */
app.post('/api/auth/check-pairing', async (req, res) => {
  try {
    const { email, mobile } = req.body;

    if (!email || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Email and mobile number are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanMobile = mobile.replace(/\D/g, '');

    // Check if this mobile is already used with a different email
    const existingUserWithMobile = await User.findOne({
      mobile: cleanMobile,
      email: { $ne: normalizedEmail }
    });

    if (existingUserWithMobile) {
      console.log(`⚠️ Pairing check failed: Mobile ${cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')} already linked to another email`);
      return res.status(403).json({
        success: false,
        error: 'NO_MATCH',
        message: 'Email and mobile number do not match. This mobile number is already linked to another email.'
      });
    }

    // Check if this email is already used with a different mobile
    const existingUserWithEmail = await User.findOne({ email: normalizedEmail });

    if (existingUserWithEmail && existingUserWithEmail.mobile && existingUserWithEmail.mobile !== cleanMobile) {
      console.log(`⚠️ Pairing check failed: Email ${normalizedEmail} already linked to different mobile`);
      return res.status(403).json({
        success: false,
        error: 'NO_MATCH',
        message: 'Email and mobile number do not match. This email is already linked to another mobile number.'
      });
    }

    // Pairing is valid (either new or matches existing)
    return res.status(200).json({
      success: true,
      message: 'Email-mobile pairing is valid',
      isNewUser: !existingUserWithEmail
    });

  } catch (error) {
    console.error('Check pairing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Request OTP endpoint - Generates and sends OTP via Fast2SMS (SMS)
 * NOTE: This route is NOT called by the current login flow.
 * The frontend uses /api/auth/send-email-otp (Gmail SMTP) for OTP.
 * This endpoint is retained as an optional SMS backup/alternative.
 */
app.post('/api/auth/request-otp', loginLimiter, async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validate input
    if (!email || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Email and mobile number are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate mobile number
    const cleanMobile = mobile.replace(/\D/g, '');
    const mobileRegex = /^[6-9]\d{9}$/;

    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ============================================
    // SECURITY CHECK: Validate email-mobile pairing
    // No registration needed - but once a pair is set, it must match
    // ============================================

    // Check if this mobile is already used with a different email
    const existingUserWithMobile = await User.findOne({
      mobile: cleanMobile,
      email: { $ne: normalizedEmail }
    });

    if (existingUserWithMobile) {
      console.log(`⚠️ Login blocked: Mobile ${cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')} already linked to another email`);

      await AuditLog.create({
        action: 'login_blocked',
        userEmail: normalizedEmail,
        details: {
          reason: 'email_mobile_mismatch',
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
        },
        status: 'failure',
        errorMessage: 'Email and mobile number do not match',
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(403).json({
        success: false,
        error: 'NO_MATCH',
        message: 'Email and mobile number do not match. Please use the correct email-mobile combination.'
      });
    }

    // Check if this email is already used with a different mobile
    const existingUserWithEmail = await User.findOne({ email: normalizedEmail });

    if (existingUserWithEmail && existingUserWithEmail.mobile && existingUserWithEmail.mobile !== cleanMobile) {
      console.log(`⚠️ Login blocked: Email ${normalizedEmail} already linked to different mobile`);

      await AuditLog.create({
        action: 'login_blocked',
        userEmail: normalizedEmail,
        details: {
          reason: 'email_mobile_mismatch',
          registeredMobile: existingUserWithEmail.mobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          attemptedMobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
        },
        status: 'failure',
        errorMessage: 'Email and mobile number do not match',
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(403).json({
        success: false,
        error: 'NO_MATCH',
        message: 'Email and mobile number do not match. Please use the correct email-mobile combination.'
      });
    }

    // Generate and send OTP via Fast2SMS
    try {
      const otpResult = await smsOTPService.generateAndSendOTP(normalizedEmail, cleanMobile);

      if (otpResult.success) {
        // Log OTP generation
        await AuditLog.create({
          action: 'otp_verify',
          userEmail: normalizedEmail,
          details: {
            mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
            method: 'Fast2SMS',
            status: 'sent'
          },
          status: 'success',
          ipAddress: req.ip || req.connection.remoteAddress,
          deviceInfo: req.get('User-Agent')
        }).catch(err => console.error('Failed to log OTP request:', err));

        return res.status(200).json({
          success: true,
          message: otpResult.message,
          data: {
            email: normalizedEmail,
            mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
            expiresIn: 300, // 5 minutes in seconds
            retryAfter: 30 // Can retry after 30 seconds
          }
        });
      } else {
        throw new Error(otpResult.message || 'Failed to send OTP');
      }

    } catch (error) {
      console.error('❌ Error generating and sending OTP:', error.message);

      // Log the error
      await AuditLog.create({
        action: 'otp_verify',
        userEmail: normalizedEmail,
        details: {
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          method: 'Fast2SMS',
          status: 'failed',
          error: error.message
        },
        status: 'failure',
        errorMessage: error.message,
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(500).json({
        success: false,
        error: 'OTP_SEND_FAILED',
        message: 'Failed to send OTP to your mobile number. Please check your mobile number and try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while requesting OTP. Please try again.'
    });
  }
});

/**
 * Voter Registration endpoint - Registers a new voter with duplicate prevention
 * Checks for duplicate email, mobile, and voterID
 */
app.post('/api/auth/register', loginLimiter, async (req, res) => {
  try {
    const { email, mobile, voterID, name, region } = req.body;

    // Validate required fields
    if (!email || !mobile || !voterID || !name) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required (email, mobile, voterID, name)'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate mobile number
    const cleanMobile = mobile.replace(/\D/g, '');
    const mobileRegex = /^[6-9]\d{9}$/;

    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number.'
      });
    }

    // Validate voterID format (assuming Indian voter ID format: 3 letters + 7 digits)
    const voterIDRegex = /^[A-Z]{3}\d{7}$/i;
    const cleanVoterID = voterID.toUpperCase().trim();

    if (!voterIDRegex.test(cleanVoterID)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Voter ID format. Expected format: ABC1234567 (3 letters + 7 digits)'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { userAgent, ipAddress } = getClientInfo(req);

    // ============================================
    // DUPLICATE CHECKS - Prevent duplicate entries
    // ============================================

    // Check if email already registered
    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail) {
      console.log(`🚫 Registration blocked: Email ${normalizedEmail} already registered`);
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: 'This email address is already registered. Please use a different email or login if you already have an account.',
        field: 'email'
      });
    }

    // Check if mobile number already registered
    const existingUserByMobile = await User.findOne({ mobile: cleanMobile });
    if (existingUserByMobile) {
      console.log(`🚫 Registration blocked: Mobile ${cleanMobile} already registered`);
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_MOBILE',
        message: 'This mobile number is already registered. Please use a different number or login if you already have an account.',
        field: 'mobile'
      });
    }

    // Check if voterID already registered
    const existingUserByVoterID = await User.findOne({ voterID: cleanVoterID });
    if (existingUserByVoterID) {
      console.log(`🚫 Registration blocked: Voter ID ${cleanVoterID} already registered`);
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_VOTER_ID',
        message: 'This Voter ID is already registered. Each voter can only register once.',
        field: 'voterID'
      });
    }

    // ============================================
    // CREATE NEW USER
    // ============================================
    const newUser = await User.create({
      email: normalizedEmail,
      mobile: cleanMobile,
      voterID: cleanVoterID,
      name: name.trim(),
      region: region || {},
      role: 'voter',
      isVerified: false,
      hasVoted: false,
      lastLogin: new Date(),
      ipAddress,
      deviceInfo: userAgent
    });

    // Log the registration in audit logs
    await AuditLog.create({
      action: 'registration',
      userEmail: normalizedEmail,
      voterID: cleanVoterID,
      status: 'success',
      ipAddress,
      deviceInfo: userAgent,
      details: {
        mobile: cleanMobile,
        name: name.trim()
      }
    });

    console.log(`✅ New voter registered: ${normalizedEmail} (${cleanVoterID})`);

    // Return success response (without creating session - user needs to login separately)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please login to continue.',
      data: {
        id: newUser._id,
        email: newUser.email,
        voterID: newUser.voterID,
        name: newUser.name,
        mobile: newUser.mobile,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle MongoDB duplicate key errors (backup check)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        error: `DUPLICATE_${field.toUpperCase()}`,
        message: `This ${field} is already registered.`,
        field
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred during registration. Please try again.'
    });
  }
});

/**
 * Logout endpoint - Terminates user session
 */
app.post('/api/auth/logout', authenticateSession, (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const success = sessionService.terminateSessionByToken(token);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Session not found'
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Check session status endpoint
 */
app.get('/api/auth/session', authenticateSession, (req, res) => {
  try {
    const sessionInfo = sessionService.getSessionInfo(req.user.email);

    if (!sessionInfo) {
      return res.status(401).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email: sessionInfo.email,
        sessionStartTime: sessionInfo.createdAt,
        lastActive: sessionInfo.lastActive,
        userAgent: sessionInfo.userAgent,
        ipAddress: sessionInfo.ipAddress
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Force logout endpoint (for user to logout from other devices)
 */
app.post('/api/auth/force-logout', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const success = sessionService.terminateSession(normalizedEmail);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'All sessions terminated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No active session found for this email'
      });
    }
  } catch (error) {
    console.error('Force logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Admin endpoint - Get all active sessions
 */
app.get('/api/admin/active-sessions', authenticateAdmin, (req, res) => {
  try {
    const activeSessions = sessionService.getAllActiveSessions();

    res.status(200).json({
      success: true,
      data: {
        totalSessions: activeSessions.length,
        sessions: activeSessions
      }
    });
  } catch (error) {
    console.error('Admin sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Admin endpoint - Force logout all users
 */
app.post('/api/admin/force-logout-all', authenticateAdmin, (req, res) => {
  try {
    sessionService.forceLogoutAll();

    res.status(200).json({
      success: true,
      message: 'All user sessions terminated'
    });
  } catch (error) {
    console.error('Admin force logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Admin endpoint - Get security metrics
 * Returns real-time security statistics from the database
 */
app.get('/api/admin/security/metrics', authenticateAdmin, async (req, res) => {
  try {
    const securityService = require('./services/securityService');
    const metrics = await securityService.getSecurityMetrics();

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Security metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security metrics'
    });
  }
});

/**
 * Admin endpoint - Get security events
 * Returns recent security events from audit logs
 */
app.get('/api/admin/security/events', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 50, severity } = req.query;
    const securityService = require('./services/securityService');
    const events = await securityService.getSecurityEvents(parseInt(limit), severity);

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Security events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security events'
    });
  }
});

// ==========================================
// SECURITY BREACH MANAGEMENT - ADMIN ENDPOINTS
// ==========================================

/**
 * Admin endpoint - Flag user account as security breach
 * Permanently blocks a user from online voting
 */
app.post('/api/admin/security/flag-breach', authenticateAdmin, async (req, res) => {
  try {
    const { email, reason, details } = req.body;

    if (!email || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Email and reason are required'
      });
    }

    const securityService = require('./services/securityService');
    const result = await securityService.flagSecurityBreach(
      email,
      reason,
      details || {}
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        user: {
          email: result.user.email,
          breached: true,
          reason: result.user.securityBreach.reason,
          detectedAt: result.user.securityBreach.detectedAt
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Security breach flag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag security breach'
    });
  }
});

/**
 * Admin endpoint - Get security breach status for user
 */
app.get('/api/admin/security/status/:email', authenticateAdmin, async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required'
      });
    }

    const securityService = require('./services/securityService');
    const isBreached = await securityService.isAccountBreached(email);
    const breachInfo = isBreached ? await securityService.getBreachInfo(email) : null;

    res.status(200).json({
      success: true,
      data: {
        email,
        isBreached,
        breachInfo
      }
    });
  } catch (error) {
    console.error('Security status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check security status'
    });
  }
});

/**
 * Admin endpoint - Clear security breach flag (restore access)
 */
app.post('/api/admin/security/clear-breach', authenticateAdmin, async (req, res) => {
  try {
    const { email, reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const securityService = require('./services/securityService');
    const result = await securityService.clearSecurityBreach(
      email,
      reason || 'Admin override'
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        user: {
          email: result.user.email,
          breached: false
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Security breach clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear security breach'
    });
  }
});

/**
 * Admin endpoint - Get all breached accounts
 */
app.get('/api/admin/security/breached-accounts', authenticateAdmin, async (req, res) => {
  try {
    const breachedUsers = await User.find(
      { 'securityBreach.detected': true },
      {
        email: 1,
        voterID: 1,
        'securityBreach.reason': 1,
        'securityBreach.detectedAt': 1,
        'securityBreach.details': 1
      }
    ).sort({ 'securityBreach.detectedAt': -1 });

    res.status(200).json({
      success: true,
      data: {
        total: breachedUsers.length,
        accounts: breachedUsers.map(user => ({
          email: user.email,
          voterID: user.voterID,
          reason: user.securityBreach?.reason,
          detectedAt: user.securityBreach?.detectedAt,
          details: user.securityBreach?.details
        }))
      }
    });
  } catch (error) {
    console.error('Get breached accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch breached accounts'
    });
  }
});

/**
 * Admin endpoint - Detect security threats for a login attempt
 */
app.post('/api/admin/security/detect-threats', authenticateAdmin, async (req, res) => {
  try {
    const { email, ipAddress, userAgent, attemptCount } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const securityService = require('./services/securityService');
    const threats = await securityService.detectSecurityThreats({
      email,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      attemptCount: attemptCount || 0
    });

    res.status(200).json({
      success: true,
      data: {
        email,
        threats,
        threatLevel: threats.length > 0 ? 'HIGH' : 'LOW'
      }
    });
  } catch (error) {
    console.error('Threat detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect threats'
    });
  }
});

/**
 * Admin endpoint - Reset voting status for user
 * IMPORTANT: Only use this for testing/admin purposes in non-production
 * Deletes the vote record and resets hasVoted flag
 */
app.post('/api/admin/reset-voting-status', authenticateAdmin, async (req, res) => {
  try {
    const { email, mobile, voterID } = req.body;

    if (!email && !mobile && !voterID) {
      return res.status(400).json({
        success: false,
        error: 'At least one identifier (email, mobile, or voterID) is required'
      });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;
    const cleanMobile = mobile ? mobile.replace(/\D/g, '') : null;
    const cleanVoterID = voterID ? voterID.toUpperCase().trim() : null;

    // Find vote records to delete
    const deleteQuery = {};
    if (normalizedEmail) deleteQuery.userEmail = normalizedEmail;
    if (cleanVoterID) deleteQuery.voterID = cleanVoterID;

    const voteDeleteResult = await Vote.deleteMany(deleteQuery);
    console.log(`🗑️ Deleted ${voteDeleteResult.deletedCount} vote records`);

    // Reset hasVoted flag in User collection
    const updateQuery = {};
    if (normalizedEmail) updateQuery.email = normalizedEmail;
    if (cleanMobile) updateQuery.mobile = cleanMobile;
    if (cleanVoterID) updateQuery.voterID = cleanVoterID;

    const userUpdateResult = await User.updateMany(
      updateQuery,
      {
        hasVoted: false,
        votedAt: null
      }
    );
    console.log(`✅ Updated ${userUpdateResult.modifiedCount} user records`);

    // Log the admin action
    await AuditLog.create({
      action: 'admin_reset_voting_status',
      userEmail: normalizedEmail || 'unknown',
      voterID: cleanVoterID || 'unknown',
      status: 'success',
      details: {
        email: normalizedEmail,
        mobile: cleanMobile ? cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2') : undefined,
        voterID: cleanVoterID,
        votesDeleted: voteDeleteResult.deletedCount,
        usersUpdated: userUpdateResult.modifiedCount
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      deviceInfo: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Voting status reset successfully',
      data: {
        votesDeleted: voteDeleteResult.deletedCount,
        usersUpdated: userUpdateResult.modifiedCount,
        filters: {
          email: normalizedEmail,
          mobile: cleanMobile,
          voterID: cleanVoterID
        }
      }
    });

  } catch (error) {
    console.error('Reset voting status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset voting status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Admin endpoint - Cleanup inconsistent voting status
 * Removes hasVoted flag from users who don't have actual vote records
 * This fixes the issue where users are blocked from voting due to data inconsistency
 */
app.post('/api/admin/cleanup-voting-data', authenticateAdmin, async (req, res) => {
  try {
    console.log('🧹 Starting voting data consistency cleanup...');

    // Get all users marked as hasVoted
    const usersWithVoted = await User.find({ hasVoted: true });
    console.log(`Found ${usersWithVoted.length} users marked as hasVoted`);

    let fixedCount = 0;
    const fixedUsers = [];

    // Check each user to see if they have actual vote records
    for (const user of usersWithVoted) {
      const actualVote = await Vote.findOne({
        $or: [
          { userEmail: user.email },
          { voterID: user.voterID }
        ]
      });

      // If no actual vote record exists, this is a data inconsistency - fix it
      if (!actualVote) {
        console.warn(`⚠️ Found inconsistency: User ${user.email} (${user.voterID}) marked as hasVoted but no vote record exists. Fixing...`);

        await User.updateOne(
          { _id: user._id },
          {
            hasVoted: false,
            votedAt: null
          }
        );

        fixedUsers.push({
          email: user.email,
          voterID: user.voterID,
          mobile: user.mobile,
          hadVotedFlag: true,
          hadVoteRecord: false
        });
        fixedCount++;
      }
    }

    // Log the cleanup action
    if (fixedCount > 0) {
      await AuditLog.create({
        action: 'admin_cleanup_voting_data',
        status: 'success',
        details: {
          totalUsersChecked: usersWithVoted.length,
          inconsistenciesFixed: fixedCount,
          fixedUsers: fixedUsers.map(u => ({ email: u.email, voterID: u.voterID }))
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      });
    }

    res.status(200).json({
      success: true,
      message: `Voting data cleanup completed. Fixed ${fixedCount} inconsistencies.`,
      data: {
        totalUsersChecked: usersWithVoted.length,
        inconsistenciesFixed: fixedCount,
        fixedUsers: fixedUsers
      }
    });

  } catch (error) {
    console.error('Voting data cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup voting data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Admin endpoint - Get voting status for user
 */
app.get('/api/admin/voting-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email parameter is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check User collection
    const user = await User.findOne({ email: normalizedEmail });

    // Get ALL votes for this user (for per-election tracking)
    const votes = await Vote.find({ userEmail: normalizedEmail }).select('electionId votedAt candidateName partyName blockchainConfirmed');

    // Build votedElections array
    const votedElections = votes.map(v => ({
      electionId: v.electionId,
      votedAt: v.votedAt || v.createdAt
    }));

    if (!user && votes.length === 0) {
      return res.status(404).json({
        success: true,
        data: {
          email: normalizedEmail,
          exists: false,
          hasVoted: false,
          votedElections: [],
          message: 'User not found'
        }
      });
    }

    // Get the first vote for backward compatibility
    const vote = votes.length > 0 ? votes[0] : null;

    res.status(200).json({
      success: true,
      data: {
        email: normalizedEmail,
        exists: !!user,
        hasVoted: user?.hasVoted || votes.length > 0,
        votedElections: votedElections,
        user: user ? {
          id: user._id,
          voterID: user.voterID,
          name: user.name,
          mobile: user.mobile,
          hasVoted: user.hasVoted,
          votedAt: user.votedAt,
          votedElections: votedElections,
          createdAt: user.createdAt
        } : null,
        vote: vote ? {
          id: vote._id,
          candidateName: vote.candidateName,
          partyName: vote.partyName,
          votedAt: vote.votedAt || vote.createdAt,
          blockchainConfirmed: vote.blockchainConfirmed
        } : null
      }
    });

  } catch (error) {
    console.error('Get voting status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voting status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==========================================
// End Admin Voting Status Routes
// ==========================================

// ==========================================

/**
 * Generate and Send OTP endpoint - Real SMS-based OTP
 * Sends OTP to user's registered mobile number via Fast2SMS
 */
app.post('/api/auth/send-otp', loginLimiter, async (req, res) => {
  try {
    const { email, mobile } = req.body;

    // Validate input
    if (!email || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Email and mobile number are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Clean and validate mobile number
    const cleanMobile = mobile.replace(/\D/g, '');
    const mobileRegex = /^[6-9]\d{9}$/;
    const internationalRegex = /^\d{10,15}$/;

    if (!mobileRegex.test(cleanMobile) && !internationalRegex.test(cleanMobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ============================================
    // TRACK VOTED ELECTIONS - ALLOW LOGIN, RESTRICT VOTING PER-ELECTION
    // ============================================

    // Check voted elections for informational purposes only (don't block login)
    let votedElections = [];
    try {
      const existingVotes = await Vote.find({
        userEmail: normalizedEmail
      }).select('electionId votedAt');

      if (existingVotes.length > 0) {
        votedElections = existingVotes.map(v => ({
          electionId: v.electionId,
          votedAt: v.votedAt
        }));
        console.log(`📋 OTP request: User ${normalizedEmail} has voted in ${votedElections.length} election(s) - allowing login anyway`);
      }

    } catch (dbError) {
      console.warn('⚠️ Database check for voting status failed:', dbError.message);
      // Continue with OTP generation if database check fails
    }

    // Check for active session (still block multi-device login)
    if (sessionService.hasActiveSession(normalizedEmail)) {
      return res.status(409).json({
        success: false,
        error: 'ACTIVE_SESSION',
        message: 'This account already has an active session. Please logout from other devices first.'
      });
    }

    // ============================================
    // GENERATE AND SEND REAL SMS OTP
    // ============================================

    try {
      const otpResult = await smsOTPService.generateAndSendOTP(normalizedEmail, cleanMobile);

      if (otpResult.success) {
        // Log OTP generation attempt
        await AuditLog.create({
          action: 'otp_verify',
          userEmail: normalizedEmail,
          details: {
            mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
            method: 'Fast2SMS',
            status: 'sent'
          },
          status: 'success',
          ipAddress: req.ip || req.connection.remoteAddress,
          deviceInfo: req.get('User-Agent')
        });

        return res.status(200).json({
          success: true,
          message: otpResult.message,
          data: otpResult.data
        });
      } else {
        throw new Error(otpResult.message || 'Failed to send OTP');
      }

    } catch (error) {
      console.error('❌ Error generating and sending OTP:', error.message);

      // Log the error
      await AuditLog.create({
        action: 'otp_verify',
        userEmail: normalizedEmail,
        details: {
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          method: 'Fast2SMS',
          status: 'failed',
          error: error.message
        },
        status: 'failure',
        errorMessage: error.message,
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(500).json({
        success: false,
        error: 'OTP_SEND_FAILED',
        message: 'Failed to send OTP. Please check your mobile number and try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

  } catch (error) {
    console.error('OTP generation error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate OTP. Please try again.'
    });
  }
});

/**
 * Verify OTP endpoint - Real SMS OTP verification
 * User must enter OTP received on their mobile phone
 */
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, mobile, otp } = req.body;

    if (!email || !mobile || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email, mobile, and OTP are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanMobile = mobile.replace(/\D/g, '');

    // ============================================
    // VERIFY OTP USING SMS OTP SERVICE
    // ============================================

    const verificationResult = await smsOTPService.verifyOTP(normalizedEmail, cleanMobile, otp);

    if (!verificationResult.success) {
      // Log failed OTP verification attempt
      await AuditLog.create({
        action: 'otp_verify',
        userEmail: normalizedEmail,
        details: {
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          method: 'Fast2SMS',
          status: 'failed',
          error: verificationResult.error
        },
        status: 'failure',
        errorMessage: verificationResult.message,
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(400).json({
        success: false,
        error: verificationResult.error,
        message: verificationResult.message,
        attemptsRemaining: verificationResult.attemptsRemaining
      });
    }

    // OTP is verified - proceed with login
    console.log(`✅ OTP verified for ${normalizedEmail}`);

    const { userAgent, ipAddress } = getClientInfo(req);

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
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          attemptedEmail: normalizedEmail
        },
        status: 'failure',
        errorMessage: 'Mobile number already registered to another account',
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(409).json({
        success: false,
        error: 'MOBILE_ALREADY_REGISTERED',
        message: 'This mobile number is already registered with another email address. Each mobile number can only be linked to one account.'
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
        ipAddress: req.ip || req.connection.remoteAddress,
        deviceInfo: req.get('User-Agent')
      }).catch(err => console.error('Failed to log error:', err));

      return res.status(409).json({
        success: false,
        error: 'MOBILE_MISMATCH',
        message: 'This email is already registered with a different mobile number. Please use the original mobile number to login.'
      });
    }

    // ============================================
    // CREATE USER AND SESSION AFTER OTP VERIFICATION
    // ============================================

    try {
      // Create or update user in database
      const user = await User.findOneAndUpdate(
        { email: normalizedEmail },
        {
          $set: {
            email: normalizedEmail,
            mobile: cleanMobile,
            lastLogin: new Date(),
            ipAddress,
            deviceInfo: userAgent,
            isVerified: true,
            isEmailVerified: true
          }
        },
        { upsert: true, new: true }
      );

      console.log(`✅ User ${normalizedEmail} saved/updated in database (ID: ${user._id})`);

      // Get voted elections for this user
      let votedElections = [];
      try {
        const existingVotes = await Vote.find({ userEmail: normalizedEmail }).select('electionId votedAt');
        votedElections = existingVotes.map(v => ({ electionId: v.electionId, votedAt: v.votedAt }));
        if (votedElections.length > 0) {
          console.log(`📋 User ${normalizedEmail} has voted in ${votedElections.length} election(s)`);
        }
      } catch (err) {
        console.warn('⚠️ Failed to fetch voted elections:', err.message);
      }

      // Create session
      const session = sessionService.createSession(normalizedEmail, userAgent, ipAddress);

      // Create audit log for successful OTP verification and login
      await AuditLog.create({
        action: 'otp_verify',
        userEmail: normalizedEmail,
        details: {
          mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
          method: 'Fast2SMS',
          status: 'verified',
          sessionCreated: true
        },
        status: 'success',
        ipAddress,
        deviceInfo: userAgent
      });

      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully. Login successful.',
        data: {
          token: session.token,
          email: normalizedEmail,
          expiresAt: session.expiresAt,
          user: {
            id: user._id,
            email: user.email,
            mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'),
            isVerified: true,
            votedElections: votedElections
          }
        }
      });

    } catch (dbError) {
      console.error('❌ Error creating user/session after OTP verification:', dbError);

      return res.status(500).json({
        success: false,
        error: 'SESSION_CREATION_ERROR',
        message: 'OTP verified but failed to create session. Please try again.',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'OTP verification failed. Please try again.'
    });
  }
});

// ==========================================
// End OTP Routes
// ==========================================

// emailService already required at top of file

/**
 * Send Email OTP
 * Sends an OTP code to the user's email address via Brevo SMTP
 */
app.post('/api/auth/send-email-otp', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Generate and send OTP
    const result = await emailService.generateAndSendOTP(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email,
        expiresIn: result.expiresIn
      }
    });
  } catch (error) {
    console.error('Error sending email OTP:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email OTP'
    });
  }
});

/**
 * Verify Email OTP
 * Verifies the OTP code sent to user's email
 */
app.post('/api/auth/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    // Verify OTP
    const result = emailService.verifyOTP(email, otp);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        attemptsRemaining: result.attemptsRemaining
      });
    }

    // Create session for verified user
    const sessionToken = sessionService.createSession(result.email);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        email: result.email,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } catch (error) {
    console.error('Error verifying email OTP:', error);

    res.status(400).json({
      success: false,
      error: error.message || 'Invalid or expired OTP'
    });
  }
});

/**
 * Resend Email OTP
 * Resends OTP to the user's email address
 */
app.post('/api/auth/resend-email-otp', loginLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Generate and send new OTP
    const result = await emailService.generateAndSendOTP(email);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        email: result.email,
        expiresIn: result.expiresIn
      }
    });
  } catch (error) {
    console.error('Error resending email OTP:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resend email OTP'
    });
  }
});

// ==========================================
// End Email OTP Routes
// ==========================================

// MongoDB API Routes
const userController = require('./controllers/userController');

// Registration & User Management
app.get('/api/auth/check-registration', userController.checkRegistrationStatus); // Check if voter already registered
app.post('/api/users', userController.createOrUpdateUser);
app.get('/api/users', userController.getAllUsers); // Get all users
app.get('/api/users/:identifier/details', userController.getUserDetails); // Get single user details
app.put('/api/users/:identifier', userController.updateUser); // Update user
app.delete('/api/users/:identifier', userController.deleteUser); // Delete user
app.post('/api/users/face-data', userController.storeFaceData);
app.get('/api/users/:email/face-data', userController.getFaceData);
app.get('/api/users/:voterID/voting-status', userController.checkVotingStatus);

// Voting
app.post('/api/votes', userController.recordVote);
app.get('/api/votes/stats', userController.getVotingStats);
app.get('/api/votes/results', userController.getVoteResults);

// Audit
app.get('/api/audit-logs', userController.getAuditLogs);

// Email OTP Verification Flow (Database-backed)
app.post('/api/auth/send-verification-otp', userController.sendEmailVerificationOTP);
app.post('/api/auth/verify-email', userController.verifyEmailOTP);
app.post('/api/auth/resend-verification-otp', userController.resendEmailVerificationOTP);
app.post('/api/auth/fix-username', userController.fixCorruptedUsername);
app.post('/api/auth/reset-password', userController.resetUserPassword);
app.get('/api/auth/debug-user', userController.debugCheckUser);

// ==========================================
// OTP MANAGEMENT - ADMIN ENDPOINTS
// ==========================================

/**
 * Admin endpoint - Get OTP store statistics
 * Shows pending OTPs and their status
 */
app.get('/api/admin/otp/stats', authenticateAdmin, (req, res) => {
  try {
    const stats = smsOTPService.getOTPStoreStats();
    res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        ...stats
      }
    });
  } catch (error) {
    console.error('OTP stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// GET DEMO OTP LOG (for development/debugging)
// =====================================================

/**
 * Admin endpoint - Check OTP status for specific user
 */
app.get('/api/admin/otp/status/:email/:mobile', authenticateAdmin, (req, res) => {
  try {
    const { email, mobile } = req.params;

    if (!email || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Email and mobile are required'
      });
    }

    const otpInfo = smsOTPService.getOTPInfo(email, mobile);

    if (!otpInfo) {
      return res.status(200).json({
        success: true,
        data: {
          pending: false,
          message: 'No pending OTP for this user'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        pending: true,
        ...otpInfo
      }
    });
  } catch (error) {
    console.error('OTP status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check OTP status'
    });
  }
});

/**
 * Admin endpoint - Clear OTP for user (emergency bypass)
 */
app.post('/api/admin/otp/clear', authenticateAdmin, (req, res) => {
  try {
    const { email, mobile } = req.body;

    if (!email || !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Email and mobile are required'
      });
    }

    const cleared = smsOTPService.clearOTP(email, mobile);

    res.status(200).json({
      success: true,
      message: cleared
        ? 'OTP cleared successfully'
        : 'No pending OTP found for this user',
      data: { cleared }
    });
  } catch (error) {
    console.error('OTP clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear OTP'
    });
  }
});

/**
 * Admin endpoint - Cleanup expired OTPs
 * Call this periodically to free up memory
 */
app.post('/api/admin/otp/cleanup', authenticateAdmin, (req, res) => {
  try {
    const cleanedCount = smsOTPService.cleanupExpiredOTPs();
    res.status(200).json({
      success: true,
      message: `Cleanup completed. ${cleanedCount} expired OTPs removed.`,
      data: {
        cleanedCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('OTP cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup OTPs'
    });
  }
});

// ==========================================
// ELECTION MANAGEMENT - ADMIN & VOTER APIs
// ==========================================
const { Election } = require('./models');

/**
 * CREATE NEW ELECTION (Admin only)
 * POST /api/elections
 */
app.post('/api/elections', authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      registrationDeadline,
      region,
      totalVoters,
      candidates,
      createdBy,
      settings
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, type, startDate, endDate'
      });
    }

    // Determine status based on dates
    const now = new Date();
    const electionStartDate = new Date(startDate);
    let status = 'draft';

    if (electionStartDate > now) {
      status = 'scheduled';
    } else if (electionStartDate <= now && new Date(endDate) > now) {
      status = 'active';
    }

    const newElection = await Election.create({
      title: title.trim(),
      description: description.trim(),
      type,
      status,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      region: region || { name: 'Default Region', state: 'All States', constituencies: [] },
      totalVoters: totalVoters || 0,
      votesCast: 0,
      candidates: candidates || [],
      createdBy: createdBy || 'admin',
      settings: settings || {
        allowEarlyVoting: false,
        requireVoterVerification: true,
        enableRealTimeResults: false,
        allowProxyVoting: false,
        enableBlockchain: true,
        requireBiometric: false
      }
    });

    console.log(`✅ Election created: "${newElection.title}" (Status: ${newElection.status})`);

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      data: newElection
    });
  } catch (error) {
    console.error('Election creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create election',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET ALL ELECTIONS (Admin only)
 * GET /api/elections
 */
app.get('/api/elections', async (req, res) => {
  try {
    const elections = await Election.find().sort({ createdAt: -1 });

    // Calculate votesCast for each election from Vote collection
    const electionsWithVotes = await Promise.all(
      elections.map(async (election) => {
        const voteCount = await Vote.countDocuments({ electionId: election._id.toString() });
        const electionObj = election.toObject();
        electionObj.votesCast = voteCount;
        return electionObj;
      })
    );

    res.status(200).json({
      success: true,
      data: {
        total: electionsWithVotes.length,
        elections: electionsWithVotes
      }
    });
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch elections'
    });
  }
});

/**
 * GET ACTIVE ELECTIONS FOR VOTERS
 * GET /api/elections/active
 * Key endpoint for voter-facing display
 * Returns active and completed elections with vote counts
 */
app.get('/api/elections/active', async (req, res) => {
  try {
    const now = new Date();

    // Query for ACTIVE and COMPLETED elections
    const elections = await Election.find({
      $or: [
        {
          $and: [
            { status: 'active' },
            { startDate: { $lte: now } },
            { endDate: { $gte: now } }
          ]
        },
        { status: 'completed' }
      ]
    }).sort({ startDate: -1 });

    // Calculate votesCast for each election from Vote collection
    const electionsWithVotes = await Promise.all(
      elections.map(async (election) => {
        const voteCount = await Vote.countDocuments({ electionId: election._id.toString() });
        const electionObj = election.toObject();
        electionObj.votesCast = voteCount;
        return electionObj;
      })
    );

    console.log(`📊 Elections query: Found ${electionsWithVotes.length} elections (active + completed)`);
    console.log(`   Server time: ${now.toISOString()}`);
    electionsWithVotes.forEach(e => {
      console.log(`   - ${e.title}: ${e.startDate.toISOString()} to ${e.endDate.toISOString()} [${e.status}] - ${e.votesCast} votes`);
    });

    res.status(200).json({
      success: true,
      data: {
        total: electionsWithVotes.length,
        serverTime: now.toISOString(),
        elections: electionsWithVotes
      }
    });
  } catch (error) {
    console.error('Get active elections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active elections',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET ELECTIONS BY REGION FOR VOTERS
 * GET /api/elections/active/region?state=Maharashtra&district=Mumbai
 */
app.get('/api/elections/active/region', async (req, res) => {
  try {
    const { state, district } = req.query;
    const now = new Date();

    let query = {
      $and: [
        { status: 'active' },
        { startDate: { $lte: now } },
        { endDate: { $gte: now } }
      ]
    };

    // Add region filters
    if (state) {
      query.$or = [
        { 'region.state': state },
        { 'region.state': 'All States' }
      ];
    }

    if (district) {
      query['region.district'] = district;
    }

    const elections = await Election.find(query).sort({ startDate: -1 });

    console.log(`🗺️  Elections by region: state=${state}, district=${district}`);
    console.log(`   Found ${elections.length} elections`);

    res.status(200).json({
      success: true,
      data: {
        total: elections.length,
        filters: { state, district },
        elections
      }
    });
  } catch (error) {
    console.error('Get elections by region error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch elections for region'
    });
  }
});

/**
 * GET ELECTION DETAILS
 * GET /api/elections/:id
 */
app.get('/api/elections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findById(id);

    if (!election) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      });
    }

    res.status(200).json({
      success: true,
      data: election,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get election error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch election'
    });
  }
});

/**
 * UPDATE ELECTION (Admin only)
 * PUT /api/elections/:id
 */
app.put('/api/elections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow changing ID or creation date
    delete updates._id;
    delete updates.createdAt;

    // Update timestamps
    updates.updatedAt = new Date();

    const election = await Election.findByIdAndUpdate(id, updates, { new: true });

    if (!election) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      });
    }

    console.log(`✏️  Election updated: "${election.title}"`);

    res.status(200).json({
      success: true,
      message: 'Election updated successfully',
      data: election
    });
  } catch (error) {
    console.error('Election update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update election'
    });
  }
});

/**
 * DELETE ELECTION (Admin only)
 * DELETE /api/elections/:id
 */
app.delete('/api/elections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const election = await Election.findByIdAndDelete(id);

    if (!election) {
      return res.status(404).json({
        success: false,
        error: 'Election not found'
      });
    }

    console.log(`🗑️  Election deleted: "${election.title}"`);

    res.status(200).json({
      success: true,
      message: 'Election deleted successfully'
    });
  } catch (error) {
    console.error('Election deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete election'
    });
  }
});

// ==========================================
// End Election Management Routes
// ==========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  // Handle apiError instances (from asynchandler)
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
  });
});

// ── Admin: manually trigger blockchain reconciliation ────────────────────
app.post('/api/admin/blockchain/confirm-votes', async (req, res) => {
  try {
    const result = await confirmPendingBlockchainVotes();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Admin: get count of unconfirmed blockchain votes ─────────────────────
app.get('/api/admin/blockchain/pending-votes', async (req, res) => {
  try {
    const count = await Vote.countDocuments({
      $or: [{ blockchainTxHash: null }, { blockchainConfirmed: false }]
    });
    res.json({ success: true, pendingCount: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Authentication server running on port ${PORT}`);
  console.log(`📡 Accessible from network at: http://10.224.94.165:${PORT}`);

  // Attempt to confirm any votes that were recorded without a blockchain hash.
  // Runs once 15 seconds after startup (giving the Hardhat node time to be ready)
  // and then every 5 minutes thereafter.
  setTimeout(() => confirmPendingBlockchainVotes().catch(() => {}), 15000);
  setInterval(() => confirmPendingBlockchainVotes().catch(() => {}), 5 * 60 * 1000);

  // Check Fast2SMS configuration
  try {
    require('./services/smsOTPService').validateFast2SMSConfig();
    console.log(`✅ Fast2SMS API configured - SMS OTP enabled`);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    console.error(`   Set FAST2SMS_API_KEY environment variable to enable SMS OTP`);
  }

  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST /api/auth/register - Voter registration (with duplicate prevention)`);
  console.log(`   POST /api/auth/login - User login`);
  console.log(`   POST /api/auth/send-otp - Send OTP via SMS (Fast2SMS)`);
  console.log(`   POST /api/auth/verify-otp - Verify OTP received on mobile`);
  console.log(`   POST /api/auth/logout - User logout`);
  console.log(`   GET  /api/auth/session - Check session status`);
  console.log(`   POST /api/auth/force-logout - Force logout from email`);
  console.log(`   GET  /api/admin/active-sessions - View all active sessions`);
  console.log(`   POST /api/admin/force-logout-all - Force logout all users`);
  console.log(`   GET  /api/admin/otp/stats - OTP statistics`);
  console.log(`   GET  /api/admin/otp/status/:email/:mobile - Check OTP status`);
  console.log(`   POST /api/admin/otp/clear - Clear OTP (admin)`);
  console.log(`   POST /api/admin/otp/cleanup - Cleanup expired OTPs`);
  console.log(`   POST /api/elections - Create new election (admin)`);
  console.log(`   GET  /api/elections - Get all elections (admin)`);
  console.log(`   GET  /api/elections/active - Get active elections (voters)`);
  console.log(`   GET  /api/elections/active/region - Get elections by region (voters)`);
  console.log(`   GET  /api/elections/:id - Get election details`);
  console.log(`   PUT  /api/elections/:id - Update election (admin)`);
  console.log(`   DELETE /api/elections/:id - Delete election (admin)`);
  console.log(`\n🔒 Security: API key stored in environment variables`);
  console.log(`📊 MongoDB connection managed via MONGO_URI environment variable`);
});

module.exports = app;