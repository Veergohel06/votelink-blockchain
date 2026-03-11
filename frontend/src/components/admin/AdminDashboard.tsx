import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  Play,
  Pause,
  Archive,
  MapPin,
  Globe,
  Building,
  Home,
  BarChart3,
  Settings,
  Shield,
  Database,
  Award,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  LogOut,
  X,
  Layout,
  PieChart,
  Trophy,
  Trash2
} from 'lucide-react';
import ElectionCreationWizard from './ElectionCreationWizard';
import { SecurityDashboard } from './SecurityDashboard';
import { SecuritySettings } from './SecuritySettings';
import { UserManagement } from './UserManagement';
import { DatabaseUsers } from './DatabaseUsers';
import BallotDesigner from './BallotDesigner';
import ExitPolls from './ExitPolls';
import ResultPublishing from './ResultPublishing';
import { ResultsDashboard } from '../voting/ResultsDashboard';
import { electionService, Election as ServiceElection, Candidate } from '../../services/electionService';

interface Election {
  id: string;
  title: string;
  description: string;
  type: 'national' | 'state' | 'district' | 'local' | 'municipal' | 'panchayat';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  region: {
    name: string;
    state: string;
    district?: string;
    constituencies: string[];
  };
  totalVoters: number;
  votescast: number;
  candidates: number;
  createdAt: string;
  createdBy: string;
}

interface RegionStats {
  region: string;
  state: string;
  totalElections: number;
  activeElections: number;
  totalVoters: number;
  participationRate: number;
}

