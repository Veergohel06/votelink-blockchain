import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useAuth } from './hooks/useAuth';
import { LandingPage } from './components/LandingPage';
import { LoginForm } from './components/auth/LoginForm';
import { OTPVerification } from './components/auth/OTPVerification';
import { VoterIDUpload } from './components/auth/VoterIDUpload';
import { RegionSelection } from './components/voting/RegionSelection';
import { VotingInterface } from './components/voting/VotingInterface';
import { DisabilityCertificateUpload } from './components/auth/DisabilityCertificateUpload';
import { AnimatedBackground } from './components/ui/AnimatedBackground';
import AdminDashboard from './components/admin/AdminDashboard';
import { ElectionHostingInterface } from './components/admin/ElectionHostingInterface';
import { FaceCaptureComponent } from './components/auth/FaceCaptureComponent';
import { RegistrationForm } from './components/auth/RegistrationForm';

function App() {
  console.log('🚀 App component rendering');

  // Initialize StatusBar for mobile
  useEffect(() => {
    const setupStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: 'rgba(255, 255, 255, 0.1)' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        // StatusBar API not available (web browser)
        console.log('StatusBar API not available');
      }
    };
    setupStatusBar();
  }, []);

  const {
    user,
    authStep,
    isLoading,
    mockLogin,
    verifyOTP,
    verifyVoterID,
    uploadDisabilityCertificate,
    startDisabledVoting,
    logout,
    selectRegion,
    castVote,
    setAuthStep,
    handleFaceCapture,
    loginError,
    setLoginError,
    faceImage
  } = useAuth();

  const [showLanding, setShowLanding] = useState(true);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check server connection on app start
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const apiUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api';
        console.log('🔍 Checking server connection at:', apiUrl);

        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          setServerStatus('online');
          console.log('✅ Server is online');
        } else {
          setServerStatus('offline');
          console.error('❌ Server returned error:', response.status);
        }
      } catch (error) {
        setServerStatus('offline');
        console.error('❌ Server connection failed:', error);
        console.error('API URL:', import.meta.env.VITE_AUTH_API_URL);
      }
    };

    checkServerConnection();
  }, []);

  console.log('📊 App state:', { user, authStep, showLanding, isLoading, serverStatus });

  const handleVote = async (partyId: string, candidateName: string = partyId, partyName: string = partyId) => {
    return await castVote(partyId, candidateName, partyName);
  };

  const handleStartVoting = () => {
    setShowLanding(false);
  };

  const handleLogout = () => {
    logout();
    setShowLanding(true);
  };

  // Show landing page if not started or no user
  // Skip landing page for admin users
  if (showLanding && !user) {
    return <LandingPage onStartVoting={handleStartVoting} />;
  }

  // Admin users should skip the landing page and go directly to dashboard
  if (showLanding && user?.role === 'admin') {
    setShowLanding(false);
  }

  const renderAuthStep = () => {
    switch (authStep) {
      case 'login':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <LoginForm
                onLogin={mockLogin}
                loginError={loginError}
                onClearError={() => setLoginError(null)}
                onRegisterClick={() => setAuthStep('registration')}
              />
            </div>
          </div>
        );

      case 'registration':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <RegistrationForm
                onRegistrationSuccess={() => setAuthStep('login')}
                onBackToLogin={() => setAuthStep('login')}
              />
            </div>
          </div>
        );

      case 'otp':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <OTPVerification
                onVerify={verifyOTP}
                onBack={() => handleLogout()}
                isLoading={isLoading}
                userEmail={user?.email || ''}
                userMobile={user?.mobile || ''}
              />
            </div>
          </div>
        );

      case 'face-capture':
        return (
          <div className="min-h-screen flex flex-col">
            <AnimatedBackground />
            <div className="flex-1 relative z-10">
              <FaceCaptureComponent
                onFaceCaptured={handleFaceCapture}
                onCancel={() => setAuthStep('otp')}
                title="Capture Your Face"
                instructions="We need to capture your face for identity verification"
              />
            </div>
          </div>
        );

      case 'voter-id':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <VoterIDUpload
                onVerification={async (result) => {
                  const success = await verifyVoterID({
                    voterID: result.voterID,
                    mobile: result.mobile || '',
                    uid: result.uid
                  });
                  // After voter ID verification, proceed directly to instructions
                  return success;
                }}
                isLoading={isLoading}
                userEmail={user?.email}
                onBack={() => setAuthStep('face-capture')}
                capturedFaceImage={faceImage || undefined}
              />
            </div>
          </div>
        );

      case 'disability-cert':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <DisabilityCertificateUpload
                onUpload={uploadDisabilityCertificate}
                onBack={() => setAuthStep('voter-id')}
                isLoading={isLoading}
              />
            </div>
          </div>
        );

      case 'region-selection':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <RegionSelection
                userEmail={user?.email || ''}
                voterID={user?.voterID}
                votedElections={user?.votedElections || []}
                onRegionSelect={selectRegion}
                onBack={() => setAuthStep('voter-id')}
                onLogout={handleLogout}
                isLoading={isLoading}
              />
            </div>
          </div>
        );

      case 'voting':
      case 'complete': {
        // Get candidates from the selected election, not from mock data
        const selectedElection = user?.selectedRegion?.activeElections?.[0];
        const candidates = selectedElection?.candidates || [];

        // Check if user has voted in THIS specific election (per-election check)
        const hasVotedInCurrentElection = selectedElection?.id
          ? user?.votedElections?.some(v => v.electionId === selectedElection.id) || false
          : false;

        // Convert election candidates to Party format for VotingInterface
        interface CandidateData {
          id: string;
          name: string;
          image?: string;
          photo?: string;
          description?: string;
          party?: { name: string } | string;
          color?: string;
        }

        const partiesFromElection = (candidates as CandidateData[]).map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          logo: candidate.image || candidate.photo || '',
          description: typeof candidate.party === 'string' ? candidate.party : candidate.party?.name || candidate.description || '',
          color: candidate.color || 'bg-gray-500'
        }));

        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <VotingInterface
                parties={partiesFromElection}
                onVote={handleVote}
                onLogout={handleLogout}
                onStartDisabledVoting={startDisabledVoting}
                userEmail={user?.email || ''}
                hasVoted={hasVotedInCurrentElection}
                isLoading={isLoading}
                showVoteButton={true}
                user={user}
                selectedRegion={user?.selectedRegion}
                onBack={() => setAuthStep('region-selection')}
                electionStartDate={selectedElection?.startDate}
                electionEndDate={selectedElection?.endDate}
              />
            </div>
          </div>
        );
      }

      case 'admin-hosting':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <ElectionHostingInterface
                userEmail={user?.email || ''}
                onCreateElection={() => setAuthStep('admin-dashboard')}
                onManageElections={() => setAuthStep('admin-dashboard')}
                onLogout={handleLogout}
              />
            </div>
          </div>
        );

      case 'admin-dashboard':
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <AdminDashboard onLogout={handleLogout} />
            </div>
          </div>
        );

      default:
        return (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <LoginForm onLogin={mockLogin} />
            </div>
          </div>
        );
    }
  };

  return (
    <BrowserRouter>
      <div className="relative">
        <AnimatedBackground />
        <Routes>
          <Route path="*" element={renderAuthStep()} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;