import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  ExternalLink,
  Download,
  QrCode,
  LayoutDashboard,
  Shield,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { VoteMintData } from './Web3VotingModal';

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
  data: VoteMintData;
  onDashboard: () => void;
}

const SUCCESS_STYLES = `
  @keyframes s3-check-in {
    0% { transform: scale(0) rotate(-180deg); opacity: 0; }
    65% { transform: scale(1.15) rotate(8deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes s3-icon-pulse {
    0%, 100% { box-shadow: 0 0 16px rgba(19,136,8,0.45), 0 4px 20px rgba(0,0,0,0.12); }
    50% { box-shadow: 0 0 32px rgba(19,136,8,0.7), 0 4px 24px rgba(0,0,0,0.15); }
  }
  @keyframes s3-float-up {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes s3-dot-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes s3-dot-float {
    0%, 100% { transform: translateY(0); opacity: 0.35; }
    50% { transform: translateY(-6px); opacity: 0.55; }
  }
  .s3-check-anim { animation: s3-check-in 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  .s3-icon-pulse { animation: s3-icon-pulse 2.5s ease-in-out infinite; }
  .s3-f1 { animation: s3-float-up 0.5s ease-out 0.05s both; }
  .s3-f2 { animation: s3-float-up 0.5s ease-out 0.15s both; }
  .s3-f3 { animation: s3-float-up 0.5s ease-out 0.25s both; }
  .s3-f4 { animation: s3-float-up 0.5s ease-out 0.35s both; }
  .s3-dot { animation: s3-dot-blink 1.2s ease-in-out infinite; }
  .s3-bg-dot { animation: s3-dot-float var(--dur,3s) ease-in-out var(--delay,0s) infinite; }
  .s3-btn { transition: all 0.25s ease; }
  .s3-btn:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
`;

