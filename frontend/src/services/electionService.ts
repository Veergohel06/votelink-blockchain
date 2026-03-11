/**
 * Election Service
 * Manages election hosting, scheduling, and retrieval for both admin and voter interfaces
 * NOW SYNCS WITH BACKEND MONGODB!
 */

const API_BASE_URL = 'http://localhost:5000/api';

export interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  color: string;
  description: string;
  manifesto?: string;
  image?: string;
}

export interface Election {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  type: 'national' | 'state' | 'district' | 'local' | 'municipal' | 'panchayat';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  region: {
    name: string;
    state: string;
    district?: string;
    constituencies: string[];
  };
  totalVoters: number;
  votesCast?: number;
  candidates: Candidate[];
  createdAt?: string;
  createdBy: string;
  resultsPublished?: boolean;
  resultsPublishedAt?: string;
  settings: {
    allowEarlyVoting: boolean;
    requireVoterVerification: boolean;
    enableRealTimeResults: boolean;
    allowProxyVoting: boolean;
    enableBlockchain: boolean;
    requireBiometric: boolean;
  };
}

const ELECTIONS_STORAGE_KEY = 'votelink_elections';
const VOTES_STORAGE_KEY = 'votelink_election_votes';

class ElectionService {
  private elections: Election[] = [];
  private listeners: Set<(elections: Election[]) => void> = new Set();
  private synced: boolean = false;

  constructor() {
    this.loadElections();
    this.initializeDefaultElections();
    // Sync with backend immediately
    this.syncFromBackend();
    // Check for scheduled elections every minute
    setInterval(() => this.checkScheduledElections(), 60000);
    // Sync with backend every 30 seconds
    setInterval(() => this.syncFromBackend(), 30000);
  }