interface AdminDashboardProps {
  onLogout?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [elections, setElections] = useState<Election[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'elections' | 'ballots' | 'results' | 'users' | 'security' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<'all' | 'national' | 'state' | 'district' | 'local'>('all');
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showResultsDashboard, setShowResultsDashboard] = useState(false);
  const [resultsElectionId, setResultsElectionId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [showElectionDetails, setShowElectionDetails] = useState(false);

  // Convert service elections to dashboard format
  const convertServiceElection = (se: ServiceElection): Election => ({
    id: se.id,
    title: se.title,
    description: se.description,
    type: se.type,
    status: se.status,
    startDate: se.startDate,
    endDate: se.endDate,
    registrationDeadline: se.registrationDeadline,
    region: se.region,
    totalVoters: se.totalVoters,
    votescast: se.votesCast,
    candidates: se.candidates.length,
    createdAt: se.createdAt,
    createdBy: se.createdBy
  });

  // Subscribe to election service updates
  useEffect(() => {
    const unsubscribe = electionService.subscribe((serviceElections) => {
      const dashboardElections = serviceElections.map(convertServiceElection);
      setElections(dashboardElections);
      setLastUpdate(new Date());
    });

    return () => unsubscribe();
  }, []);

  // Real-time updates from voting flow service (real votes only)
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh elections from service to get real vote counts
      const serviceElections = electionService.getAllElections();
      const dashboardElections = serviceElections.map(convertServiceElection);
      setElections(dashboardElections);
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Compute region stats from real election data
  const regionStats: RegionStats[] = React.useMemo(() => {
    if (elections.length === 0) {
      return [];
    }

    // Group elections by state/region
    const regionMap = new Map<string, {
      elections: Election[];
      totalVoters: number;
      totalVotes: number;
    }>();

    elections.forEach(election => {
      const regionKey = election.region.state || 'National';
      const existing = regionMap.get(regionKey) || { elections: [], totalVoters: 0, totalVotes: 0 };
      existing.elections.push(election);
      existing.totalVoters += election.totalVoters;
      existing.totalVotes += election.votescast;
      regionMap.set(regionKey, existing);
    });

    // Convert to RegionStats array
    const stats: RegionStats[] = [];
    regionMap.forEach((data, region) => {
      const participationRate = data.totalVoters > 0 
        ? (data.totalVotes / data.totalVoters) * 100 
        : 0;
      
      stats.push({
        region: region,
        state: region,
        totalElections: data.elections.length,
        activeElections: data.elections.filter(e => e.status === 'active').length,
        totalVoters: data.totalVoters,
        participationRate: parseFloat(participationRate.toFixed(1))
      });
    });

    // Sort by total elections descending
    return stats.sort((a, b) => b.totalElections - a.totalElections);
  }, [elections]);

  const getStatusColor = (status: Election['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'archived': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: Election['type']) => {
    switch (type) {
      case 'national': return <Globe className="w-4 h-4" />;
      case 'state': return <Building className="w-4 h-4" />;
      case 'district': return <MapPin className="w-4 h-4" />;
      case 'local': case 'municipal': return <Home className="w-4 h-4" />;
      case 'panchayat': return <Award className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const filteredElections = elections.filter(election => {
    const matchesSearch = election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         election.region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         election.region.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterRegion === 'all' || 
                         (filterRegion === 'national' && election.type === 'national') ||
                         (filterRegion === 'state' && election.type === 'state') ||
                         (filterRegion === 'district' && election.type === 'district') ||
                         (filterRegion === 'local' && ['local', 'municipal', 'panchayat'].includes(election.type));
    
    return matchesSearch && matchesFilter;
  });

  const totalStats = {
    totalElections: elections.length,
    activeElections: elections.filter(e => e.status === 'active').length,
    totalVoters: elections.reduce((sum, e) => sum + e.totalVoters, 0),
    totalVotes: elections.reduce((sum, e) => sum + e.votescast, 0),
    averageParticipation: elections.length > 0 
      ? elections.reduce((sum, e) => sum + (e.votescast / e.totalVoters * 100), 0) / elections.length 
      : 0
  };

  const handleElectionClick = (election: Election) => {
    setSelectedElection(election);
    setShowElectionDetails(true);
  };

  const handleDeleteElection = async (electionId: string) => {
    const election = elections.find(e => e.id === electionId);
    if (!election) return;

    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete "${election.title}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      // Delete from backend
      const apiUrl = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/elections/${electionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log(`🗑️ Election deleted from backend: ${election.title}`);
      } else {
        console.warn('⚠️ Backend delete failed, removing locally');
      }
    } catch (err) {
      console.warn('⚠️ Backend delete request failed, removing locally:', err);
    }

    // Always remove locally as well
    electionService.forceDeleteElection(electionId);
    setShowElectionDetails(false);
    alert(`✅ Election "${election.title}" has been deleted.`);
  };

  const handleElectionAction = (electionId: string, action: string) => {
    const election = elections.find(e => e.id === electionId);
    if (!election) return;
    
    switch (action) {
      case 'view':
        alert(`Viewing detailed information for: ${election.title}`);
        break;
      case 'edit':
        alert(`Opening election editor for: ${election.title}`);
        break;
      case 'manage':
        alert(`Managing election settings for: ${election.title}`);
        break;
      case 'results':
        setResultsElectionId(election.id);
        setShowResultsDashboard(true);
        break;
      default:
        alert(`Action "${action}" for: ${election.title}`);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black/70">Total Elections</p>
              <p className="text-2xl font-bold text-black">{totalStats.totalElections}</p>
            </div>
            <div className="p-3 bg-blue-100/30 backdrop-blur-sm rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-black/70">Active Elections</p>
                {totalStats.activeElections > 0 && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                )}
              </div>
              <p className="text-2xl font-bold text-green-600">{totalStats.activeElections}</p>
            </div>
            <div className="p-3 bg-green-100/30 backdrop-blur-sm rounded-lg">
              <Play className="w-6 h-6 text-green-600" />
            </div>
          </div>
          {totalStats.activeElections > 0 && (
            <div className="absolute top-2 right-2">
              <span className="text-xs text-green-600 font-medium">LIVE</span>
            </div>
          )}
        </div>

        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black/70">Total Voters</p>
              <p className="text-2xl font-bold text-black">{(totalStats.totalVoters / 1000000).toFixed(1)}M</p>
            </div>
            <div className="p-3 bg-purple-100/30 backdrop-blur-sm rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-black/70">Avg. Participation</p>
                {totalStats.activeElections > 0 && (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                )}
              </div>
              <p className={`text-2xl font-bold transition-colors duration-500 ${
                totalStats.activeElections > 0 
                  ? 'text-green-600' 
                  : 'text-orange-600'
              }`}>
                {totalStats.averageParticipation.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-orange-100/30 backdrop-blur-sm rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          {totalStats.activeElections > 0 && (
            <div className="absolute top-2 right-2">
              <span className="text-xs text-green-600 font-medium">📈 RISING</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Elections */}
      <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20">
        <div className="p-6 border-b border-black/10">
          <h2 className="text-lg font-semibold text-black">Recent Elections</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {elections.slice(0, 3).map((election) => (
              <div 
                key={election.id} 
                className="group flex items-center justify-between p-4 border border-black/20 bg-black/5 backdrop-blur-sm rounded-lg hover:bg-black/10 hover:border-black/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => handleElectionClick(election)}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-black/10 backdrop-blur-sm rounded-lg group-hover:bg-black/20 transition-all duration-300">
                    {getTypeIcon(election.type)}
                  </div>
                  <div>
                    <h3 className="font-medium text-black group-hover:text-blue-700 transition-colors duration-300">{election.title}</h3>
                    <p className="text-sm text-black/70">{election.region.name}, {election.region.state}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(election.status)}`}>
                      {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                    </span>
                    <p className="text-sm text-black/70 font-medium">
                      {((election.votescast / election.totalVoters) * 100).toFixed(1)}% turnout
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleElectionAction(election.id, 'view');
                      }}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 rounded-lg transition-colors duration-200"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleElectionAction(election.id, 'edit');
                      }}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-600 rounded-lg transition-colors duration-200"
                      title="Edit Election"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {election.status === 'active' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleElectionAction(election.id, 'results');
                        }}
                        className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 rounded-lg transition-colors duration-200"
                        title="Live Results"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleElectionAction(election.id, 'manage');
                      }}
                      className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-600 rounded-lg transition-colors duration-200"
                      title="Manage Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteElection(election.id);
                      }}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 rounded-lg transition-colors duration-200"
                      title="Delete Election"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderElections = () => (
    <div className="space-y-6">
      {/* Elections Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Election Management</h1>
          <p className="text-gray-600">Create and manage elections across different regions</p>
        </div>
        <button
          onClick={() => setShowCreateWizard(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Election
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/50 w-4 h-4" />
              <input
                type="text"
                placeholder="Search elections, regions, or states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/10 border border-black/20 rounded-lg text-black placeholder-black/50 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-300"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value as 'all' | 'national' | 'state' | 'district' | 'local')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="national">National</option>
              <option value="state">State</option>
              <option value="district">District</option>
              <option value="local">Local/Municipal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Elections List */}
      <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black/5 border-b border-black/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black/70 uppercase tracking-wider">Election</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black/70 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black/70 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black/70 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black/70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-black/10">
              {filteredElections.map((election) => (
                <tr key={election.id} className="hover:bg-black/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 rounded-lg mr-3">
                        {getTypeIcon(election.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{election.title}</h3>
                        <p className="text-sm text-gray-500">{election.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{election.region.name}</p>
                      <p className="text-sm text-gray-500">{election.region.state}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(election.status)}`}>
                      {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {election.votescast.toLocaleString()} / {election.totalVoters.toLocaleString()}
                        </p>
                        {election.status === 'active' && (
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                            <span className="text-xs text-green-600 font-medium">LIVE</span>
                          </div>
                        )}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            election.status === 'active' 
                              ? 'bg-gradient-to-r from-blue-500 to-green-500' 
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${(election.votescast / election.totalVoters) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {((election.votescast / election.totalVoters) * 100).toFixed(1)}% turnout
                        {election.status === 'active' && (
                          <span className="ml-2 text-green-600">● Active</span>
                        )}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      {election.status === 'draft' && (
                        <button className="text-green-600 hover:text-green-900">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {election.status === 'active' && (
                        <button className="text-yellow-600 hover:text-yellow-900">
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      <button className="text-red-600 hover:text-red-900">
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRegions = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Region Management</h1>
        <p className="text-gray-600">Monitor elections across different regions and states</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {regionStats.map((region) => (
          <div key={region.region} className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-black">{region.region}</h3>
                <p className="text-sm text-black/70">{region.state}</p>
              </div>
              <div className="p-2 bg-blue-100/30 backdrop-blur-sm rounded-lg">
                {region.region === 'All India' ? <Globe className="w-6 h-6 text-blue-600" /> : <MapPin className="w-6 h-6 text-blue-600" />}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-black/70">Total Elections</p>
                <p className="text-xl font-bold text-black">{region.totalElections}</p>
              </div>
              <div>
                <p className="text-sm text-black/70">Active Elections</p>
                <p className="text-xl font-bold text-green-600">{region.activeElections}</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-black/70 mb-1">
                <span>Voter Participation</span>
                <span>{region.participationRate}%</span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${region.participationRate}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Voters:</span>
              <span className="font-medium text-gray-900">{(region.totalVoters / 1000000).toFixed(1)}M</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Election Analytics</h1>
        <p className="text-gray-600">Comprehensive insights and reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">System Health</h3>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-black/70">Blockchain Status</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">Security Level</span>
              <span className="text-green-600 font-medium">High</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">Uptime</span>
              <span className="text-green-600 font-medium">99.9%</span>
            </div>
          </div>
        </div>

        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">Real-time Stats</h3>
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-black/70">Active Sessions</span>
              <span className="text-blue-600 font-medium">2,847</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">Processing Queue</span>
              <span className="text-orange-600 font-medium">156</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">Error Rate</span>
              <span className="text-green-600 font-medium">0.02%</span>
            </div>
          </div>
        </div>

        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">Alerts</h3>
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50/80 backdrop-blur-sm border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">High traffic in Maharashtra region</p>
            </div>
            <div className="p-3 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">All systems operational</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graph-Based Analytics Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Voter Turnout Trend Chart */}
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black">Voter Turnout Trends</h3>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-4">
            {/* Line Chart Simulation */}
            <div className="relative h-40 bg-black/5 rounded-lg p-4 overflow-hidden">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between py-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="border-t border-black/10 w-full"></div>
                ))}
              </div>
              <div className="absolute inset-0 flex justify-between items-end px-4 pb-4">
                {/* Data Points */}
                {[65, 72, 68, 78, 85, 82, 89].map((value, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div 
                      className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"
                      style={{ 
                        marginBottom: `${(value / 100) * 120}px`,
                        animationDelay: `${i * 0.2}s`
                      }}
                    ></div>
                    <div className="text-xs text-black/60 mt-2">
                      {i === 0 ? 'Jan' : i === 1 ? 'Feb' : i === 2 ? 'Mar' : i === 3 ? 'Apr' : i === 4 ? 'May' : i === 5 ? 'Jun' : 'Jul'}
                    </div>
                  </div>
                ))}
              </div>
              {/* Trend Line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d="M 60 100 Q 100 90 140 95 Q 180 85 220 75 Q 260 70 300 75 Q 340 65 380 60"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">+12%</div>
                <div className="text-black/70">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">78.5%</div>
                <div className="text-black/70">Average</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">89%</div>
                <div className="text-black/70">Peak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Performance Bar Chart */}
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black">Regional Performance</h3>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-4">
            {[
              { region: 'Maharashtra', value: 85, color: 'bg-blue-500' },
              { region: 'Karnataka', value: 78, color: 'bg-green-500' },
              { region: 'Tamil Nadu', value: 92, color: 'bg-purple-500' },
              { region: 'Gujarat', value: 69, color: 'bg-orange-500' },
              { region: 'West Bengal', value: 74, color: 'bg-red-500' }
            ].map((item, i) => (
              <div key={item.region} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-black">{item.region}</span>
                  <span className="text-sm text-black/70">{item.value}%</span>
                </div>
                <div className="w-full bg-black/10 rounded-full h-3">
                  <div 
                    className={`${item.color} h-3 rounded-full transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${item.value}%`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comprehensive Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart - Vote Distribution */}
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black">Vote Distribution</h3>
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          </div>
          <div className="flex items-center justify-center mb-4">
            {/* CSS Pie Chart */}
            <div className="relative w-32 h-32">
              <div className="w-full h-full rounded-full" style={{
                background: `conic-gradient(
                  #3B82F6 0deg 126deg,
                  #10B981 126deg 198deg,
                  #F59E0B 198deg 270deg,
                  #EF4444 270deg 315deg,
                  #8B5CF6 315deg 360deg
                )`
              }}></div>
              <div className="absolute inset-4 bg-black/10 backdrop-blur-lg rounded-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-black">98.5M</div>
                  <div className="text-xs text-black/70">Total</div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { party: 'Party A', percentage: 35, color: 'bg-blue-500' },
              { party: 'Party B', percentage: 28, color: 'bg-green-500' },
              { party: 'Party C', percentage: 20, color: 'bg-yellow-500' },
              { party: 'Party D', percentage: 12, color: 'bg-red-500' },
              { party: 'Others', percentage: 5, color: 'bg-purple-500' }
            ].map((item) => (
              <div key={item.party} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${item.color} rounded-full`}></div>
                  <span className="text-black/70">{item.party}</span>
                </div>
                <span className="text-black font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black">Live Activity</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {[
              { time: '16:05:32', event: 'New vote recorded in Mumbai', type: 'success' },
              { time: '16:05:28', event: 'Blockchain verification completed', type: 'info' },
              { time: '16:05:15', event: 'High traffic detected in Pune', type: 'warning' },
              { time: '16:04:58', event: 'Security scan completed', type: 'success' },
              { time: '16:04:42', event: 'Database backup initiated', type: 'info' },
              { time: '16:04:28', event: 'New voter registration', type: 'success' }
            ].map((activity, i) => (
              <div key={i} className="flex items-start space-x-3 animate-fadeIn" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <div className="text-sm text-black">{activity.event}</div>
                  <div className="text-xs text-black/60">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-black">Performance Metrics</h3>
            <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="space-y-6">
            {/* Circular Progress Indicators */}
            {[
              { label: 'System Efficiency', value: 94, color: 'stroke-green-500' },
              { label: 'Security Score', value: 98, color: 'stroke-blue-500' },
              { label: 'Network Speed', value: 87, color: 'stroke-purple-500' }
            ].map((metric, i) => (
              <div key={metric.label} className="flex items-center space-x-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="stroke-black/20"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={metric.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${metric.value}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      style={{ 
                        transition: 'stroke-dasharray 2s ease-out',
                        animationDelay: `${i * 0.3}s`
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-black">{metric.value}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-black">{metric.label}</div>
                  <div className="text-xs text-black/60">
                    {metric.value > 90 ? 'Excellent' : metric.value > 80 ? 'Good' : 'Fair'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">Configure platform settings and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-black">Security Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-black/70">Blockchain Verification</span>
              <button className="bg-green-500 rounded-full w-12 h-6 flex items-center justify-end px-1">
                <div className="bg-white w-4 h-4 rounded-full"></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/70">Biometric Authentication</span>
              <button className="bg-green-500 rounded-full w-12 h-6 flex items-center justify-end px-1">
                <div className="bg-white w-4 h-4 rounded-full"></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black/70">Audit Trail</span>
              <button className="bg-green-500 rounded-full w-12 h-6 flex items-center justify-end px-1">
                <div className="bg-white w-4 h-4 rounded-full"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black/10 backdrop-blur-lg rounded-xl shadow-lg border border-black/20 p-6">
          <div className="flex items-center mb-4">
            <Database className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-black">Data Management</h3>
          </div>
          <div className="space-y-4">
            <button className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Export Election Data</span>
                <Download className="w-4 h-4 text-gray-500" />
              </div>
            </button>
            <button className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Backup Database</span>
                <Database className="w-4 h-4 text-gray-500" />
              </div>
            </button>
            <button className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Archive Old Elections</span>
                <Archive className="w-4 h-4 text-gray-500" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'elections': return renderElections();
      case 'ballots': return <BallotDesigner />;
      case 'results': return <ResultPublishing />;
      case 'users': return <DatabaseUsers />;
      case 'security': return <SecurityDashboard />;
      case 'settings': return <SecuritySettings />;
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background matching login page */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Tricolor Gradient Background with Blue */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933] via-[#ffffff] via-[#000080] to-[#138808]" />
        
        {/* Animated Particles (Blue Dots) */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-900 rounded-full opacity-20 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 bg-black/5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating Shapes */}
        <div className="absolute top-3/4 left-1/4 w-64 h-64 bg-orange-900/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-3/4 right-1/4 w-48 h-48 bg-green-900/10 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      {/* Navigation */}
      <nav className="bg-black/10 backdrop-blur-lg shadow-lg border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              {/* Government of India Logo */}
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF9933] via-[#ffffff] to-[#138808] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                <span className="text-[#000080] text-xl font-bold">🇮🇳</span>
              </div>
              <div className="text-left">
                <div className="text-xs text-gray-600 font-medium">Government of India</div>
                <div className="text-sm text-gray-800 font-semibold">Election Commission</div>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              {[
                { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { key: 'elections', label: 'Elections', icon: Calendar },
                { key: 'ballots', label: 'Ballots', icon: Layout },
                { key: 'results', label: 'Results', icon: Trophy },
                { key: 'users', label: 'Users', icon: Users },
                { key: 'security', label: 'Security', icon: Shield },
                { key: 'settings', label: 'Settings', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'dashboard' | 'elections' | 'ballots' | 'results' | 'users' | 'security' | 'settings')}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Right side with logout button */}
            <div className="flex items-center">
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium 
                           text-gray-600 hover:text-red-700 hover:bg-red-50 
                           transition-colors duration-200 border border-transparent 
                           hover:border-red-200"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Real Data Mode Status Bar */}
      <div className="bg-black/10 backdrop-blur-lg border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 rounded-lg font-medium bg-green-100/80 text-green-700 border-2 border-green-300 shadow-md backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Real Data Mode
                </div>
              </div>
              
              {lastUpdate && (
                <div className="text-sm text-black/70 bg-black/10 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-black/20">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-green-700 font-medium bg-green-50/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-green-200">
                ✓ Blockchain Verified Results
              </div>
              <div className="text-xs text-black/70">
                Showing real election data
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>



      {/* Election Creation Wizard */}
      <ElectionCreationWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onCreateElection={(electionData) => {
          console.log('Creating election:', electionData);
          
          // Use candidates from the wizard form, with NOTA added automatically
          const candidatesFromForm: Candidate[] = electionData.candidates.map((c, index) => ({
            id: c.id || `cand_${Date.now()}_${index}`,
            name: c.name,
            party: c.party,
            symbol: c.symbol || '',
            color: c.color || '#3B82F6',
            description: c.description || '',
            image: c.image || ''
          }));

          // Add NOTA option automatically if not already present
          const hasNota = candidatesFromForm.some(c => 
            c.party.toLowerCase() === 'nota' || c.name.toLowerCase().includes('none of the above')
          );
          
          if (!hasNota) {
            candidatesFromForm.push({
              id: `cand_${Date.now()}_nota`,
              name: 'None of the Above',
              party: 'NOTA',
              symbol: '❌',
              color: '#666666',
              description: 'Choose if none of the candidates appeal to you'
            });
          }

          // Determine status based on dates
          const now = new Date();
          const startDate = new Date(electionData.startDate);
          let status: 'draft' | 'scheduled' | 'active' = 'draft';
          
          if (startDate > now) {
            status = 'scheduled';
          } else {
            status = 'active';
          }

          const newServiceElection = electionService.createElection({
            title: electionData.title,
            description: electionData.description,
            type: electionData.type as ServiceElection['type'],
            status: status,
            startDate: electionData.startDate,
            endDate: electionData.endDate,
            registrationDeadline: electionData.registrationDeadline,
            region: {
              name: electionData.district || electionData.state || electionData.regions[0] || 'Custom Region',
              state: electionData.state || electionData.regions[0] || 'All States',
              district: electionData.district || undefined,
              constituencies: electionData.regions || ['Default Constituency']
            },
            totalVoters: 50000,
            candidates: candidatesFromForm,
            createdBy: 'Admin User',
            settings: {
              allowEarlyVoting: electionData.allowEarlyVoting,
              requireVoterVerification: electionData.requireVoterVerification,
              enableRealTimeResults: electionData.enableRealTimeResults,
              allowProxyVoting: electionData.allowProxyVoting,
              enableBlockchain: electionData.securitySettings.enableBlockchain,
              requireBiometric: electionData.securitySettings.requireBiometric
            }
          });

          console.log('✅ Election created with', candidatesFromForm.length, 'candidates:', newServiceElection.title);
          alert(`🗳️ Election "${newServiceElection.title}" has been created!\n\nStatus: ${status.toUpperCase()}\nCandidates: ${candidatesFromForm.length}\n\n${status === 'scheduled' ? `It will go LIVE on ${new Date(electionData.startDate).toLocaleString()}` : 'It is now LIVE and visible to voters!'}`);
          
          setShowCreateWizard(false);
        }}
      />

      {/* Election Details Side Popup */}
      {showElectionDetails && selectedElection && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowElectionDetails(false)}
          ></div>
          
          {/* Slide-in Panel */}
          <div className="absolute right-0 top-0 h-full w-96 transform transition-transform duration-300 ease-in-out">
            <div className="h-full bg-black/10 backdrop-blur-lg border-l border-black/20 shadow-2xl overflow-hidden">
              {/* Background matching tricolor theme */}
              <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933] via-[#ffffff] via-[#000080] to-[#138808] opacity-80" />
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-900 rounded-full opacity-20 animate-pulse"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${2 + Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF9933]/80 via-[#ffffff]/80 to-[#138808]/80 backdrop-blur-sm px-6 py-4 border-b border-black/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                      {getTypeIcon(selectedElection.type)}
                    </div>
                    <h3 className="text-black font-semibold text-lg">Election Details</h3>
                  </div>
                  <button 
                    onClick={() => setShowElectionDetails(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200 text-black"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto h-full pb-20">
                <div className="space-y-6">
                  {/* Election Title */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <h2 className="text-xl font-bold text-black mb-2">{selectedElection.title}</h2>
                    <p className="text-black/80">{selectedElection.description}</p>
                  </div>

                  {/* Key Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {selectedElection.votescast.toLocaleString()}
                        </div>
                        <div className="text-sm text-black/80">Votes Cast</div>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {selectedElection.totalVoters.toLocaleString()}
                        </div>
                        <div className="text-sm text-black/80">Total Voters</div>
                      </div>
                    </div>
                  </div>

                  {/* Turnout Progress */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-black font-medium">Voter Turnout</span>
                      <span className="text-black/80 font-bold">
                        {((selectedElection.votescast / selectedElection.totalVoters) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${(selectedElection.votescast / selectedElection.totalVoters) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Election Information */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <h3 className="text-black font-semibold mb-3">Election Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-black/80">Region:</span>
                        <span className="text-black font-medium">{selectedElection.region.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/80">State:</span>
                        <span className="text-black font-medium">{selectedElection.region.state}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/80">Type:</span>
                        <span className="text-black font-medium capitalize">{selectedElection.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/80">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedElection.status)}`}>
                          {selectedElection.status.charAt(0).toUpperCase() + selectedElection.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/80">Candidates:</span>
                        <span className="text-black font-medium">{selectedElection.candidates}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dates Information */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <h3 className="text-black font-semibold mb-3">Important Dates</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-black/80">Start Date:</span>
                        <span className="text-black font-medium">
                          {new Date(selectedElection.startDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/80">End Date:</span>
                        <span className="text-black font-medium">
                          {new Date(selectedElection.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/80">Registration Deadline:</span>
                        <span className="text-black font-medium">
                          {new Date(selectedElection.registrationDeadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        handleElectionAction(selectedElection.id, 'edit');
                        setShowElectionDetails(false);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm text-white rounded-xl font-medium hover:from-blue-600/80 hover:to-purple-600/80 transition-all duration-300 border border-white/20"
                    >
                      ✏️ Edit Election
                    </button>
                    
                    {selectedElection.status === 'active' && (
                      <button
                        onClick={() => {
                          handleElectionAction(selectedElection.id, 'results');
                          setShowElectionDetails(false);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-green-500/80 to-teal-500/80 backdrop-blur-sm text-white rounded-xl font-medium hover:from-green-600/80 hover:to-teal-600/80 transition-all duration-300 border border-white/20"
                      >
                        📊 View Live Results
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        handleElectionAction(selectedElection.id, 'manage');
                        setShowElectionDetails(false);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-orange-500/80 to-red-500/80 backdrop-blur-sm text-white rounded-xl font-medium hover:from-orange-600/80 hover:to-red-600/80 transition-all duration-300 border border-white/20"
                    >
                      ⚙️ Manage Settings
                    </button>
                    <button
                      onClick={() => handleDeleteElection(selectedElection.id)}
                      className="w-full py-3 bg-gradient-to-r from-red-600/80 to-red-800/80 backdrop-blur-sm text-white rounded-xl font-medium hover:from-red-700/80 hover:to-red-900/80 transition-all duration-300 border border-white/20"
                    >
                      🗑️ Delete Election
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Dashboard Modal - Admin Only */}
      {showResultsDashboard && resultsElectionId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen">
            <ResultsDashboard
              electionId={resultsElectionId}
              candidates={(elections.find(e => e.id === resultsElectionId)?.candidates || []).map(c => ({
                id: c.id,
                name: c.name,
                party: c.party,
                symbol: c.symbol,
                color: c.color
              }))}
              isLive={true}
              onClose={() => {
                setShowResultsDashboard(false);
                setResultsElectionId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;