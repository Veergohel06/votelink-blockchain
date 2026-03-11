import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ExternalLink,
  Download,
  QrCode,
  Clock,
  Shield,
  Wallet,
  RefreshCw,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface VoteRecord {
  id: string;
  electionName: string;
  candidateName: string;
  tokenId: string;
  status: 'Recorded' | 'Verified';
  timestamp: number;
  transactionHash: string;
  blockNumber: number;
  walletAddress: string;
}

interface Props {
  onClose?: () => void;
}

const DASHBOARD_STYLES = `
  @keyframes mv-float-up {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes mv-dot-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes mv-bg-dot {
    0%, 100% { transform: translateY(0); opacity: 0.35; }
    50% { transform: translateY(-6px); opacity: 0.55; }
  }
  .mv-float { animation: mv-float-up 0.45s ease-out both; }
  .mv-dot { animation: mv-dot-blink 1.4s ease-in-out infinite; }
  .mv-bg-dot { animation: mv-bg-dot var(--dur,3s) ease-in-out var(--delay,0s) infinite; }
  .mv-btn { transition: all 0.22s ease; }
  .mv-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 3px 14px rgba(0,0,0,0.12); }
`;

export const MyVotesDashboard: React.FC<Props> = ({ onClose }) => {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

  const loadVotes = () => {
    try {
      const stored: VoteRecord[] = JSON.parse(
        localStorage.getItem('votelink_votes') || '[]'
      );
      setVotes(stored);
    } catch {
      setVotes([]);
    }
  };

  useEffect(() => {
    loadVotes();
  }, []);

  const handleViewTransaction = (txHash: string) => {
    window.open(
      `https://etherscan.io/tx/${txHash}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleDownloadReceipt = async (vote: VoteRecord) => {
    setGeneratingPDF(vote.id);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();

      // Background
      doc.setFillColor(8, 8, 26);
      doc.rect(0, 0, W, 297, 'F');

      // Header band
      doc.setFillColor(49, 46, 129);
      doc.rect(0, 0, W, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('VOTELINK — VOTE RECEIPT', W / 2, 18, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Blockchain Vote Certificate', W / 2, 28, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 36, { align: 'center' });

      // Token badge
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(W / 2 - 45, 50, 90, 14, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Vote Token ID: #${vote.tokenId}`, W / 2, 59, { align: 'center' });

      // Details
      const rows: [string, string][] = [
        ['Election', vote.electionName],
        ['Candidate Voted', vote.candidateName],
        ['Transaction Hash', vote.transactionHash],
        ['Block Number', `#${vote.blockNumber.toLocaleString()}`],
        ['Wallet Address', vote.walletAddress],
        ['Vote Date', new Date(vote.timestamp).toLocaleString()],
        ['Status', vote.status],
      ];

      let y = 78;
      for (const [label, value] of rows) {
        doc.setTextColor(139, 92, 246);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${label}:`, 18, y);
        doc.setTextColor(200, 200, 220);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, W - 82);
        doc.text(lines, 70, y);
        y += 10 * lines.length + 3;
      }

      // Divider
      doc.setDrawColor(99, 102, 241);
      doc.line(18, y + 4, W - 18, y + 4);
      y += 12;

      // Security note
      doc.setFillColor(18, 16, 38);
      doc.roundedRect(15, y, W - 30, 34, 3, 3, 'F');
      doc.setDrawColor(99, 102, 241);
      doc.roundedRect(15, y, W - 30, 34, 3, 3, 'S');
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SECURITY NOTE', 20, y + 8);
      doc.setTextColor(165, 165, 195);
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(
        'This vote is securely recorded on the blockchain and linked to your wallet address. ' +
          'Once minted, the vote cannot be altered or deleted, ensuring transparency and election integrity.',
        W - 42
      );
      doc.text(noteLines, 20, y + 15);

      doc.save(`VoteLink-Receipt-${vote.tokenId}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGeneratingPDF(null);
    }
  };

  const handleVerifyVote = async (vote: VoteRecord) => {
    setGeneratingQR(vote.id);
    try {
      const payload = JSON.stringify({
        platform: 'VoteLink',
        tokenId: vote.tokenId,
        txHash: vote.transactionHash,
        blockNumber: vote.blockNumber,
        election: vote.electionName,
        candidate: vote.candidateName,
        status: vote.status,
        timestamp: vote.timestamp,
      });
      const url = await QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        color: { dark: '#138808', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(url);
      setShowQR(vote.tokenId);
    } catch (err) {
      console.error('QR generation failed:', err);
    } finally {
      setGeneratingQR(null);
    }
  };

  return (
    <>
      <style>{DASHBOARD_STYLES}</style>

      {/* Full-screen page — matches login page */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Tricolor gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #FF9933 0%, #fffdf5 45%, #ffffff 55%, #138808 100%)' }}
        />
        {/* Grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
        {/* Dots */}
        {[
          { x: 5, y: 8, dur: 3.1, delay: 0 }, { x: 20, y: 82, dur: 2.8, delay: 0.6 },
          { x: 46, y: 20, dur: 3.4, delay: 1.1 }, { x: 63, y: 91, dur: 2.6, delay: 0.3 },
          { x: 78, y: 12, dur: 3.8, delay: 1.5 }, { x: 90, y: 65, dur: 2.9, delay: 0.8 },
          { x: 32, y: 50, dur: 3.2, delay: 1.8 }, { x: 55, y: 72, dur: 3.6, delay: 0.2 },
          { x: 14, y: 44, dur: 2.7, delay: 1.3 }, { x: 93, y: 36, dur: 3.5, delay: 0.9 },
        ].map((d, i) => (
          <div
            key={i}
            className="mv-bg-dot absolute w-2 h-2 rounded-full bg-blue-900"
            style={{ left: `${d.x}%`, top: `${d.y}%`, '--dur': `${d.dur}s`, '--delay': `${d.delay}s` } as React.CSSProperties}
          />
        ))}
        {/* Blobs */}
        <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-orange-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-3/4 right-1/4 w-48 h-48 bg-green-900/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative min-h-screen p-6">
          <div className="max-w-3xl mx-auto">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-8 mv-float" style={{ animationDelay: '0s' }}>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #FF9933, #e07b00)' }}
                  >
                    <Wallet size={18} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">My Votes</h1>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{
                      background: 'rgba(255,153,51,0.15)',
                      color: '#92400e',
                      border: '1px solid rgba(255,153,51,0.35)',
                    }}
                  >
                    {votes.length} record{votes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-gray-500 text-sm ml-12">Your blockchain vote history — immutable &amp; transparent</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadVotes}
                  className="mv-btn p-2 rounded-lg text-gray-500 hover:text-gray-800"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' }}
                  aria-label="Refresh"
                >
                  <RefreshCw size={16} />
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="mv-btn px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900"
                    style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(8px)' }}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Column headers */}
            {votes.length > 0 && (
              <div
                className="grid grid-cols-4 gap-2 px-5 py-2 rounded-lg mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.3)', backdropFilter: 'blur(8px)' }}
              >
                <span>Election</span>
                <span>Candidate</span>
                <span>Token ID</span>
                <span>Status</span>
              </div>
            )}

            {/* ── Empty state ── */}
            {votes.length === 0 ? (
              <div
                className="bg-white/20 backdrop-blur-xl rounded-3xl border border-white/30 p-14 text-center mv-float"
                style={{ animationDelay: '0.1s' }}
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(255,153,51,0.12)' }}
                >
                  <Shield size={28} style={{ color: '#FF9933' }} />
                </div>
                <p className="text-gray-700 font-medium mb-1">No votes recorded yet</p>
                <p className="text-gray-500 text-sm">
                  Your vote history will appear here after casting your first vote.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {votes.map((vote, index) => (
                  <div
                    key={vote.id}
                    className="mv-float bg-white/20 backdrop-blur-xl rounded-2xl shadow-md p-5 border border-white/30"
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    {/* Top row summary */}
                    <div className="grid grid-cols-4 gap-2 mb-4 items-start">
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Election Name</p>
                        <p className="text-gray-800 text-sm font-semibold leading-tight">{vote.electionName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Candidate Voted</p>
                        <p className="text-gray-700 text-sm">{vote.candidateName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Vote Token ID</p>
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(255,153,51,0.15)',
                            color: '#92400e',
                            border: '1px solid rgba(255,153,51,0.35)',
                          }}
                        >
                          #{vote.tokenId}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-0.5">Vote Status</p>
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              vote.status === 'Verified'
                                ? 'rgba(19,136,8,0.12)'
                                : 'rgba(255,153,51,0.12)',
                            color: vote.status === 'Verified' ? '#15803d' : '#92400e',
                            border: `1px solid ${
                              vote.status === 'Verified'
                                ? 'rgba(19,136,8,0.3)'
                                : 'rgba(255,153,51,0.3)'
                            }`,
                          }}
                        >
                          <CheckCircle size={10} />
                          {vote.status}
                        </span>
                      </div>
                    </div>

                    {/* Extended details */}
                    <div
                      className="rounded-xl px-4 py-3 mb-4 text-xs font-mono"
                      style={{ background: 'rgba(255,255,255,0.3)', border: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-gray-400">TX:</span>
                        <span className="text-gray-600 truncate">
                          {vote.transactionHash.slice(0, 22)}…{vote.transactionHash.slice(-10)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Block:</span>
                          <span style={{ color: '#b45309' }}>#{vote.blockNumber.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 ml-auto">
                          <Clock size={11} />
                          <span>{new Date(vote.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewTransaction(vote.transactionHash)}
                        className="mv-btn flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
                        style={{
                          background: 'rgba(255,255,255,0.6)',
                          color: '#1e40af',
                          border: '1px solid rgba(59,130,246,0.3)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <ExternalLink size={12} />
                        View Transaction
                      </button>

                      <button
                        onClick={() => handleDownloadReceipt(vote)}
                        disabled={generatingPDF === vote.id}
                        className="mv-btn flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #138808, #16a34a)',
                          color: 'white',
                          border: '1px solid rgba(19,136,8,0.35)',
                        }}
                      >
                        <Download size={12} />
                        {generatingPDF === vote.id ? 'Generating…' : 'Download Receipt'}
                      </button>

                      <button
                        onClick={() => handleVerifyVote(vote)}
                        disabled={generatingQR === vote.id}
                        className="mv-btn flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #FF9933, #e07b00)',
                          color: 'white',
                          border: '1px solid rgba(255,153,51,0.4)',
                        }}
                      >
                        <QrCode size={12} />
                        {generatingQR === vote.id ? 'Generating…' : 'Verify Vote'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Security note ── */}
            <div
              className="mt-8 bg-white/20 backdrop-blur-xl rounded-2xl p-4 border border-white/30 mv-float"
              style={{ animationDelay: '0.3s' }}
            >
              <div className="flex items-start gap-3">
                <Shield size={17} className="flex-shrink-0 mt-0.5" style={{ color: '#FF9933' }} />
                <p className="text-gray-500 text-xs leading-relaxed">
                  All vote records are stored with cryptographic proof on the blockchain. Each
                  Vote Token ID is unique and immutable — your participation in the democratic
                  process is permanently preserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Modal ── */}
      {showQR && qrDataUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowQR(null)}
        >
          <div
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-7 text-center relative border border-white/50"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <QrCode size={28} className="mx-auto mb-3" style={{ color: '#138808' }} />
            <h3 className="text-gray-800 font-bold text-lg mb-1">Vote Verification QR</h3>
            <p className="text-gray-500 text-sm mb-5">Scan to verify vote on blockchain</p>
            <img
              src={qrDataUrl}
              alt="Vote verification QR code"
              className="mx-auto rounded-xl"
              style={{ width: 220, height: 220 }}
            />
            <p className="text-sm font-mono mt-4" style={{ color: '#b45309' }}>
              Token #{showQR}
            </p>
            <button
              onClick={() => setShowQR(null)}
              className="mt-5 px-7 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #FF9933, #e07b00)',
                color: 'white',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