  /**
   * Sync elections from backend MongoDB
   */
  private async syncFromBackend(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/elections/active`);
      const result = await response.json();

      if (result.success && result.data.elections) {
        // Keep a map of existing local resultsPublished states
        const localPublishedStates = new Map<string, { published: boolean, publishedAt: string | null }>();
        this.elections.forEach(e => {
          const id = e.id || e._id || '';
          if (e.resultsPublished) {
            localPublishedStates.set(id, {
              published: e.resultsPublished,
              publishedAt: e.resultsPublishedAt || null
            });
          }
        });

        // Update local elections from backend, preserving resultsPublished
        this.elections = result.data.elections.map((el: any) => {
          const id = el._id || el.id || '';
          const localState = localPublishedStates.get(id);

          return {
            id: id,
            ...el,
            startDate: el.startDate,
            endDate: el.endDate,
            votesCast: el.votesCast || 0,
            // Prefer backend value, but fallback to local if backend doesn't have it
            resultsPublished: el.resultsPublished === true || (localState?.published === true) || false,
            resultsPublishedAt: el.resultsPublishedAt || localState?.publishedAt || null
          };
        });

        this.synced = true;
        this.saveElections(); // Also save to localStorage as backup
        this.notifyListeners();
        console.log(`✅ Synced ${this.elections.length} active elections from backend`);
        console.log(`📊 Elections with resultsPublished:`, this.elections.filter(e => e.resultsPublished).map(e => e.title));
      }
    } catch (error) {
      console.warn('⚠️  Failed to sync elections from backend:', error);
      // Fall back to localStorage if backend is down
      this.loadElections();
    }
  }

  private loadElections(): void {
    try {
      const stored = localStorage.getItem(ELECTIONS_STORAGE_KEY);
      if (stored) {
        this.elections = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load elections:', error);
      this.elections = [];
    }
  }

  private saveElections(): void {
    try {
      localStorage.setItem(ELECTIONS_STORAGE_KEY, JSON.stringify(this.elections));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save elections:', error);
    }
  }

  private initializeDefaultElections(): void {
    // IMPORTANT: No default/demo elections are initialized
    // All elections must be created by the admin and stored in the database
    // If no elections exist, the frontend will show "No active elections available"

    // Empty elections array - will be populated only by admin-created elections
    if (this.elections.length === 0) {
      this.elections = [];
      this.saveElections();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.elections]));
  }

  private checkScheduledElections(): void {
    const now = new Date();
    let updated = false;

    this.elections = this.elections.map(election => {
      const startDate = new Date(election.startDate);
      const endDate = new Date(election.endDate);

      // Activate scheduled elections when start time arrives
      if (election.status === 'scheduled' && now >= startDate && now < endDate) {
        console.log(`🗳️ Election "${election.title}" is now LIVE!`);
        updated = true;
        return { ...election, status: 'active' as const };
      }

      // Complete active elections when end time arrives
      if (election.status === 'active' && now >= endDate) {
        console.log(`✅ Election "${election.title}" has ended.`);
        updated = true;
        return { ...election, status: 'completed' as const };
      }

      return election;
    });

    if (updated) {
      this.saveElections();
    }
  }

  // Subscribe to election updates
  subscribe(listener: (elections: Election[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately notify with current elections
    listener([...this.elections]);

    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get all elections
  getAllElections(): Election[] {
    this.checkScheduledElections();
    return [...this.elections];
  }

  // Get active elections for voters
  getActiveElections(): Election[] {
    this.checkScheduledElections();
    return this.elections.filter(e => e.status === 'active');
  }

  // Get elections by region
  getElectionsByRegion(state: string, district?: string): Election[] {
    this.checkScheduledElections();
    return this.elections.filter(e => {
      if (e.status !== 'active') return false;

      // National elections are available to everyone
      if (e.type === 'national') return true;

      // State elections are available to voters in that state
      if (e.region.state === state || e.region.state === 'All States') {
        if (district && e.region.district) {
          return e.region.district === district;
        }
        return true;
      }

      return false;
    });
  }

  // Get a specific election by ID
  getElectionById(id: string): Election | undefined {
    return this.elections.find(e => e.id === id || e._id === id);
  }

  /**
   * Create a new election (admin only) - NOW SAVES TO BACKEND!
   */
  async createElection(electionData: Omit<Election, '_id' | 'id' | 'createdAt' | 'votesCast'>): Promise<Election> {
    try {
      const adminToken = localStorage.getItem('votelink_admin_token') || '';
      const response = await fetch(`${API_BASE_URL}/elections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({
          ...electionData,
          createdBy: electionData.createdBy || 'admin@election.gov',
          totalVoters: electionData.totalVoters || 1000000
        })
      });

      const result = await response.json();

      if (result.success) {
        const newElection = {
          id: result.data._id,
          ...result.data
        };

        // Add to local list
        this.elections.push(newElection);
        this.notifyListeners();

        console.log(`📋 New election created and saved to backend: "${newElection.title}"`);
        return newElection;
      } else {
        throw new Error(result.error || 'Failed to create election');
      }
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  }

  /**
   * Update an existing election - NOW SAVES TO BACKEND!
   */
  async updateElection(id: string, updates: Partial<Election>): Promise<Election | null> {
    try {
      console.log('📝 Updating election:', id, 'with:', updates);

      const adminToken = localStorage.getItem('votelink_admin_token') || '';
      const response = await fetch(`${API_BASE_URL}/elections/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      console.log('📝 Update response:', result);

      if (result.success) {
        const updatedElection = {
          id: result.data._id,
          ...result.data,
          resultsPublished: result.data.resultsPublished || updates.resultsPublished || false,
          resultsPublishedAt: result.data.resultsPublishedAt || updates.resultsPublishedAt || null
        };

        const index = this.elections.findIndex(e => e.id === id || e._id === id);
        if (index !== -1) {
          this.elections[index] = updatedElection;
        } else {
          // If not found by id, try to add it
          this.elections.push(updatedElection);
        }

        // Save to localStorage as backup
        this.saveElections();
        this.notifyListeners();

        console.log(`✏️  Election updated: "${updatedElection.title}"`);
        return updatedElection;
      } else {
        console.error('Update failed:', result.error);
        throw new Error(result.error || 'Failed to update election');
      }
    } catch (error) {
      console.error('Error updating election:', error);

      // Fallback: Update localStorage only if backend fails
      const index = this.elections.findIndex(e => e.id === id || e._id === id);
      if (index !== -1) {
        this.elections[index] = { ...this.elections[index], ...updates };
        this.saveElections();
        this.notifyListeners();
        console.log('⚠️ Updated localStorage only (backend failed)');
        return this.elections[index];
      }

      return null;
    }
  }

  /**
   * Schedule an election
   */
  async scheduleElection(id: string, startDate: string, endDate: string): Promise<Election | null> {
    return this.updateElection(id, {
      startDate,
      endDate,
      status: 'scheduled'
    });
  }

  // Start an election immediately
  startElection(id: string): Promise<Election | null> {
    return this.updateElection(id, {
      status: 'active',
      startDate: new Date().toISOString()
    });
  }

  // Pause an active election
  pauseElection(id: string): Promise<Election | null> {
    return this.updateElection(id, { status: 'paused' });
  }

  // Resume a paused election
  resumeElection(id: string): Promise<Election | null> {
    return this.updateElection(id, { status: 'active' });
  }

  // End an election
  endElection(id: string): Promise<Election | null> {
    return this.updateElection(id, {
      status: 'completed',
      endDate: new Date().toISOString()
    });
  }

  // Archive an election
  archiveElection(id: string): Promise<Election | null> {
    return this.updateElection(id, { status: 'archived' });
  }

  /**
   * Publish election results - marks results as published
   */
  async publishElectionResults(id: string): Promise<Election | null> {
    return this.updateElection(id, {
      resultsPublished: true,
      resultsPublishedAt: new Date().toISOString()
    });
  }

  // Delete an election (only drafts can be deleted)
  deleteElection(id: string): boolean {
    const election = this.elections.find(e => e.id === id);
    if (!election || election.status !== 'draft') return false;

    this.elections = this.elections.filter(e => e.id !== id);
    this.saveElections();
    return true;
  }

  // Force delete any election regardless of status (admin action)
  forceDeleteElection(id: string): boolean {
    const election = this.elections.find(e => e.id === id || e._id === id);
    if (!election) return false;

    this.elections = this.elections.filter(e => e.id !== id && e._id !== id);
    this.saveElections();
    return true;
  }

  // Record a vote
  recordVote(electionId: string, candidateId: string, voterId: string): boolean {
    const election = this.elections.find(e => e.id === electionId);
    if (!election || election.status !== 'active') return false;

    // Check if voter already voted in this election
    const votesKey = `${VOTES_STORAGE_KEY}_${electionId}`;
    const votes = JSON.parse(localStorage.getItem(votesKey) || '{}');

    if (votes[voterId]) {
      console.log('❌ Voter has already cast a vote in this election');
      return false;
    }

    // Record the vote
    votes[voterId] = {
      candidateId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(votesKey, JSON.stringify(votes));

    // Update vote count
    election.votesCast = (election.votesCast || 0) + 1;
    this.saveElections();

    console.log(`✅ Vote recorded for election "${election.title}"`);
    return true;
  }

  // Get election results
  getElectionResults(electionId: string): { candidateId: string; votes: number }[] {
    const votesKey = `${VOTES_STORAGE_KEY}_${electionId}`;
    const votes = JSON.parse(localStorage.getItem(votesKey) || '{}');

    const results: Record<string, number> = {};
    Object.values(votes).forEach((vote: any) => {
      results[vote.candidateId] = (results[vote.candidateId] || 0) + 1;
    });

    return Object.entries(results).map(([candidateId, voteCount]) => ({
      candidateId,
      votes: voteCount
    }));
  }

  // Add candidates to an election
  addCandidates(electionId: string, candidates: Candidate[]): Election | null {
    const election = this.elections.find(e => e.id === electionId);
    if (!election) return null;

    election.candidates = [...election.candidates, ...candidates];
    this.saveElections();

    return election;
  }

  // Remove a candidate from an election
  removeCandidate(electionId: string, candidateId: string): Election | null {
    const election = this.elections.find(e => e.id === electionId);
    if (!election) return null;

    election.candidates = election.candidates.filter(c => c.id !== candidateId);
    this.saveElections();

    return election;
  }
}

// Export singleton instance
export const electionService = new ElectionService();
export default electionService;