function saveVoteToHistory(data: VoteMintData): void {
  try {
    const existing: VoteRecord[] = JSON.parse(
      localStorage.getItem('votelink_votes') || '[]'
    );
    const record: VoteRecord = {
      id: data.tokenId,
      electionName: data.electionName,
      candidateName: data.candidateName,
      tokenId: data.tokenId,
      status: 'Recorded',
      timestamp: data.timestamp,
      transactionHash: data.transactionHash,
      blockNumber: data.blockNumber,
      walletAddress: data.walletAddress,
    };
    const updated = [
      record,
      ...existing.filter(v => v.id !== data.tokenId),
    ];
    localStorage.setItem('votelink_votes', JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable — silently skip
  }
}

export const Web3VoteSuccess: React.FC<Props> = ({ data, onDashboard }) => {
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const shortTxHash = `${data.transactionHash.slice(0, 10)}...${data.transactionHash.slice(-8)}`;
  const maskedWallet = `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}`;

  useEffect(() => {
    saveVoteToHistory(data);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewEtherscan = () => {
    window.open(`https://etherscan.io/tx/${data.transactionHash}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenQR = async () => {
    setIsGeneratingQR(true);
    try {
      const payload = JSON.stringify({
        tokenId: data.tokenId,
        txHash: data.transactionHash,
        blockNumber: data.blockNumber,
        election: data.electionName,
        candidate: data.candidateName,
        timestamp: data.timestamp,
        platform: 'VoteLink',
      });
      const url = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: { dark: '#138808', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(url);
      setShowQR(true);
    } catch (err) {
      console.error('QR generation failed:', err);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
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
      doc.text('Blockchain Vote Minting Certificate', W / 2, 28, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 36, { align: 'center' });

      // Token badge
      doc.setFillColor(99, 102, 241);
      doc.roundedRect(W / 2 - 45, 50, 90, 14, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Vote Token ID: #${data.tokenId}`, W / 2, 59, { align: 'center' });

      // Details
      const rows: [string, string][] = [
        ['Election', data.electionName],
        ['Candidate Voted', data.candidateName],
        ['Transaction Hash', data.transactionHash],
        ['Block Number', `#${data.blockNumber.toLocaleString()}`],
        ['Wallet Address', data.walletAddress],
        ['Vote Timestamp', new Date(data.timestamp).toLocaleString()],
        ['Status', 'CONFIRMED ✓'],
      ];

      let y = 78;
      doc.setFontSize(10);
      for (const [label, value] of rows) {
        doc.setTextColor(139, 92, 246);
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 18, y);
        doc.setTextColor(200, 200, 220);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(value, W - 82);
        doc.text(lines, 70, y);
        y += 10 * lines.length + 3;
      }

      // Divider
      doc.setDrawColor(99, 102, 241, 0.3);
      doc.line(18, y + 4, W - 18, y + 4);
      y += 12;

      // Security note box
      doc.setFillColor(18, 16, 38);
      doc.roundedRect(15, y, W - 30, 34, 3, 3, 'F');
      doc.setDrawColor(99, 102, 241, 0.4);
      doc.roundedRect(15, y, W - 30, 34, 3, 3, 'S');
      doc.setTextColor(139, 92, 246);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SECURITY NOTE', 20, y + 8);
      doc.setTextColor(160, 160, 195);
      doc.setFont('helvetica', 'normal');
      const noteText =
        'This vote is securely recorded on the blockchain and linked to your wallet address. ' +
        'Once minted, the vote cannot be altered or deleted, ensuring transparency and election integrity.';
      const noteLines = doc.splitTextToSize(noteText, W - 42);
      doc.text(noteLines, 20, y + 15);

      doc.save(`VoteLink-Receipt-${data.tokenId}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const INFO_ROWS = [
    { label: 'Election', value: data.electionName },
    { label: 'Selected Candidate', value: data.candidateName },
    { label: 'Transaction Hash', value: shortTxHash },
    { label: 'Block Number', value: `#${data.blockNumber.toLocaleString()}` },
    { label: 'Wallet Address', value: maskedWallet },
  ];

  return (
    <>
      <style>{SUCCESS_STYLES}</style>

      {/* Full-screen — matches login page */}
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
          { x: 6, y: 10, dur: 3.2, delay: 0 }, { x: 24, y: 80, dur: 2.7, delay: 0.5 },
          { x: 48, y: 22, dur: 3.5, delay: 1.1 }, { x: 66, y: 90, dur: 2.9, delay: 0.3 },
          { x: 80, y: 16, dur: 3.8, delay: 1.6 }, { x: 91, y: 58, dur: 3.0, delay: 0.9 },
          { x: 37, y: 55, dur: 3.3, delay: 1.8 }, { x: 14, y: 42, dur: 2.8, delay: 1.3 },
        ].map((d, i) => (
          <div
            key={i}
            className="s3-bg-dot absolute w-2 h-2 rounded-full bg-blue-900"
            style={{ left: `${d.x}%`, top: `${d.y}%`, '--dur': `${d.dur}s`, '--delay': `${d.delay}s` } as React.CSSProperties}
          />
        ))}
        {/* Blobs */}
        <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-orange-900/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-3/4 right-1/4 w-48 h-48 bg-green-900/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="min-h-screen flex items-center justify-center p-4 py-10 relative">
          <div className="w-full max-w-lg">

            {/* ── Success icon ── */}
            <div className="text-center mb-7 s3-f1">
              <div
                className="s3-check-anim s3-icon-pulse w-24 h-24 rounded-full mx-auto flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #138808, #16a34a)' }}
              >
                <CheckCircle size={48} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mt-5">
                Vote Successfully Recorded
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full s3-dot" style={{ background: '#138808' }} />
                <p className="text-xs font-semibold tracking-widest" style={{ color: '#166534' }}>
                  BLOCKCHAIN CONFIRMED
                </p>
                <div className="w-2 h-2 rounded-full s3-dot" style={{ background: '#138808', animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* ── Confirmation card ── */}
            <div
              className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/30 mb-5 s3-f2"
            >
              {/* Token ID badge */}
              <div className="text-center mb-6">
                <span
                  className="inline-block px-5 py-2 rounded-full text-sm font-mono font-bold"
                  style={{
                    background: 'rgba(255,153,51,0.15)',
                    border: '1px solid rgba(255,153,51,0.4)',
                    color: '#92400e',
                  }}
                >
                  Vote Token ID: #{data.tokenId}
                </span>
              </div>

              {/* Info rows */}
              <div className="space-y-3">
                {INFO_ROWS.map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 pb-3"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    <span className="text-gray-500 text-sm flex-shrink-0">{label}</span>
                    <span className="text-gray-800 text-sm font-mono text-right break-all">{value}</span>
                  </div>
                ))}
              </div>

              {/* Verified badge */}
              <div
                className="mt-5 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(19,136,8,0.08)',
                  border: '1px solid rgba(19,136,8,0.25)',
                }}
              >
                <div className="w-2 h-2 rounded-full s3-dot" style={{ background: '#138808' }} />
                <span className="text-sm font-semibold" style={{ color: '#15803d' }}>
                  Vote Verified on Blockchain
                </span>
              </div>
            </div>

            {/* ── Action buttons ── */}
            <div className="grid grid-cols-2 gap-3 mb-5 s3-f3">
              <button
                onClick={handleViewEtherscan}
                className="s3-btn flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  color: '#1e40af',
                  border: '1px solid rgba(59,130,246,0.35)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <ExternalLink size={15} />
                View on Etherscan
              </button>

              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="s3-btn flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #138808, #16a34a)',
                  color: 'white',
                  border: '1px solid rgba(19,136,8,0.4)',
                }}
              >
                <Download size={15} />
                {isGeneratingPDF ? 'Generating…' : 'Download Receipt PDF'}
              </button>

              <button
                onClick={handleOpenQR}
                disabled={isGeneratingQR}
                className="s3-btn flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #FF9933, #e07b00)',
                  color: 'white',
                  border: '1px solid rgba(255,153,51,0.5)',
                }}
              >
                <QrCode size={15} />
                {isGeneratingQR ? 'Generating…' : 'Open Vote QR'}
              </button>

              <button
                onClick={onDashboard}
                className="s3-btn flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  color: '#374151',
                  border: '1px solid rgba(0,0,0,0.15)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <LayoutDashboard size={15} />
                Go to Dashboard
              </button>
            </div>

            {/* ── Security note ── */}
            <div
              className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 border border-white/30 s3-f4"
            >
              <div className="flex items-start gap-3">
                <Shield size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#FF9933' }} />
                <p className="text-gray-600 text-sm leading-relaxed">
                  This vote is securely recorded on the blockchain and linked to your wallet address.
                  Once minted, the vote cannot be altered or deleted, ensuring transparency and
                  election integrity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Overlay ── */}
      {showQR && qrDataUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-7 text-center relative border border-white/50"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Close QR"
            >
              <X size={18} />
            </button>
            <QrCode size={28} className="mx-auto mb-3" style={{ color: '#138808' }} />
            <h3 className="text-gray-800 font-bold text-lg mb-1">Vote Verification QR</h3>
            <p className="text-gray-500 text-sm mb-5">Scan to verify your vote on the blockchain</p>
            <img
              src={qrDataUrl}
              alt="Vote verification QR code"
              className="mx-auto rounded-xl"
              style={{ width: 230, height: 230 }}
            />
            <p className="text-sm font-mono mt-4" style={{ color: '#b45309' }}>
              Token #{data.tokenId}
            </p>
            <button
              onClick={() => setShowQR(false)}
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
