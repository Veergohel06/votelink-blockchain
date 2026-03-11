import React, { useState, useEffect, useRef } from 'react';
import { Wallet, X } from 'lucide-react';
import { Party } from '../../types';

export interface VoteMintData {
  tokenId: string;
  transactionHash: string;
  blockNumber: number;
  walletAddress: string;
  candidateName: string;
  partyName: string;
  timestamp: number;
  electionName: string;
}

interface Props {
  party: Party;
  electionName?: string;
  onVote: () => Promise<boolean>;
  onCancel: () => void;
  onSuccess: (data: VoteMintData) => void;
}

const generateHex = (len: number): string =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const WEB3_STYLES = `
  @keyframes w3-node-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.25); opacity: 0.7; }
  }
  @keyframes w3-orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes w3-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes w3-chain-flow {
    0% { stroke-dashoffset: 64; }
    100% { stroke-dashoffset: 0; }
  }
  @keyframes w3-wallet-pulse {
    0%, 100% { box-shadow: 0 0 14px rgba(255,153,51,0.4), 0 4px 20px rgba(0,0,0,0.12); }
    50% { box-shadow: 0 0 28px rgba(255,153,51,0.65), 0 4px 24px rgba(0,0,0,0.15); }
  }
  @keyframes w3-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes w3-dot-float {
    0%, 100% { transform: translateY(0); opacity: 0.35; }
    50% { transform: translateY(-6px); opacity: 0.55; }
  }
  .w3-wallet-icon { animation: w3-wallet-pulse 2.2s ease-in-out infinite; }
  .w3-orbit-ring { animation: w3-orbit 5s linear infinite; }
  .w3-spinner { animation: w3-spin 1s linear infinite; }
  .w3-node-1 { animation: w3-node-pulse 1.6s ease-in-out 0s infinite; }
  .w3-node-2 { animation: w3-node-pulse 1.6s ease-in-out 0.4s infinite; }
  .w3-node-3 { animation: w3-node-pulse 1.6s ease-in-out 0.8s infinite; }
  .w3-node-4 { animation: w3-node-pulse 1.6s ease-in-out 1.2s infinite; }
  .w3-fade-up { animation: w3-fade-up 0.5s ease-out forwards; }
  .w3-dot { animation: w3-dot-float var(--dur, 3s) ease-in-out var(--delay, 0s) infinite; }
`;

const MINT_STAGES = [
  'Wallet Confirmed',
  'Vote Token Minting',
  'Blockchain Confirmation',
  'Vote Successfully Recorded',
];

