import React, { useState, useEffect } from 'react';
import { Mail, Phone, Shield, User, Settings, AlertTriangle, Clock, Vote, XCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import authService from '../../services/authService';

interface LoginFormProps {
  onLogin: (email: string, mobile: string, options?: { skipOtp?: boolean; isAdmin?: boolean }) => Promise<boolean>;
  loginError?: string | null;
  onClearError?: () => void;
  onRegisterClick?: () => void;
}

interface DuplicateLoginDetails {
  sessionStartTime: string;
  lastActive: string;
  currentDevice: string;
  currentIP: string;
}

interface SecurityBreachInfo {
  reason?: string;
  detectedAt?: string;
  blockedSince?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, loginError, onClearError, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [loginType, setLoginType] = useState<'voter' | 'admin'>('voter');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateLoginInfo, setDuplicateLoginInfo] = useState<DuplicateLoginDetails | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [voterIdError, setVoterIdError] = useState<string | null>(null);
  const [securityBreachInfo, setSecurityBreachInfo] = useState<SecurityBreachInfo | null>(null);
  const [showSecurityBreachPopup, setShowSecurityBreachPopup] = useState(false);
  
  const { t } = useTranslation();

  // Handle loginError from props (e.g., when redirected from Voter ID page)
  useEffect(() => {
    if (loginError) {
      setVoterIdError(loginError);
    }
  }, [loginError]);

  const handleClearVoterIdError = () => {
    setVoterIdError(null);
    if (onClearError) {
      onClearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVoterIdError(null);
    if (onClearError) onClearError();
    setShowDuplicateDialog(false);
    setIsLoading(true);
    
    try {
      if (loginType === 'admin') {
        // Admin login: validate credentials against real backend API
        if (!email || !adminPassword) {
          setError('Please enter admin credentials');
          return;
        }

        try {
          const apiUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api';
          const adminResponse = await fetch(`${apiUrl}/auth/admin-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.toLowerCase().trim(), password: adminPassword })
          });

          const adminData = await adminResponse.json();

          if (!adminResponse.ok || !adminData.success) {
            setError(adminData.error || 'Invalid admin credentials. Please try again.');
            return;
          }

          // Store admin token for admin API calls (sent as X-Admin-Token header)
          localStorage.setItem('votelink_admin_token', adminData.data.adminToken);

          const result = await onLogin(email, '', { skipOtp: true, isAdmin: true });
          if (!result) {
            setError('Admin session creation failed. Please try again.');
          }
        } catch (err) {
          console.error('Admin login error:', err);
          setError('Unable to connect to server. Please ensure the backend is running.');
        }
      } else {
        // Voter login with session management
        if (!email || !mobile) {
          setError('Please enter email and mobile number');
          return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('Please enter a valid email address');
          return;
        }
        
        // Validate mobile number (Indian format)
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobile)) {
          setError('Please enter a valid 10-digit mobile number starting with 6-9');
          return;
        }
        
        // NOTE: Removed global voting check - users can now login even if they've voted
        // Per-election voting restrictions are checked when selecting an election to vote
        
        // Try to login using authentication service
        const loginResult = await authService.login(email, mobile);
        
        if (loginResult.success) {
          // Login successful, proceed with existing onLogin flow
          await onLogin(email, mobile, { skipOtp: false, isAdmin: false });
        } else {
          // Handle different error types
          switch (loginResult.error) {
            case 'SECURITY_BREACH':
              // Account has security breach - show permanent block popup
              setSecurityBreachInfo({
                reason: loginResult.details?.reason,
                detectedAt: loginResult.blockedSince,
              });
              setShowSecurityBreachPopup(true);
              break;
            case 'ALREADY_VOTED':
              // This case should no longer occur as backend now allows login
              // But handle gracefully if it does - just proceed with login
              console.log('Received ALREADY_VOTED from server, but still allowing login');
              await onLogin(email, mobile, { skipOtp: false, isAdmin: false });
              break;
            case 'DUPLICATE_LOGIN':
              // Auto force logout and retry login
              console.log('Duplicate session detected, forcing logout automatically...');
              const forceLogoutResult = await authService.forceLogout(email);
              
              if (forceLogoutResult.success) {
                // Retry login after successful force logout
                const retryResult = await authService.login(email, mobile);
                if (retryResult.success) {
                  await onLogin(email, mobile, { skipOtp: false, isAdmin: false });
                } else {
                  setError('Login failed after clearing previous session. Please try again.');
                }
              } else {
                // If auto force logout fails, show dialog
                setDuplicateLoginInfo(loginResult.details || null);
                setShowDuplicateDialog(true);
                setError(loginResult.message || 'User already logged in');
              }
              break;
            case 'RATE_LIMITED':
              setError(`Too many login attempts. Please try again after ${loginResult.retryAfter || '15 minutes'}.`);
              break;
            case 'VALIDATION_ERROR':
              setError(loginResult.message || 'Validation error occurred');
              break;
            case 'NETWORK_ERROR':
              setError(loginResult.message || 'Unable to connect to server. Please check your internet connection.');
              break;
            default:
              setError(loginResult.message || 'Login failed. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!email) return;
    
    setIsLoading(true);
    try {
      const result = await authService.forceLogout(email);
      
      if (result.success) {
        setShowDuplicateDialog(false);
        setError(null);
        // Now try to login again by creating a synthetic form event
        const syntheticEvent = {
          preventDefault: () => {}
        } as React.FormEvent;
        await handleSubmit(syntheticEvent);
      } else {
        setError(result.message || 'Failed to logout from other devices');
      }
    } catch (err) {
      console.error('Force logout error:', err);
      setError('Failed to logout from other devices');
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl p-4 w-full max-w-[380px] border border-white/30">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-11 h-11 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-2 flex items-center justify-center shadow-lg">
            <Vote className="text-white w-5 h-5" />
          </div>
          
          <h1 className="text-xl font-bold text-black mb-1">{t('title')}</h1>
          <p className="text-xs text-gray-700">{t('loginSubtitle')}</p>
        </div>

        {/* Login Error Banner */}
        {voterIdError && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-red-800">
                  {voterIdError}
                </p>
              </div>
              <button
                onClick={handleClearVoterIdError}
                className="ml-2 flex-shrink-0 p-1 rounded-full hover:bg-red-100 transition-colors"
              >
                <XCircle className="w-5 h-5 text-red-400 hover:text-red-600" />
              </button>
            </div>
          </div>
        )}

        {/* Security Breach Detected - Permanent Block Popup */}
        {showSecurityBreachPopup && securityBreachInfo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform animate-in">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <h2 className="text-center text-2xl font-bold text-red-600 mb-4">
                Security Breach Detected
              </h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-center text-base font-semibold text-gray-900 mb-3">
                  Your account has been permanently blocked for online voting.
                </p>
                <p className="text-center text-sm text-gray-700 leading-relaxed">
                  A security breach was detected on your account. For your protection and the integrity of the election, online voting access has been permanently revoked.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-center text-sm text-gray-700">
                  <span className="font-semibold text-blue-900">Please visit the nearest offline voting booth to cast your vote.</span>
                </p>
                {securityBreachInfo.detectedAt && (
                  <p className="text-center text-xs text-gray-600 mt-2">
                    Breach detected: {new Date(securityBreachInfo.detectedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="text-center mb-6">
                <p className="text-xs text-gray-500">
                  If you believe this is an error or need assistance, please contact the Election Commission help desk.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowSecurityBreachPopup(false);
                  setSecurityBreachInfo(null);
                  setEmail('');
                  setMobile('');
                }}
                className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl">
            <div className="flex items-center text-red-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Duplicate Login Dialog */}
        {showDuplicateDialog && duplicateLoginInfo && (
          <div className="mb-4 p-3 bg-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 rounded-xl">
            <div className="text-yellow-800">
              <div className="flex items-center mb-3">
                <Clock className="w-5 h-5 mr-2" />
                <span className="font-medium">Already Logged In</span>
              </div>
              
              <div className="text-sm space-y-2 mb-4">
                <p>This email is already logged in from:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Session started: {new Date(duplicateLoginInfo.sessionStartTime).toLocaleString()}</li>
                  <li>Last active: {new Date(duplicateLoginInfo.lastActive).toLocaleString()}</li>
                  <li>Device: {duplicateLoginInfo.currentDevice}</li>
                  <li>Location: {duplicateLoginInfo.currentIP}</li>
                </ul>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleForceLogout}
                  disabled={isLoading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 
                             disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isLoading ? 'Logging out...' : 'Logout from other device'}
                </button>
                <button
                  onClick={() => setShowDuplicateDialog(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Type Selector */}
        <div className="mb-4">
          <div className="flex bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30">
            <button
              type="button"
              onClick={() => setLoginType('voter')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center ${
                loginType === 'voter'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-black hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <User className="w-4 h-4 mr-2" />
              Voter Login
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center ${
                loginType === 'admin'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-black hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Panel
            </button>
          </div>
        </div>

        {/* Email + Mobile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-black text-sm font-bold mb-2">
              {loginType === 'admin' ? 'Admin Login ID' : t('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" size={22} />
              <input
                type={loginType === 'admin' ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-3 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl 
                           text-sm text-black placeholder-gray-500 font-medium focus:outline-none focus:border-blue-500 
                           focus:ring-4 focus:ring-blue-200 transition-all duration-300 shadow-sm"
                placeholder={loginType === 'admin' ? 'admin or demo-admin' : t('emailPlaceholder')}
                required
              />
            </div>
          </div>

          {loginType === 'voter' && (
            <div>
              <label className="block text-black text-sm font-bold mb-2">Mobile Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={22} />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full pl-11 pr-3 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl 
                             text-sm text-black placeholder-gray-500 font-medium focus:outline-none focus:border-green-500 
                             focus:ring-4 focus:ring-green-200 transition-all duration-300 shadow-sm"
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
            </div>
          )}

          {loginType === 'admin' && (
            <div>
              <label className="block text-black text-sm font-medium mb-2">Admin Password</label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={20} />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-11 pr-3 py-2.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl 
                             text-sm text-black placeholder-gray-600 focus:outline-none focus:border-purple-400 
                             focus:ring-2 focus:ring-purple-400/20 transition-all duration-300"
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              loginType === 'admin'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
            } shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                {loginType === 'admin' ? 'Accessing...' : 'Logging in...'}
              </div>
            ) : (
              loginType === 'admin' ? 'Access Admin Panel' : 'Continue'
            )}
          </button>
        </form>

        {/* Admin Demo Mode */}
        {loginType === 'admin' && (
          <div className="mt-6">
            <button
              onClick={() => onLogin('demo-admin', '+1234567890', { skipOtp: true, isAdmin: true })}
              className="w-full py-3 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 
                         text-black rounded-xl font-medium
                         hover:bg-blue-500/30 transition-all duration-300
                         text-sm flex items-center justify-center"
            >
              🚀 <strong>Demo Admin Mode</strong> - Quick Access with Sample Data
            </button>
          </div>
        )}

        {/* Register Button for Voters */}
        {loginType === 'voter' && (
          <div className="mt-4">
            <button
              type="button"
              onClick={onRegisterClick}
              className="w-full py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 
                         text-green-700 rounded-xl font-medium
                         hover:from-green-100 hover:to-emerald-100 transition-all duration-300
                         text-sm flex items-center justify-center"
            >
              📝 Don't have an account? <strong className="ml-1">Register Now</strong>
            </button>
          </div>
        )}


      </div>

      {/* biometric removed */}
    </div>
  );
};
