import React, { useState, useEffect, useRef } from 'react';
import { 
  Vote, 
  CheckCircle, 
  Volume2, 
  VolumeX, 
  Palette,
  Type,
  MousePointer,
  Keyboard,
  Accessibility
} from 'lucide-react';

interface AccessibilityControlsProps {
  onFontSizeChange: (size: number) => void;
  onContrastChange: (highContrast: boolean) => void;
  onSpeechToggle: (enabled: boolean) => void;
  onReducedMotionToggle: (enabled: boolean) => void;
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  onFontSizeChange,
  onContrastChange,
  onSpeechToggle,
  onReducedMotionToggle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
    onFontSizeChange(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const handleContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    onContrastChange(enabled);
    
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  };

  const handleSpeechToggle = (enabled: boolean) => {
    setSpeechEnabled(enabled);
    onSpeechToggle(enabled);
  };

  const handleReducedMotionToggle = (enabled: boolean) => {
    setReducedMotion(enabled);
    onReducedMotionToggle(enabled);
    
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors focus-ring"
        aria-label="Open accessibility controls"
        aria-expanded={isOpen}
      >
        <Accessibility className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="absolute top-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-6 animate-fade-in-down">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Accessibility className="w-5 h-5 mr-2" />
            Accessibility Controls
          </h3>

          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Type className="w-4 h-4 inline mr-2" />
                Font Size: {fontSize}px
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFontSizeChange(Math.max(12, fontSize - 2))}
                  className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 focus-ring"
                  aria-label="Decrease font size"
                >
                  A-
                </button>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                  className="flex-1 focus-ring"
                  aria-label="Font size slider"
                />
                <button
                  onClick={() => handleFontSizeChange(Math.min(24, fontSize + 2))}
                  className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 focus-ring"
                  aria-label="Increase font size"
                >
                  A+
                </button>
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Palette className="w-4 h-4 mr-2" />
                High Contrast
              </label>
              <button
                onClick={() => handleContrastChange(!highContrast)}
                className={`relative w-12 h-6 rounded-full transition-colors focus-ring ${
                  highContrast ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={highContrast}
                aria-label="Toggle high contrast mode"
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    highContrast ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Screen Reader Support */}
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                {speechEnabled ? <Volume2 className="w-4 h-4 mr-2" /> : <VolumeX className="w-4 h-4 mr-2" />}
                Screen Reader
              </label>
              <button
                onClick={() => handleSpeechToggle(!speechEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors focus-ring ${
                  speechEnabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={speechEnabled}
                aria-label="Toggle screen reader support"
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    speechEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <MousePointer className="w-4 h-4 mr-2" />
                Reduced Motion
              </label>
              <button
                onClick={() => handleReducedMotionToggle(!reducedMotion)}
                className={`relative w-12 h-6 rounded-full transition-colors focus-ring ${
                  reducedMotion ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                role="switch"
                aria-checked={reducedMotion}
                aria-label="Toggle reduced motion"
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    reducedMotion ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Keyboard Navigation Info */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Keyboard className="w-4 h-4 mr-2" />
                Keyboard Shortcuts
              </h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Tab - Navigate forward</div>
                <div>Shift + Tab - Navigate backward</div>
                <div>Enter/Space - Activate button</div>
                <div>Arrow keys - Navigate options</div>
                <div>Escape - Close dialogs</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface EnhancedVotingInterfaceProps {
  parties: Array<{
    id: string;
    name: string;
    leader: string;
    color: string;
    logo?: string;
    description?: string;
  }>;
  onVote: (partyId: string, candidateName: string, partyName: string) => Promise<boolean>;
  selectedParty?: string;
  disabled?: boolean;
  speechEnabled?: boolean;
}

export const EnhancedVotingInterface: React.FC<EnhancedVotingInterfaceProps> = ({
  parties,
  onVote,
  disabled = false,
  speechEnabled = false
}) => {
  const [currentParty, setCurrentParty] = useState<string>('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const partyRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    if (!speechEnabled) return;
    
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.8;
    utterance.volume = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled || showConfirmation) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = (prev + 1) % parties.length;
            partyRefs.current[next]?.focus();
            announceToScreenReader(`${parties[next].name}, ${parties[next].leader}`);
            return next;
          });
          break;
        
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev === 0 ? parties.length - 1 : prev - 1;
            partyRefs.current[next]?.focus();
            announceToScreenReader(`${parties[next].name}, ${parties[next].leader}`);
            return next;
          });
          break;
        
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (currentParty) {
            handleVoteConfirmation();
          } else {
            handlePartySelection(parties[focusedIndex].id);
          }
          break;
        
        case 'Escape':
          event.preventDefault();
          if (showConfirmation) {
            setShowConfirmation(false);
            announceToScreenReader('Vote confirmation cancelled');
          } else if (currentParty) {
            setCurrentParty('');
            announceToScreenReader('Selection cleared');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [parties, focusedIndex, currentParty, showConfirmation, disabled, speechEnabled]);

  const handlePartySelection = (partyId: string) => {
    if (disabled || isVoting) return;
    
    const party = parties.find(p => p.id === partyId);
    if (!party) return;

    setCurrentParty(partyId);
    announceToScreenReader(`Selected ${party.name} led by ${party.leader}. Press Enter to confirm your vote or Escape to change selection.`);
  };

  const handleVoteConfirmation = () => {
    if (!currentParty || disabled || isVoting) return;
    setShowConfirmation(true);
    
    const party = parties.find(p => p.id === currentParty);
    if (party) {
      announceToScreenReader(`Confirm your vote for ${party.name}. Press Enter to confirm or Escape to cancel.`);
    }
  };

  const handleVoteSubmit = async () => {
    if (!currentParty || isVoting) return;

    setIsVoting(true);
    announceToScreenReader('Submitting your vote...');
    
    try {
      const selectedPartyData = parties.find(p => p.id === currentParty);
      const success = await onVote(
        currentParty,
        selectedPartyData?.name ?? currentParty,
        selectedPartyData?.description ?? currentParty
      );
      if (success) {
        announceToScreenReader('Your vote has been successfully submitted and recorded on the blockchain.');
      } else {
        announceToScreenReader('There was an error submitting your vote. Please try again.');
      }
    } catch (_error) {
      announceToScreenReader('Vote submission failed. Please try again.');
    } finally {
      setIsVoting(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in-down">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Cast Your Vote
        </h1>
        <p className="text-gray-600">
          Select your preferred political party. Your vote will be securely recorded on the blockchain.
        </p>
        {speechEnabled && (
          <p className="text-sm text-blue-600 mt-2">
            Use arrow keys to navigate, Enter to select, and Escape to go back
          </p>
        )}
      </div>

      {/* Party Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 animate-stagger">
        {parties.map((party, index) => (
          <button
            key={party.id}
            ref={(el) => (partyRefs.current[index] = el)}
            onClick={() => handlePartySelection(party.id)}
            disabled={disabled || isVoting}
            className={`
              relative p-6 rounded-xl border-2 transition-all-smooth focus-ring
              ${currentParty === party.id 
                ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover-lift'
              }
              ${disabled || isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${focusedIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
            `}
            aria-pressed={currentParty === party.id}
            aria-label={`Vote for ${party.name} led by ${party.leader}`}
            aria-describedby={`party-${party.id}-description`}
          >
            {/* Party Logo */}
            {party.logo ? (
              <img 
                src={party.logo} 
                alt={`${party.name} logo`}
                className="w-16 h-16 mx-auto mb-4 rounded-full"
              />
            ) : (
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: party.color }}
                aria-hidden="true"
              >
                {party.name.charAt(0)}
              </div>
            )}

            {/* Party Info */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {party.name}
            </h3>
            <p className="text-gray-600 mb-4">
              Led by {party.leader}
            </p>
            
            {party.description && (
              <p 
                id={`party-${party.id}-description`}
                className="text-sm text-gray-700"
              >
                {party.description}
              </p>
            )}

            {/* Selection Indicator */}
            {currentParty === party.id && (
              <div className="absolute top-2 right-2 animate-scale-in-bounce">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Vote Button */}
      {currentParty && (
        <div className="text-center animate-fade-in-up">
          <button
            onClick={handleVoteConfirmation}
            disabled={disabled || isVoting}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all-smooth hover-lift focus-ring"
            aria-label={`Cast vote for ${parties.find(p => p.id === currentParty)?.name}`}
          >
            <Vote className="w-5 h-5 inline mr-2" />
            Cast Your Vote
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 animate-scale-in-bounce">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Confirm Your Vote
            </h2>
            
            {(() => {
              const party = parties.find(p => p.id === currentParty);
              return party ? (
                <div className="text-center mb-6">
                  <div 
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                    style={{ backgroundColor: party.color }}
                  >
                    {party.name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {party.name}
                  </h3>
                  <p className="text-gray-600">
                    Led by {party.leader}
                  </p>
                </div>
              ) : null;
            })()}

            <p className="text-gray-700 text-center mb-6">
              Are you sure you want to cast your vote for this party? 
              This action cannot be undone.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  announceToScreenReader('Vote confirmation cancelled');
                }}
                disabled={isVoting}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors focus-ring"
              >
                Cancel
              </button>
              <button
                onClick={handleVoteSubmit}
                disabled={isVoting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors focus-ring flex items-center justify-center"
              >
                {isVoting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Voting...
                  </>
                ) : (
                  'Confirm Vote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip links for screen readers */}
      <div className="sr-only">
        <a href="#main-content" className="focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 rounded">
          Skip to main content
        </a>
      </div>
    </div>
  );
};