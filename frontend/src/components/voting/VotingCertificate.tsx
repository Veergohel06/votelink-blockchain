import React, { useState } from "react";
import { Download, FileText, Shield, CheckCircle, Loader2 } from "lucide-react";
import { certificateService, VotingCertificate as CertificateData } from "../../services/certificateService";

interface VotingCertificateProps {
  isVisible: boolean;
  voterData: {
    id: string;
    email: string;
    name?: string;
    constituency?: string;
    blockchainData?: {
      transactionHash: string;
      blockNumber: number;
      blockHash: string;
      networkName?: string;
    };
  };
  onClose: () => void;
}

export const VotingCertificate: React.FC<VotingCertificateProps> = ({
  isVisible,
  voterData,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  // Function to mask email address - show first 2 and last 2 of local part, full domain
  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return '***@***.***';
    const [localPart, domain] = email.split('@');
    const maskedLocal = localPart.length <= 4
      ? localPart.charAt(0) + '*'.repeat(localPart.length - 1)
      : `${localPart.slice(0, 2)}${'*'.repeat(localPart.length - 4)}${localPart.slice(-2)}`;
    return `${maskedLocal}@${domain}`;
  };

  // Function to mask voter ID (show first 2 and last 2 characters)
  const maskVoterId = (id: string): string => {
    if (id.length <= 4) return id;
    return `${id.slice(0, 2)}${'*'.repeat(id.length - 4)}${id.slice(-2)}`;
  };

  // Function to truncate transaction hash
  const truncateHash = (hash: string): string => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  };

  React.useEffect(() => {
    if (isVisible && !certificate) {
      generateCertificate();
    }
  }, [isVisible]);

  const generateCertificate = async () => {
    try {
      const cert = await certificateService.generateCertificate({
        voterId: voterData.id,
        voterName: voterData.name || "Verified Voter",
        voterEmail: voterData.email,
        constituency: voterData.constituency,
        blockchainData: voterData.blockchainData
      });
      setCertificate(cert);
    } catch (error) {
      console.error("Error generating certificate:", error);
    }
  };

  const handleDownload = async () => {
    if (!certificate) return;

    setIsDownloading(true);
    try {
      await certificateService.downloadCertificate(certificate);
    } catch (error) {
      console.error("Error downloading certificate:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isVisible || !certificate) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-black/20 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="text-white" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Voting Certificate Generated
          </h2>
          <p className="text-white/80 text-lg">
            Your official proof of democratic participation
          </p>
        </div>

        {/* Certificate Preview */}
        <div className="bg-black/5 rounded-2xl p-6 mb-6 border border-black/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-white/80 text-base font-medium">Voter ID (Encrypted)</label>
              <p className="text-white font-mono bg-black/20 p-3 rounded text-base">
                {maskVoterId(certificate.voterId)}
              </p>
            </div>
            <div>
              <label className="text-white/80 text-base font-medium">Voter Name</label>
              <p className="text-white font-medium text-lg">{certificate.voterName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-white/80 text-base font-medium">Email (Protected)</label>
              <p className="text-white text-base">{maskEmail(certificate.voterEmail)}</p>
            </div>
            <div>
              <label className="text-white/80 text-base font-medium">Voting Date</label>
              <p className="text-white text-base">
                {certificate.votingDate.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/80 text-base font-medium">Constituency</label>
              <p className="text-white text-base">{certificate.constituency}</p>
            </div>
            <div>
              <label className="text-white/80 text-base font-medium">Election Type</label>
              <p className="text-white text-base">{certificate.electionType}</p>
            </div>
          </div>
        </div>

        {/* Security Information */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="font-medium mb-2 text-white text-lg">Blockchain Verification:</p>
              
              {certificate.verificationUrl ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-white/80 text-sm font-medium">Transaction Hash (Encrypted)</label>
                    <p className="text-white font-mono text-sm bg-black/20 p-3 rounded break-all">
                      {truncateHash(certificate.blockchainHash)}
                    </p>
                  </div>
                  
                  {certificate.blockNumber && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/80 text-sm font-medium">Block Number</label>
                        <p className="text-white font-mono text-base">{certificate.blockNumber}</p>
                      </div>
                      <div>
                        <label className="text-white/80 text-sm font-medium">Network</label>
                        <p className="text-white text-base">{certificate.networkName || 'Ganache Local'}</p>
                      </div>
                    </div>
                  )}
                  
                  <a
                    href={certificate.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    🔗 View Transaction
                  </a>
                </div>
              ) : (
                <div className="text-white/80 text-base">
                  <p className="font-medium mb-2 text-lg">Security Features:</p>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li>Digital signature verification</li>
                    <li>Tamper-proof certificate</li>
                    <li>Unique security identifier</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 py-4 bg-gradient-to-r from-green-500 to-blue-600 
                     text-white rounded-xl font-semibold text-lg
                     hover:from-green-600 hover:to-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transform hover:scale-105 transition-all duration-300
                     shadow-lg hover:shadow-xl
                     flex items-center justify-center"
          >
            {isDownloading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="mr-2" size={20} />
                Download Certificate
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-6 py-4 bg-gray-600 text-white rounded-xl font-semibold text-lg
                     hover:bg-gray-700 transition-all duration-300
                     flex items-center justify-center"
          >
            <FileText className="mr-2" size={20} />
            Close
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-200 text-sm">
            Keep this certificate safe as proof of your democratic participation.
            <br />
            This document is secured with digital signature verification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VotingCertificate;