export const Web3VotingModal: React.FC<Props> = ({
  party,
  electionName = 'General Election 2026',
  onVote,
  onCancel,
  onSuccess,
}) => {
  const [step, setStep] = useState<'wallet' | 'minting'>('wallet');
  const [mintStage, setMintStage] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [walletDots, setWalletDots] = useState('');

  const txData = useRef({
    tokenId: `VL-${Date.now().toString(36).toUpperCase()}`,
    transactionHash: `0x${generateHex(64)}`,
    blockNumber: Math.floor(Math.random() * 900000) + 18500000,
    walletAddress: `0x${generateHex(40)}`,
  });

  // Animated loading dots
  useEffect(() => {
    const id = setInterval(() => {
      setWalletDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 420);
    return () => clearInterval(id);
  }, []);

  // Main flow
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Step 1: wallet connection sim
      await new Promise<void>(res => setTimeout(res, 2800));
      if (cancelled) return;
      setStep('minting');

      const stages: { delay: number; pct: number }[] = [
        { delay: 700, pct: 25 },
        { delay: 950, pct: 50 },
        { delay: 1200, pct: 75 },
        { delay: 950, pct: 100 },
      ];

      for (let i = 0; i < stages.length; i++) {
        await new Promise<void>(res => setTimeout(res, stages[i].delay));
        if (cancelled) return;
        setMintStage(i + 1);
        setProgressPct(stages[i].pct);
        if (i === 2) {
          try { await onVote(); } catch { /* animation continues regardless */ }
        }
      }

      if (!cancelled) {
        await new Promise<void>(res => setTimeout(res, 700));
        onSuccess({
          ...txData.current,
          candidateName: party.name,
          partyName: party.description || party.name,
          timestamp: Date.now(),
          electionName,
        });
      }
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Seeded random-ish particle positions — deterministic so no hydration mismatch */
  const DOTS = [
    { x: 8, y: 12, dur: 3.1, delay: 0 }, { x: 22, y: 78, dur: 2.8, delay: 0.6 },
    { x: 45, y: 25, dur: 3.4, delay: 1.1 }, { x: 61, y: 88, dur: 2.6, delay: 0.3 },
    { x: 75, y: 14, dur: 3.8, delay: 1.5 }, { x: 88, y: 62, dur: 2.9, delay: 0.8 },
    { x: 33, y: 52, dur: 3.2, delay: 1.8 }, { x: 55, y: 70, dur: 3.6, delay: 0.2 },
    { x: 15, y: 45, dur: 2.7, delay: 1.3 }, { x: 92, y: 38, dur: 3.5, delay: 0.9 },
    { x: 70, y: 94, dur: 3.0, delay: 0.5 }, { x: 5,  y: 85, dur: 3.3, delay: 1.6 },
  ];

  return (
    <>
      <style>{WEB3_STYLES}</style>

      {/* ── Full-screen background matching login page ── */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Tricolor gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #FF9933 0%, #fffdf5 45%, #ffffff 55%, #138808 100%)' }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Floating dot particles */}
        {DOTS.map((d, i) => (
          <div
            key={i}
            className="w3-dot absolute w-2 h-2 rounded-full bg-blue-900"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              '--dur': `${d.dur}s`,
              '--delay': `${d.delay}s`,
            } as React.CSSProperties}
          />
        ))}

        {/* Ambient blobs */}
        <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-orange-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-3/4 right-1/4 w-48 h-48 bg-green-900/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Centered modal */}
        <div className="min-h-screen flex items-center justify-center p-4">

          {step === 'wallet' ? (
            /* ── STEP 1: Wallet Connection ── */
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/30 text-center relative">
              <button
                onClick={onCancel}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
                aria-label="Cancel"
              >
                <X size={20} />
              </button>

              {/* Step badge */}
              <div
                className="inline-block text-xs font-semibold tracking-widest px-4 py-1.5 rounded-full mb-6"
                style={{
                  background: 'rgba(255,153,51,0.15)',
                  color: '#b45309',
                  border: '1px solid rgba(255,153,51,0.35)',
                }}
              >
                STEP 1 OF 3 — WALLET CONNECTION
              </div>

              {/* Wallet icon with orbit ring */}
              <div className="relative w-24 h-24 mx-auto mb-7">
                <div
                  className="w3-wallet-icon w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FF9933, #e07b00)' }}
                >
                  <Wallet size={40} className="text-white" />
                </div>
                <div
                  className="w3-orbit-ring absolute rounded-full border-2 border-dashed"
                  style={{
                    inset: '-6px',
                    borderColor: 'rgba(255,153,51,0.45)',
                  }}
                />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Casting Your Vote{walletDots}
              </h2>

              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full w3-node-1" style={{ background: '#FF9933' }} />
                <p className="text-gray-700 text-sm font-semibold">Connecting to Wallet</p>
              </div>

              {/* Spinner — orange track */}
              <div className="flex justify-center mb-6">
                <div
                  className="w3-spinner w-10 h-10 rounded-full border-[3px]"
                  style={{ borderColor: 'rgba(255,153,51,0.2)', borderTopColor: '#FF9933' }}
                />
              </div>

              <p className="text-gray-600 text-sm mb-1">Confirm transaction in your wallet.</p>

              <div
                className="rounded-xl p-4 mt-5 text-left"
                style={{
                  background: 'rgba(255,153,51,0.08)',
                  border: '1px solid rgba(255,153,51,0.25)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(255,153,51,0.2)' }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ background: '#FF9933' }} />
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Your vote will be securely recorded on the blockchain.
                    Please confirm the transaction in your wallet.
                  </p>
                </div>
              </div>
            </div>

          ) : (
            /* ── STEP 2: Blockchain Minting ── */
            <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/30">
              <div className="text-center mb-1">
                <span
                  className="inline-block text-xs font-semibold tracking-widest px-4 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(19,136,8,0.12)',
                    color: '#166534',
                    border: '1px solid rgba(19,136,8,0.3)',
                  }}
                >
                  STEP 2 OF 3 — BLOCKCHAIN MINTING
                </span>
              </div>

              {/* Dynamic heading */}
              <div className="text-center mb-6 mt-4">
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  {mintStage < 2
                    ? 'Minting your Vote Token…'
                    : mintStage < 3
                    ? 'Writing vote to blockchain…'
                    : mintStage < 4
                    ? 'Waiting for network confirmation…'
                    : 'Vote Successfully Recorded ✓'}
                </h2>
                <p className="text-sm font-mono" style={{ color: '#b45309' }}>
                  Token ID: #{txData.current.tokenId}
                </p>
              </div>

              {/* Blockchain nodes SVG — warm palette */}
              <div className="relative w-full mb-6" style={{ height: 90 }}>
                <svg viewBox="0 0 420 80" className="w-full h-full">
                  {/* Chain links */}
                  {([[70, 145], [183, 237], [273, 348]] as [number, number][]).map(([x1, x2], i) => (
                    <line
                      key={i}
                      x1={x1} y1="40" x2={x2} y2="40"
                      stroke="rgba(255,153,51,0.4)"
                      strokeWidth="2"
                      strokeDasharray="10 5"
                      style={{ animation: `w3-chain-flow 2s ${i * 0.5}s linear infinite` }}
                    />
                  ))}

                  {/* Nodes */}
                  {([50, 165, 255, 370] as number[]).map((cx, i) => (
                    <g key={cx} className={`w3-node-${i + 1}`}>
                      <circle
                        cx={cx} cy="40" r="22"
                        fill="rgba(255,255,255,0.55)"
                        stroke={mintStage > i ? 'rgba(255,153,51,0.9)' : 'rgba(255,153,51,0.35)'}
                        strokeWidth="2"
                      />
                      <circle
                        cx={cx} cy="40" r="13"
                        fill={mintStage > i ? 'rgba(255,153,51,0.25)' : 'rgba(255,153,51,0.08)'}
                        style={{ transition: 'all 0.5s ease' }}
                      />
                      <circle
                        cx={cx} cy="40"
                        r={mintStage > i ? '7' : '4'}
                        fill={mintStage > i ? '#FF9933' : 'rgba(255,153,51,0.3)'}
                        style={{ transition: 'all 0.5s ease' }}
                      />
                      {mintStage > i && (
                        <text x={cx} y="44" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">✓</text>
                      )}
                    </g>
                  ))}

                  {/* Travelling data packet */}
                  <circle r="5" fill="#138808" opacity="0.8">
                    <animateMotion dur="2.2s" repeatCount="indefinite" path="M 28,40 L 392,40" />
                  </circle>
                </svg>
              </div>

              {/* Progress bar — orange → green */}
              <div className="mb-7">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span className="font-mono">Minting Progress</span>
                  <span className="font-mono font-bold" style={{ color: '#b45309' }}>{progressPct}%</span>
                </div>
                <div
                  className="w-full h-2.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progressPct}%`,
                      background: 'linear-gradient(90deg, #FF9933, #e8a020, #138808)',
                      boxShadow: '0 0 8px rgba(255,153,51,0.5)',
                    }}
                  />
                </div>
              </div>

              {/* Stage checklist */}
              <div className="space-y-3">
                {MINT_STAGES.map((label, i) => {
                  const done = mintStage > i;
                  const active = mintStage === i;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 transition-all duration-500"
                      style={{ opacity: done ? 1 : active ? 0.8 : 0.35 }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500"
                        style={{
                          background: done
                            ? 'linear-gradient(135deg, #138808, #16a34a)'
                            : active
                            ? 'rgba(255,153,51,0.2)'
                            : 'rgba(0,0,0,0.06)',
                          border: done ? 'none' : active ? '1px solid rgba(255,153,51,0.5)' : '1px solid rgba(0,0,0,0.12)',
                          boxShadow: done ? '0 0 8px rgba(19,136,8,0.4)' : 'none',
                        }}
                      >
                        {done ? (
                          <span className="text-white text-xs font-bold">✓</span>
                        ) : active ? (
                          <div className="w-2 h-2 rounded-full w3-node-1" style={{ background: '#FF9933' }} />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: done ? '#15803d' : active ? '#92400e' : '#9ca3af',
                        }}
                      >
                        {label}
                        {done && i === 0 && (
                          <span className="ml-2 text-xs" style={{ color: '#15803d' }}>✔</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
