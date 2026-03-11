import React, { useState, useEffect } from 'react';
import { Smartphone, Tablet, Monitor, Maximize2, Minimize2 } from 'lucide-react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = ''
}) => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getScreenIcon = () => {
    switch (screenSize) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className={`responsive-container ${className} ${screenSize}`}>
      {/* Screen Size Indicator */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center space-x-2 bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-200">
        {getScreenIcon()}
        <span className="text-xs font-medium text-gray-600 capitalize">
          {screenSize}
        </span>
        <button
          onClick={toggleFullscreen}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? 
            <Minimize2 className="w-3 h-3" /> : 
            <Maximize2 className="w-3 h-3" />
          }
        </button>
      </div>

      {/* Responsive Content */}
      <div className={`
        min-h-screen transition-all duration-300
        ${screenSize === 'mobile' ? 'px-4 py-2' : ''}
        ${screenSize === 'tablet' ? 'px-6 py-4' : ''}
        ${screenSize === 'desktop' ? 'px-8 py-6' : ''}
      `}>
        {children}
      </div>

      {/* Mobile Navigation Helper */}
      {screenSize === 'mobile' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
          <div className="text-center text-sm text-gray-600">
            Swipe or use navigation buttons to continue
          </div>
        </div>
      )}
    </div>
  );
};

interface MobileOptimizedVotingProps {
  parties: Array<{
    id: string;
    name: string;
    leader: string;
    color: string;
    logo?: string;
    description?: string;
  }>;
  onVote: (partyId: string, candidateName: string, partyName: string) => Promise<boolean>;
  disabled?: boolean;
}

export const MobileOptimizedVoting: React.FC<MobileOptimizedVotingProps> = ({
  parties,
  onVote,
  disabled = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedParty, setSelectedParty] = useState<string>('');
  const [isVoting, setIsVoting] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < parties.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleVote = async () => {
    if (!selectedParty || isVoting) return;

    setIsVoting(true);
    try {
      const selectedPartyData = parties.find(p => p.id === selectedParty);
      await onVote(
        selectedParty,
        selectedPartyData?.name ?? selectedParty,
        selectedPartyData?.description ?? selectedParty
      );
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const currentParty = parties[currentIndex];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="text-center py-6 px-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Candidate
        </h1>
        <div className="flex justify-center items-center space-x-2">
          {parties.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {currentIndex + 1} of {parties.length}
        </p>
      </div>

      {/* Party Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center transform transition-transform duration-300 hover:scale-105">
            {/* Party Logo/Avatar */}
            {currentParty.logo ? (
              <img
                src={currentParty.logo}
                alt={`${currentParty.name} logo`}
                className="w-24 h-24 mx-auto mb-6 rounded-full shadow-lg"
              />
            ) : (
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                style={{ backgroundColor: currentParty.color }}
              >
                {currentParty.name.charAt(0)}
              </div>
            )}

            {/* Party Info */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentParty.name}
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              {currentParty.leader}
            </p>
            
            {currentParty.description && (
              <p className="text-sm text-gray-700 mb-6 line-clamp-3">
                {currentParty.description}
              </p>
            )}

            {/* Selection Button */}
            <button
              onClick={() => setSelectedParty(
                selectedParty === currentParty.id ? '' : currentParty.id
              )}
              disabled={disabled}
              className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                selectedParty === currentParty.id
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {selectedParty === currentParty.id ? 'Selected ✓' : 'Select'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-600">
            Swipe to navigate
          </span>
          
          <button
            onClick={() => setCurrentIndex(prev => Math.min(parties.length - 1, prev + 1))}
            disabled={currentIndex === parties.length - 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        {/* Vote Button */}
        {selectedParty && (
          <button
            onClick={handleVote}
            disabled={isVoting || disabled}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {isVoting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Submitting Vote...
              </div>
            ) : (
              'Cast Your Vote'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// CSS for line clamping (add to your CSS file)
export const responsiveStyles = `
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Mobile-first responsive breakpoints */
.responsive-container.mobile {
  /* Mobile styles */
}

.responsive-container.tablet {
  /* Tablet styles */
}

.responsive-container.desktop {
  /* Desktop styles */
}

/* Touch-friendly button sizing for mobile */
@media (max-width: 640px) {
  button, .btn {
    min-height: 44px;
    min-width: 44px;
  }
  
  input, select, textarea {
    min-height: 44px;
  }
  
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}

/* High contrast mode */
.high-contrast {
  filter: contrast(150%);
}

.high-contrast button {
  border: 2px solid currentColor;
}

.high-contrast .bg-blue-600 {
  background-color: #000 !important;
  color: #fff !important;
}

.high-contrast .text-gray-600 {
  color: #000 !important;
}

/* Reduced motion */
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* Screen reader only content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: inherit;
  margin: inherit;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
`;