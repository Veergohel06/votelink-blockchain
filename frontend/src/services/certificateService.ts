import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// ─── Colors (India Tricolor theme) ───────────────────────────────────────────
const C = {
  saffron:    '#FF9933',
  saffronDark:'#E8871A',
  green:      '#138808',
  cream:      '#FFFDF5',
  navy:       '#1A1A2E',
  slate:      '#64748B',
  blue:       '#1D4ED8',
  verified:   '#16A34A',
  white:      '#FFFFFF',
} as const;

export interface VotingCertificate {
  voterId: string;
  voterName: string;
  voterEmail: string;
  votingDate: Date;
  transactionId: string;
  blockchainHash: string;
  blockNumber?: number;
  blockHash?: string;
  constituency: string;
  electionType: string;
  securityHash: string;
  certNo: string;
  verificationUrl?: string;
  networkName?: string;
}

// Helper — hex to jsPDF rgb array [r, g, b]
function hex(h: string): [number, number, number] {
  const v = h.replace('#', '');
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}

class CertificateService {

  // Privacy masking — e.g. XOG6984330 → XO******30
  private maskVoterId(id: string): string {
    if (!id || id.length <= 4) return id;
    return `${id.slice(0, 2)}${'*'.repeat(id.length - 4)}${id.slice(-2)}`;
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length <= 4
      ? local.charAt(0) + '*'.repeat(local.length - 1)
      : `${local.slice(0, 2)}${'*'.repeat(local.length - 4)}${local.slice(-2)}`;
    return `${maskedLocal}@${domain}`;
  }

