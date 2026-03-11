import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Shield,
  Clock,
  RefreshCw,
  X,
  CheckCircle,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  Blocks,
  Hash,
} from 'lucide-react';

interface Transaction {
  txHash: string;
  blockNumber: number | null;
  confirmed: boolean;
  electionId: string;
  constituency: string;
  timestamp: string;
}

interface BlockchainStats {
  contractAddress: string;
  network: string;
  rpcUrl: string;
  election: {
    active: boolean;
    startTime: string;
    endTime: string;
    totalVotesOnChain: number;
  };
}

interface VerifiedTx {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  status: string;
  gasUsed: string;
  timestamp: string;
}

interface BlockchainExplorerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const BlockchainExplorer: React.FC<BlockchainExplorerProps> = ({
  isVisible,
  onClose,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchHash, setSearchHash] = useState('');
  const [verifiedTx, setVerifiedTx] = useState<VerifiedTx | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const apiUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api';

  const fetchTransactions = useCallback(async (p: number) => {
    try {
      const res = await fetch(`${apiUrl}/blockchain/transactions?page=${p}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch {
      console.error('Failed to fetch transactions');
    }
  }, [apiUrl]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/blockchain/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.blockchain);
      }
    } catch {
      console.error('Failed to fetch blockchain stats');
    }
  }, [apiUrl]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchTransactions(page), fetchStats()]);
    setIsLoading(false);
  }, [fetchTransactions, fetchStats, page]);

  useEffect(() => {
    if (isVisible) loadData();
  }, [isVisible, loadData]);

  const verifyTransaction = async () => {
    const hash = searchHash.trim();
    if (!hash || !hash.startsWith('0x')) {
      setVerifyError('Enter a valid transaction hash starting with 0x');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    setVerifiedTx(null);
    try {
      const res = await fetch(`${apiUrl}/blockchain/verify/${hash}`);
      const data = await res.json();
      if (data.success) {
        setVerifiedTx(data.transaction);
      } else {
        setVerifyError(data.error || 'Transaction not found');
      }
    } catch {
      setVerifyError('Could not reach blockchain node');
    } finally {
      setVerifying(false);
    }
  };

  const truncateHash = (hash: string) =>
    hash.length > 18 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Blocks className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Blockchain Explorer</h2>
              <p className="text-gray-400 text-sm">Verify transactions on-chain</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Blockchain Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-green-400" />
                  <span className="text-gray-400 text-sm">Election Status</span>
                </div>
                <p className={`text-lg font-bold ${stats.election.active ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.election.active ? 'Active' : 'Inactive'}
                </p>
                <p className="text-gray-500 text-xs mt-1">{stats.network}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-blue-400" />
                  <span className="text-gray-400 text-sm">Votes On-Chain</span>
                </div>
                <p className="text-2xl font-bold text-white">{stats.election.totalVotesOnChain}</p>
                <p className="text-gray-500 text-xs mt-1 font-mono">{truncateHash(stats.contractAddress)}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-purple-400" />
                  <span className="text-gray-400 text-sm">DB Confirmed</span>
                </div>
                <p className="text-2xl font-bold text-white">{total}</p>
                <p className="text-gray-500 text-xs mt-1">Stored in database</p>
              </div>
            </div>
          )}

          {/* Verify Transaction */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Search size={16} /> Verify Transaction
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                placeholder="Enter transaction hash (0x...)"
                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm font-mono placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && verifyTransaction()}
              />
              <button
                onClick={verifyTransaction}
                disabled={verifying}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                Verify
              </button>
            </div>
            {verifyError && <p className="text-red-400 text-sm mt-2">{verifyError}</p>}
            {verifiedTx && (
              <div className="mt-3 bg-gray-900/80 border border-green-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 font-semibold text-sm">Transaction Verified on Blockchain</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Hash:</span>
                    <p className="text-white font-mono text-xs break-all">{verifiedTx.hash}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Block:</span>
                    <p className="text-white font-mono">{verifiedTx.blockNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <p className={verifiedTx.status === 'success' ? 'text-green-400' : 'text-red-400'}>{verifiedTx.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Gas Used:</span>
                    <p className="text-white font-mono">{verifiedTx.gasUsed}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">From:</span>
                    <p className="text-white font-mono text-xs">{truncateHash(verifiedTx.from)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">To:</span>
                    <p className="text-white font-mono text-xs">{truncateHash(verifiedTx.to)}</p>
                  </div>
                  {verifiedTx.timestamp && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Timestamp:</span>
                      <p className="text-white">{new Date(verifiedTx.timestamp).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transaction List */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Hash size={16} /> Blockchain Transactions
              </h3>
              <button onClick={loadData} className="text-gray-400 hover:text-white transition-colors p-1">
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw size={24} className="animate-spin text-blue-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <Blocks size={32} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No blockchain transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {transactions.map((tx, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${tx.confirmed ? 'bg-green-400' : 'bg-yellow-400'}`} />
                        <div>
                          <p className="text-white font-mono text-sm">{truncateHash(tx.txHash)}</p>
                          <p className="text-gray-500 text-xs">
                            {tx.constituency && `${tx.constituency} · `}
                            {new Date(tx.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {tx.blockNumber && (
                          <span className="text-gray-400 text-xs font-mono">Block #{tx.blockNumber}</span>
                        )}
                        <button
                          onClick={() => {
                            setSearchHash(tx.txHash);
                            verifyTransaction();
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Verify on chain"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                <p className="text-gray-400 text-sm">
                  Page {page} of {totalPages} ({total} transactions)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPage(p => Math.max(1, p - 1)); }}
                    disabled={page === 1}
                    className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); }}
                    disabled={page === totalPages}
                    className="p-1 text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
