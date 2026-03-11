import React, { useState } from 'react';
import { 
  Calendar, 
  Users, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  Check,
  X,
  FileText,
  Shield,
  Plus,
  Trash2,
  UserPlus,
  Edit2
} from 'lucide-react';

interface ElectionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateElection: (electionData: ElectionFormData) => void;
}

interface Candidate {
  id: string;
  name: string;
  party: string;
  symbol: string;
  color: string;
  description: string;
  manifesto: string;
  image: string;
}

interface ElectionFormData {
  title: string;
  description: string;
  type: 'national' | 'state' | 'local' | 'referendum';
  templateId?: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  timezone: string;
  allowEarlyVoting: boolean;
  earlyVotingStart?: string;
  requireVoterVerification: boolean;
  enableRealTimeResults: boolean;
  allowProxyVoting: boolean;
  maxCandidates: number;
  regions: string[];
  state: string;
  district: string;
  voterEligibility: {
    minAge: number;
    requiresCitizenship: boolean;
    requiresRegistration: boolean;
  };
  securitySettings: {
    enableBlockchain: boolean;
    requireBiometric: boolean;
    allowMobileVoting: boolean;
    enableAuditTrail: boolean;
  };
  candidates: Candidate[];
}

const ElectionCreationWizard: React.FC<ElectionWizardProps> = ({ 
  isOpen, 
  onClose, 
  onCreateElection 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ElectionFormData>({
    title: '',
    description: '',
    type: 'local',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    timezone: 'Asia/Kolkata',
    allowEarlyVoting: false,
    requireVoterVerification: true,
    enableRealTimeResults: false,
    allowProxyVoting: false,
    maxCandidates: 10,
    regions: [],
    state: '',
    district: '',
    voterEligibility: {
      minAge: 18,
      requiresCitizenship: true,
      requiresRegistration: true,
    },
    securitySettings: {
      enableBlockchain: true,
      requireBiometric: true,
      allowMobileVoting: true,
      enableAuditTrail: true,
    },
    candidates: []
  });

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [candidateForm, setCandidateForm] = useState<Candidate>({
    id: '',
    name: '',
    party: '',
    symbol: '',
    color: '#3B82F6',
    description: '',
    manifesto: '',
    image: ''
  });

  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E',
    '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
  ];

  const templates = [
    {
      id: 'national_election',
      name: 'National Election',
      description: 'Parliamentary or presidential election template',
      type: 'national' as const,
      icon: '🏛️',
      settings: {
        allowEarlyVoting: false,
        requireVoterVerification: true,
        enableRealTimeResults: false,
        allowProxyVoting: false,
        maxCandidates: 50,
        securityLevel: 'high'
      }
    },
    {
      id: 'state_election',
      name: 'State Assembly',
      description: 'State legislature election template',
      type: 'state' as const,
      icon: '🏢',
      settings: {
        allowEarlyVoting: true,
        requireVoterVerification: true,
        enableRealTimeResults: true,
        allowProxyVoting: false,
        maxCandidates: 30,
        securityLevel: 'medium'
      }
    },
    {
      id: 'local_election',
      name: 'Local Election',
      description: 'Municipal or local body election template',
      type: 'local' as const,
      icon: '🏘️',
      settings: {
        allowEarlyVoting: true,
        requireVoterVerification: false,
        enableRealTimeResults: true,
        allowProxyVoting: true,
        maxCandidates: 15,
        securityLevel: 'medium'
      }
    },
    {
      id: 'referendum',
      name: 'Referendum',
      description: 'Public referendum or ballot measure template',
      type: 'referendum' as const,
      icon: '📊',
      settings: {
        allowEarlyVoting: true,
        requireVoterVerification: false,
        enableRealTimeResults: true,
        allowProxyVoting: true,
        maxCandidates: 2,
        securityLevel: 'low'
      }
    }
  ];

  const steps = [
    { number: 1, title: 'Basic Information', icon: FileText },
    { number: 2, title: 'Template Selection', icon: Settings },
    { number: 3, title: 'Timeline Setup', icon: Calendar },
    { number: 4, title: 'Voting Rules', icon: Users },
    { number: 5, title: 'Candidates & Parties', icon: UserPlus },
    { number: 6, title: 'Security Settings', icon: Shield },
    { number: 7, title: 'Review & Create', icon: Check },
  ];

  const resetCandidateForm = () => {
    setCandidateForm({
      id: '',
      name: '',
      party: '',
      symbol: '',
      color: '#3B82F6',
      description: '',
      manifesto: '',
      image: ''
    });
    setEditingCandidate(null);
    setShowCandidateForm(false);
  };

  const addCandidate = () => {
    if (!candidateForm.name || !candidateForm.party) return;
    
    const newCandidate: Candidate = {
      ...candidateForm,
      id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    updateFormData({
      candidates: [...formData.candidates, newCandidate]
    });
    resetCandidateForm();
  };

  const updateCandidate = () => {
    if (!editingCandidate || !candidateForm.name || !candidateForm.party) return;
    
    const updatedCandidates = formData.candidates.map(c => 
      c.id === editingCandidate.id ? { ...candidateForm, id: editingCandidate.id } : c
    );
    
    updateFormData({ candidates: updatedCandidates });
    resetCandidateForm();
  };

  const deleteCandidate = (candidateId: string) => {
    updateFormData({
      candidates: formData.candidates.filter(c => c.id !== candidateId)
    });
  };

  const startEditingCandidate = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setCandidateForm({ ...candidate });
    setShowCandidateForm(true);
  };

  const updateFormData = (updates: Partial<ElectionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      updateFormData({
        templateId,
        type: template.type,
        allowEarlyVoting: template.settings.allowEarlyVoting,
        requireVoterVerification: template.settings.requireVoterVerification,
        enableRealTimeResults: template.settings.enableRealTimeResults,
        allowProxyVoting: template.settings.allowProxyVoting,
        maxCandidates: template.settings.maxCandidates,
      });
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onCreateElection(formData);
    onClose();
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.title && formData.description && formData.type;
      case 2:
        return true; // Template is optional
      case 3:
        return formData.startDate && formData.endDate && formData.registrationDeadline;
      case 4:
        return formData.maxCandidates > 0;
      case 5:
        return formData.candidates.length > 0; // At least one candidate required
      case 6:
        return true; // Security settings have defaults
      default:
        return true;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Create New Election</h2>
              <p className="text-blue-100">Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep > step.number
                      ? 'bg-green-500 border-green-500 text-white'
                      : currentStep === step.number
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    {currentStep > step.number ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Election Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Election Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => updateFormData({ title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., General Election 2026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of the election..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State / Region *
                      </label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => updateFormData({ state: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Maharashtra"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        District / City
                      </label>
                      <input
                        type="text"
                        value={formData.district}
                        onChange={(e) => updateFormData({ district: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Mumbai"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Election Type *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { value: 'national', label: 'National', icon: '🏛️', desc: 'Parliamentary/Presidential' },
                        { value: 'state', label: 'State', icon: '🏢', desc: 'State Assembly' },
                        { value: 'local', label: 'Local', icon: '🏘️', desc: 'Municipal/Local Body' },
                        { value: 'referendum', label: 'Referendum', icon: '📊', desc: 'Public Vote' }
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => updateFormData({ type: type.value as 'national' | 'state' | 'local' | 'referendum' })}
                          className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
                            formData.type === type.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <div className="text-2xl mb-2">{type.icon}</div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-600">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Template Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Election Template</h3>
                <p className="text-gray-600 mb-6">Select a pre-configured template or start from scratch</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className={`p-6 border-2 rounded-xl text-left transition-all duration-200 ${
                        formData.templateId === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-3">
                        <span className="text-2xl mr-3">{template.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Early Voting: {template.settings.allowEarlyVoting ? 'Enabled' : 'Disabled'}</div>
                        <div>Real-time Results: {template.settings.enableRealTimeResults ? 'Enabled' : 'Disabled'}</div>
                        <div>Max Candidates: {template.settings.maxCandidates}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Custom Template</h4>
                  <p className="text-sm text-gray-600">Start with default settings and customize as needed</p>
                  <button
                    type="button"
                    onClick={() => updateFormData({ templateId: undefined })}
                    className={`mt-2 px-4 py-2 border rounded-lg transition-colors duration-200 ${
                      !formData.templateId
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    Use Custom Settings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Timeline Setup */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Timeline</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Registration Deadline *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.registrationDeadline}
                        onChange={(e) => updateFormData({ registrationDeadline: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => updateFormData({ timezone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voting Start Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => updateFormData({ startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voting End Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.endDate}
                        onChange={(e) => updateFormData({ endDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allowEarlyVoting"
                      checked={formData.allowEarlyVoting}
                      onChange={(e) => updateFormData({ allowEarlyVoting: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowEarlyVoting" className="ml-2 text-sm text-gray-700">
                      Allow early voting
                    </label>
                  </div>

                  {formData.allowEarlyVoting && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Early Voting Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.earlyVotingStart || ''}
                        onChange={(e) => updateFormData({ earlyVotingStart: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Voting Rules */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Rules & Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">General Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Candidates
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.maxCandidates}
                          onChange={(e) => updateFormData({ maxCandidates: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Voter Eligibility</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Age
                        </label>
                        <input
                          type="number"
                          min="16"
                          max="25"
                          value={formData.voterEligibility.minAge}
                          onChange={(e) => updateFormData({ 
                            voterEligibility: { 
                              ...formData.voterEligibility, 
                              minAge: parseInt(e.target.value) 
                            } 
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="requireCitizenship"
                          checked={formData.voterEligibility.requiresCitizenship}
                          onChange={(e) => updateFormData({ 
                            voterEligibility: { 
                              ...formData.voterEligibility, 
                              requiresCitizenship: e.target.checked 
                            } 
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requireCitizenship" className="ml-2 text-sm text-gray-700">
                          Require citizenship verification
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="requireRegistration"
                          checked={formData.voterEligibility.requiresRegistration}
                          onChange={(e) => updateFormData({ 
                            voterEligibility: { 
                              ...formData.voterEligibility, 
                              requiresRegistration: e.target.checked 
                            } 
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requireRegistration" className="ml-2 text-sm text-gray-700">
                          Require voter registration
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Voting Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="requireVoterVerification"
                          checked={formData.requireVoterVerification}
                          onChange={(e) => updateFormData({ requireVoterVerification: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requireVoterVerification" className="ml-2 text-sm text-gray-700">
                          Require voter identity verification
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="enableRealTimeResults"
                          checked={formData.enableRealTimeResults}
                          onChange={(e) => updateFormData({ enableRealTimeResults: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="enableRealTimeResults" className="ml-2 text-sm text-gray-700">
                          Enable real-time result updates
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="allowProxyVoting"
                          checked={formData.allowProxyVoting}
                          onChange={(e) => updateFormData({ allowProxyVoting: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="allowProxyVoting" className="ml-2 text-sm text-gray-700">
                          Allow proxy voting
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Candidates & Parties */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Manage Candidates & Parties</h3>
                    <p className="text-sm text-gray-600">Add candidates and their party affiliations for this election</p>
                  </div>
                  {!showCandidateForm && (
                    <button
                      type="button"
                      onClick={() => setShowCandidateForm(true)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Candidate
                    </button>
                  )}
                </div>

                {/* Candidate Form */}
                {showCandidateForm && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-4">
                      {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Candidate Name *
                        </label>
                        <input
                          type="text"
                          value={candidateForm.name}
                          onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter candidate name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Party Name *
                        </label>
                        <input
                          type="text"
                          value={candidateForm.party}
                          onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter party name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Party Symbol
                        </label>
                        <input
                          type="text"
                          value={candidateForm.symbol}
                          onChange={(e) => setCandidateForm({ ...candidateForm, symbol: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Lotus, Hand, Broom"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Candidate/Party Image URL
                        </label>
                        <input
                          type="text"
                          value={candidateForm.image}
                          onChange={(e) => setCandidateForm({ ...candidateForm, image: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Party Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {predefinedColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setCandidateForm({ ...candidateForm, color })}
                              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                                candidateForm.color === color 
                                  ? 'border-gray-800 scale-110 ring-2 ring-offset-2 ring-blue-500' 
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <input
                            type="color"
                            value={candidateForm.color}
                            onChange={(e) => setCandidateForm({ ...candidateForm, color: e.target.value })}
                            className="w-8 h-8 rounded-full cursor-pointer"
                            title="Custom color"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={candidateForm.description}
                          onChange={(e) => setCandidateForm({ ...candidateForm, description: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Brief description of the candidate..."
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Manifesto / Key Promises
                        </label>
                        <textarea
                          value={candidateForm.manifesto}
                          onChange={(e) => setCandidateForm({ ...candidateForm, manifesto: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Key promises and manifesto points..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        type="button"
                        onClick={resetCandidateForm}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={editingCandidate ? updateCandidate : addCandidate}
                        disabled={!candidateForm.name || !candidateForm.party}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingCandidate ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Update Candidate
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Candidate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Candidates List */}
                <div className="space-y-3">
                  {formData.candidates.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                      <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Candidates Added</h4>
                      <p className="text-gray-600 mb-4">Add candidates to this election for voters to choose from</p>
                      {!showCandidateForm && (
                        <button
                          type="button"
                          onClick={() => setShowCandidateForm(true)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Candidate
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{formData.candidates.length} candidate(s) added</span>
                        <span>Max allowed: {formData.maxCandidates}</span>
                      </div>
                      {formData.candidates.map((candidate, index) => (
                        <div 
                          key={candidate.id}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                              style={{ backgroundColor: candidate.color }}
                            >
                              {candidate.image ? (
                                <img 
                                  src={candidate.image} 
                                  alt={candidate.name}
                                  className="w-full h-full rounded-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = candidate.name.charAt(0).toUpperCase();
                                  }}
                                />
                              ) : (
                                candidate.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{candidate.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{candidate.party}</span>
                                {candidate.symbol && (
                                  <>
                                    <span>•</span>
                                    <span>Symbol: {candidate.symbol}</span>
                                  </>
                                )}
                              </div>
                              {candidate.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{candidate.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingCandidate(candidate)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                              title="Edit candidate"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCandidate(candidate.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Remove candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {formData.candidates.length >= formData.maxCandidates && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> You have reached the maximum number of candidates ({formData.maxCandidates}). 
                      Increase the limit in Voting Rules if you need to add more.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Security Settings */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Configuration</h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Blockchain & Cryptography</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <label htmlFor="enableBlockchain" className="font-medium text-blue-900">
                            Enable Blockchain Voting
                          </label>
                          <p className="text-sm text-blue-700">Secure votes using blockchain technology</p>
                        </div>
                        <input
                          type="checkbox"
                          id="enableBlockchain"
                          checked={formData.securitySettings.enableBlockchain}
                          onChange={(e) => updateFormData({ 
                            securitySettings: { 
                              ...formData.securitySettings, 
                              enableBlockchain: e.target.checked 
                            } 
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <label htmlFor="enableAuditTrail" className="font-medium text-green-900">
                            Enable Audit Trail
                          </label>
                          <p className="text-sm text-green-700">Maintain complete audit logs</p>
                        </div>
                        <input
                          type="checkbox"
                          id="enableAuditTrail"
                          checked={formData.securitySettings.enableAuditTrail}
                          onChange={(e) => updateFormData({ 
                            securitySettings: { 
                              ...formData.securitySettings, 
                              enableAuditTrail: e.target.checked 
                            } 
                          })}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Authentication</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div>
                          <label htmlFor="requireBiometric" className="font-medium text-purple-900">
                            Require Biometric Authentication
                          </label>
                          <p className="text-sm text-purple-700">Fingerprint, face, or voice verification</p>
                        </div>
                        <input
                          type="checkbox"
                          id="requireBiometric"
                          checked={formData.securitySettings.requireBiometric}
                          onChange={(e) => updateFormData({ 
                            securitySettings: { 
                              ...formData.securitySettings, 
                              requireBiometric: e.target.checked 
                            } 
                          })}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Platform Access</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div>
                          <label htmlFor="allowMobileVoting" className="font-medium text-orange-900">
                            Allow Mobile Voting
                          </label>
                          <p className="text-sm text-orange-700">Enable voting through mobile apps</p>
                        </div>
                        <input
                          type="checkbox"
                          id="allowMobileVoting"
                          checked={formData.securitySettings.allowMobileVoting}
                          onChange={(e) => updateFormData({ 
                            securitySettings: { 
                              ...formData.securitySettings, 
                              allowMobileVoting: e.target.checked 
                            } 
                          })}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Review & Create */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Election Configuration</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Title:</strong> {formData.title}</div>
                      <div><strong>Type:</strong> {formData.type}</div>
                      <div><strong>Description:</strong> {formData.description}</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Registration Deadline:</strong> {new Date(formData.registrationDeadline).toLocaleString()}</div>
                      <div><strong>Voting Period:</strong> {new Date(formData.startDate).toLocaleString()} - {new Date(formData.endDate).toLocaleString()}</div>
                      <div><strong>Early Voting:</strong> {formData.allowEarlyVoting ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Candidates & Parties ({formData.candidates.length})</h4>
                    {formData.candidates.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {formData.candidates.map((candidate, index) => (
                          <div key={candidate.id} className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-white rounded border">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: candidate.color }}
                            >
                              {candidate.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium">{candidate.name}</span>
                              <span className="text-gray-400"> • </span>
                              <span>{candidate.party}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-red-500">No candidates added. Please go back and add candidates.</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Security Settings</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Blockchain:</strong> {formData.securitySettings.enableBlockchain ? 'Enabled' : 'Disabled'}</div>
                      <div><strong>Biometric Auth:</strong> {formData.securitySettings.requireBiometric ? 'Required' : 'Optional'}</div>
                      <div><strong>Mobile Voting:</strong> {formData.securitySettings.allowMobileVoting ? 'Allowed' : 'Disabled'}</div>
                      <div><strong>Audit Trail:</strong> {formData.securitySettings.enableAuditTrail ? 'Enabled' : 'Disabled'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Create Election
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ElectionCreationWizard;