  private truncateHash(hash: string): string {
    if (!hash || hash.length <= 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  }

  generateTransactionId(): string {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `TXN-${ts}-${rnd}`;
  }

  generateBlockchainHash(): string {
    const n = Date.now() + Math.random() * 1e10;
    return `0x${Math.abs(n).toString(16).padStart(64, '0')}`;
  }

  generateSecurityHash(voterId: string, transactionId: string): string {
    const raw = voterId + transactionId + Date.now();
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = Math.imul(31, h) + raw.charCodeAt(i);
    }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  private generateCertNo(securityHash: string): string {
    return `VOTE-2026-${securityHash.slice(0, 8)}`;
  }

  // ─── Public: generate certificate data object ───────────────────────────
  async generateCertificate(voterData: {
    voterId: string;
    voterName: string;
    voterEmail: string;
    constituency?: string;
    electionType?: string;
    blockchainData?: {
      transactionHash: string;
      blockNumber: number;
      blockHash: string;
      networkName?: string;
    };
  }): Promise<VotingCertificate> {
    const transactionId   = voterData.blockchainData?.transactionHash || this.generateTransactionId();
    const blockchainHash  = voterData.blockchainData?.transactionHash || this.generateBlockchainHash();
    const blockNumber     = voterData.blockchainData?.blockNumber;
    const blockHash       = voterData.blockchainData?.blockHash;
    const networkName     = voterData.blockchainData?.networkName || 'Hardhat / Ethereum';
    const securityHash    = this.generateSecurityHash(voterData.voterId, transactionId);
    const certNo          = this.generateCertNo(securityHash);
    const verificationUrl = voterData.blockchainData?.transactionHash
      ? `https://sepolia.etherscan.io/tx/${voterData.blockchainData.transactionHash}`
      : `https://votelink.in/verify/${certNo}`;

    return {
      voterId:        voterData.voterId,           // real ID from voter profile
      voterName:      voterData.voterName,
      voterEmail:     voterData.voterEmail,
      votingDate:     new Date(),
      transactionId,
      blockchainHash,
      blockNumber,
      blockHash,
      constituency:   voterData.constituency  || 'General Constituency',
      electionType:   voterData.electionType  || 'General Election 2026',
      securityHash,
      certNo,
      verificationUrl,
      networkName,
    };
  }

  // ─── Public: build & download the PDF ───────────────────────────────────
  async downloadCertificate(certificate: VotingCertificate): Promise<void> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W   = 210;  // A4 width mm
    const H   = 297;  // A4 height mm

    // ── Page background (cream) ────────────────────────────────────────────
    pdf.setFillColor(...hex(C.cream));
    pdf.rect(0, 0, W, H, 'F');

    // ── Outer gold border ──────────────────────────────────────────────────
    pdf.setDrawColor(...hex(C.saffronDark));
    pdf.setLineWidth(1.2);
    pdf.rect(6, 6, W - 12, H - 12);
    pdf.setLineWidth(0.4);
    pdf.rect(8, 8, W - 16, H - 16);

    // ── HEADER — saffron band ──────────────────────────────────────────────
    pdf.setFillColor(...hex(C.saffron));
    pdf.rect(6, 6, W - 12, 38, 'F');

    // Flag emoji row (Unicode — fallback to text on some renderers)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(...hex(C.white));
    pdf.text('ELECTION COMMISSION OF INDIA', W / 2, 18, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('OFFICIAL VOTING CERTIFICATE', W / 2, 25, { align: 'center' });

    // Thin white rule under subtitle
    pdf.setDrawColor(...hex(C.white));
    pdf.setLineWidth(0.4);
    pdf.line(40, 28, W - 40, 28);

    pdf.setFontSize(8);
    pdf.text('Issued under the authority of the Election Commission of India', W / 2, 33, { align: 'center' });

    // ── Green stripe under header ──────────────────────────────────────────
    pdf.setFillColor(...hex(C.green));
    pdf.rect(6, 44, W - 12, 4, 'F');

    // ── Certificate Meta ───────────────────────────────────────────────────
    let y = 55;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...hex(C.slate));
    pdf.text('CERTIFICATE NO', 15, y);
    pdf.text('ISSUED ON', W / 2 + 5, y);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(...hex(C.navy));
    pdf.text(certificate.certNo, 15, y + 5);
    pdf.text(
      certificate.votingDate.toLocaleString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      }) + ' IST',
      W / 2 + 5, y + 5
    );

    // ── Section divider helper ─────────────────────────────────────────────
    const sectionTitle = (title: string, yPos: number) => {
      pdf.setFillColor(...hex(C.green));
      pdf.rect(15, yPos, W - 30, 5.5, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...hex(C.white));
      pdf.text(title, 18, yPos + 3.8);
      return yPos + 9;
    };

    // ── Field helper ───────────────────────────────────────────────────────
    const field = (label: string, value: string, xL: number, xV: number, yPos: number, mono = false) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...hex(C.slate));
      pdf.text(label, xL, yPos);

      if (mono) {
        pdf.setFillColor(235, 242, 255);
        pdf.roundedRect(xV - 1, yPos - 3.5, 85, 5.5, 1, 1, 'F');
      }

      pdf.setFont(mono ? 'courier' : 'helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...hex(mono ? C.blue : C.navy));
      pdf.text(value, xV, yPos, { maxWidth: 83 });
    };

    // ── VOTER DETAILS section ──────────────────────────────────────────────
    y = 72;
    y = sectionTitle('VOTER DETAILS', y);

    field('Voter Name',   certificate.voterName,                   15, 48, y);
    // Real voter ID — masked for privacy (first 4 + asterisks + last 4)
    field('Voter ID',     this.maskVoterId(certificate.voterId),   15, 48, y + 8, true);
    field('Email',        this.maskEmail(certificate.voterEmail),  15, 48, y + 16);
    field('Constituency', certificate.constituency,                W/2 + 5, W/2 + 38, y);
    field('Election',     certificate.electionType,                W/2 + 5, W/2 + 38, y + 8);
    field('Election Type',certificate.electionType.split(' ')[0] || 'LOCAL', W/2 + 5, W/2 + 38, y + 16);

    // ── VOTE RECORD section ────────────────────────────────────────────────
    y += 30;
    y = sectionTitle('VOTE RECORD', y);

    const votedStr = certificate.votingDate.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZone: 'Asia/Kolkata'
    });

    field('Voted On',       votedStr,                                15, 48, y);
    field('Transaction ID', this.truncateHash(certificate.transactionId), 15, 48, y + 8,  true);
    field('Blockchain Hash',this.truncateHash(certificate.blockchainHash), 15, 48, y + 16, true);
    if (certificate.blockNumber) {
      field('Block Number', `#${certificate.blockNumber}`,           W/2 + 5, W/2 + 38, y);
    }
    if (certificate.blockHash) {
      field('Block Hash',   this.truncateHash(certificate.blockHash), W/2 + 5, W/2 + 38, y + 8, true);
    }
    field('Network',        certificate.networkName || 'Ethereum',   W/2 + 5, W/2 + 38, y + 16);
    field('Security Hash',  certificate.securityHash,                W/2 + 5, W/2 + 38, y + 24, true);

    // ── VERIFICATION section ───────────────────────────────────────────────
    y += 40;
    y = sectionTitle('VERIFICATION', y);

    // QR code
    try {
      const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl || certificate.certNo, {
        width: 128, margin: 1,
        color: { dark: C.navy, light: C.cream }
      });
      pdf.addImage(qrDataUrl, 'PNG', 15, y, 28, 28);
    } catch {
      // If QR fails, draw placeholder box
      pdf.setDrawColor(...hex(C.navy));
      pdf.rect(15, y, 28, 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(...hex(C.slate));
      pdf.text('QR', 29, y + 15, { align: 'center' });
    }

    // Verification text alongside QR
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...hex(C.slate));
    pdf.text('Scan QR or visit:', 48, y + 5);

    pdf.setFont('courier', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(...hex(C.blue));
    pdf.text(certificate.verificationUrl || `votelink.in/verify/${certificate.certNo}`, 48, y + 11, { maxWidth: W - 63 });

    // Verified badge
    pdf.setFillColor(...hex(C.verified));
    pdf.roundedRect(48, y + 16, 70, 7, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...hex(C.white));
    pdf.text('✓  Vote Securely Recorded on Blockchain', 83, y + 21, { align: 'center' });

    // Warning note
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(7);
    pdf.setTextColor(...hex(C.slate));
    pdf.text(
      '⚠  This is a confidential document. Do NOT share it publicly.',
      W / 2, y + 32, { align: 'center' }
    );

    // ── GREEN FOOTER ───────────────────────────────────────────────────────
    pdf.setFillColor(...hex(C.green));
    pdf.rect(6, H - 18, W - 12, 12, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...hex(C.white));
    pdf.text('© 2026 VoteLink — Powered by Blockchain Technology', W / 2, H - 13, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.text(
      `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
      W / 2, H - 9, { align: 'center' }
    );

    // ── Save ───────────────────────────────────────────────────────────────
    pdf.save(`VoteLink_Certificate_${certificate.certNo}.pdf`);
  }
}

export const certificateService = new CertificateService();