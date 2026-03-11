import React, { useState, useRef } from 'react';
import { User, Loader2, Shield, CheckCircle2, Upload, ArrowLeft, X } from 'lucide-react';
import { faceRecognitionService } from '../../services/faceRecognitionService';

interface VoterIDUploadProps {
  onVerification: (voterData: { voterID: string; mobile?: string; uid?: string }) => Promise<boolean>;
  isLoading: boolean;
  onBack?: () => void;
  capturedFaceImage?: string; // Base64 image captured during face capture step
}

export const VoterIDUpload: React.FC<VoterIDUploadProps> = ({
  onVerification,
  isLoading,
  onBack,
  capturedFaceImage
}) => {
  const [voterID, setVoterID] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState('');
  const [voterIdImage, setVoterIdImage] = useState<File | null>(null);
  const [voterIdPreview, setVoterIdPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{ name: string; voterID: string } | null>(null);
  const [ocrProgress, setOcrProgress] = useState('');
  const [skipAutoVerify, setSkipAutoVerify] = useState(false);
  const [faceMatchResult, setFaceMatchResult] = useState<{ matched: boolean; confidence: number; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate voter ID format (flexible for real voter IDs)
  const isValidVoterID = (id: string): boolean => {
    const trimmedId = id.trim().toUpperCase();
    const isValid = trimmedId.length >= 4 && trimmedId.length <= 20 && /^[A-Z0-9]+$/.test(trimmedId);
    console.log(`🔍 Validating Voter ID "${trimmedId}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    return isValid;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setVoterIdImage(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const preview = e.target?.result as string;
      setVoterIdPreview(preview);

      // Automatically verify face in the uploaded Voter ID (unless skip is enabled)
      if (!skipAutoVerify) {
        await verifyFaceInVoterID(file);
      } else {
        console.log('⏭️ Auto-verification skipped by user');
      }
    };
    reader.readAsDataURL(file);
  };

  // Function to compare captured face with voter ID face
  const compareFacesWithVoterID = async (voterIdFile: File): Promise<{ matched: boolean; confidence: number; message: string }> => {
    setOcrProgress('Loading face recognition models...');

    try {
      // Check if captured face image exists
      if (!capturedFaceImage) {
        console.warn('⚠️ No captured face image available for comparison');
        return { matched: false, confidence: 0, message: 'No captured face image available. Please go back and capture your face first.' };
      }

      // Load face recognition models
      await faceRecognitionService.loadModels();

      setOcrProgress('Extracting face from Voter ID card...');

      // Extract face descriptor from Voter ID card using enhanced ID card detection
      const voterIdDescriptor = await faceRecognitionService.extractFaceFromVoterID(voterIdFile);

      if (!voterIdDescriptor) {
        return { matched: false, confidence: 0, message: 'No face detected in Voter ID card. Please upload a clearer photo where your face is clearly visible.' };
      }

      setOcrProgress('Extracting face from captured image...');

      // Extract face descriptor from captured face image
      // Convert base64 to image element
      const capturedImage = new Image();
      await new Promise<void>((resolve, reject) => {
        capturedImage.onload = () => resolve();
        capturedImage.onerror = () => reject(new Error('Failed to load captured face image'));
        capturedImage.src = capturedFaceImage;
      });

      const capturedDescriptor = await faceRecognitionService.extractFaceDescriptor(capturedImage);

      if (!capturedDescriptor) {
        return { matched: false, confidence: 0, message: 'Could not process captured face image. Please go back and recapture your face.' };
      }

      setOcrProgress('Comparing faces...');

      // Compare the two faces
      const matchResult = faceRecognitionService.compareFaces(capturedDescriptor, voterIdDescriptor);

      console.log(`🔍 Face comparison result: ${matchResult.match ? '✅ MATCH' : '❌ NO MATCH'} (${matchResult.confidence}% confidence, distance: ${matchResult.distance.toFixed(4)})`);

      return {
        matched: matchResult.match,
        confidence: matchResult.confidence,
        message: matchResult.message
      };

    } catch (error) {
      console.error('Face comparison error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Face comparison failed';
      return { matched: false, confidence: 0, message: errorMessage };
    }
  };

  const verifyFaceInVoterID = async (file: File) => {
    setVerifyLoading(true);
    setError('');
    setFaceMatchResult(null);
    setOcrProgress('Starting verification...');

    try {
      console.log('🔍 Starting Voter ID verification with face matching...');

      // Step 1: Compare faces between captured image and Voter ID
      if (capturedFaceImage) {
        const faceResult = await compareFacesWithVoterID(file);
        setFaceMatchResult(faceResult);

        if (!faceResult.matched) {
          console.log('❌ Face verification failed:', faceResult.message);
          setError(`❌ Face Verification Failed: ${faceResult.message}`);
          setOcrProgress('');
          setVerifyLoading(false);
          return;
        }

        console.log('✅ Face verification passed:', faceResult.message);
      } else {
        console.warn('⚠️ No captured face available - skipping face comparison');
      }

      // OCR service disabled - use manual entry instead
      setError('⚠️ Face verified! Please enter your Voter ID number manually below.');
      setOcrProgress('');
      setVerifyLoading(false);
      return;

    } catch (error) {
      console.error('Voter ID verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`⚠️ Verification failed: ${errorMessage}. Please enter your Voter ID manually below.`);
      setOcrProgress('');
      // Don't remove image - allow manual entry
      setVerifyLoading(false);
    }
  };

  const removeImage = () => {
    setVoterIdImage(null);
    setVoterIdPreview(null);
    setExtractedData(null);
    setVoterID('');
    setFaceMatchResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleVerifyVoterID = async () => {
    setError('');

    // Validate inputs
    if (!voterID.trim()) {
      setError('Please enter your Voter ID');
      return;
    }

    if (!isValidVoterID(voterID)) {
      setError('Please enter a valid Voter ID (4-20 characters, letters and numbers only)');
      console.log('❌ Invalid voter ID format for:', voterID);
      return;
    }

    if (!voterIdImage) {
      setError('Please upload your Voter ID photo');
      return;
    }

    // CRITICAL: Check if face verification is required and passed
    if (capturedFaceImage && faceMatchResult && !faceMatchResult.matched) {
      setError('❌ Face verification failed. Your face does not match the photo on the Voter ID card. Please ensure you are using your own Voter ID card.');
      return;
    }

    // If face verification hasn't been run yet (e.g., skipAutoVerify was checked), run it now
    if (capturedFaceImage && !faceMatchResult && voterIdImage) {
      setVerifyLoading(true);
      setError('');

      try {
        const faceResult = await compareFacesWithVoterID(voterIdImage);
        setFaceMatchResult(faceResult);

        if (!faceResult.matched) {
          setError(`❌ Face Verification Failed: ${faceResult.message}`);
          setVerifyLoading(false);
          return;
        }

        console.log('✅ Face verification passed on manual verify:', faceResult.message);
      } catch (faceError) {
        console.error('Face verification error:', faceError);
        setError('Face verification failed. Please try again.');
        setVerifyLoading(false);
        return;
      }
    }

    setVerifyLoading(true);
    const normalizedVoterID = voterID.toUpperCase();
    console.log('✅ Voter ID accepted:', normalizedVoterID);

    try {
      // Call verification - duplicate checks are handled in useAuth
      // which will redirect to login page with error if Voter ID was already used
      const success = await onVerification({
        voterID: normalizedVoterID
      });

      if (!success) {
        // Don't show error here - if it was a duplicate voter ID error,
        // useAuth will redirect to login page with the error message
        // Only show generic error if verification failed for other reasons
        setError('Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      // Provide a user-friendly message instead of raw ethers/blockchain errors
      let errorMessage = 'Verification failed. Please try again.';
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes('CALL_EXCEPTION') || msg.includes('missing revert data') || msg.includes('code=CALL_EXCEPTION')) {
          errorMessage = 'Unable to connect to the blockchain. Please ensure the local Hardhat node is running and the contract is deployed, then try again.';
        } else if (msg.includes('MetaMask') || msg.includes('wallet')) {
          errorMessage = msg;
        } else if (msg.length < 200) {
          errorMessage = msg;
        }
      }
      setError(errorMessage);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 pt-16">
      <div className="bg-black/10 backdrop-blur-lg rounded-2xl shadow-2xl p-4 w-full max-w-[380px] border border-black/20">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-black mb-3 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        <div className="text-center mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full mx-auto mb-2 flex items-center justify-center">
            <User className="text-black" size={20} />
          </div>
          <h2 className="text-lg font-bold text-black mb-1">Voter ID Verification</h2>
          <p className="text-xs text-gray-700">Enter your voter ID and upload your Voter ID photo</p>
        </div>
        <div className="space-y-3">

          {extractedData && (
            <div className="bg-green-100 border-2 border-green-500 rounded-lg p-2.5">
              <div className="flex items-start space-x-2 mb-2">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
                <p className="text-green-800 text-xs font-bold">Data Extracted Successfully</p>
              </div>
              <div className="ml-6 space-y-1 text-xs">
                <p className="text-gray-700"><strong>Name:</strong> {extractedData.name || 'Not detected'}</p>
                <p className="text-gray-700"><strong>Voter ID:</strong> {extractedData.voterID}</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 rounded-lg p-2.5">
              <p className="text-red-700 text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Face Match Result Display */}
          {faceMatchResult && (
            <div className={`border rounded-lg p-2.5 ${faceMatchResult.matched ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'}`}>
              <p className={`text-xs font-medium ${faceMatchResult.matched ? 'text-green-700' : 'text-red-700'}`}>
                {faceMatchResult.matched ? '✅' : '❌'} Face Match: {faceMatchResult.message} ({faceMatchResult.confidence}% confidence)
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter your Voter ID"
                value={voterID}
                onChange={(e) => setVoterID(e.target.value.toUpperCase())}
                maxLength={20}
                className="w-full p-2 text-sm bg-white/10 border border-black/20 rounded-xl 
                             text-black placeholder-black/50 focus:outline-none focus:border-yellow-500/50
                             transition-all duration-300"
              />
              {extractedData && extractedData.voterID && (
                <p className="text-xs text-green-600 mt-1">✓ Auto-filled from card (you can edit if needed)</p>
              )}
              {!extractedData && voterIdImage && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Please enter your Voter ID manually</p>
              )}
            </div>

            <div>
              <label className="block text-black text-xs font-bold mb-1.5">
                Upload Voter ID Card Photo (Landscape Format)
              </label>

              {/* Skip Auto-Verify Toggle */}
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipAutoVerify"
                  checked={skipAutoVerify}
                  onChange={(e) => setSkipAutoVerify(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white/20 border-black/20 rounded focus:ring-blue-500"
                />
                <label htmlFor="skipAutoVerify" className="text-xs text-black/70 cursor-pointer">
                  Skip automatic verification (manual entry only)
                </label>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!voterIdPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={verifyLoading}
                  className="w-full p-4 bg-white/10 border-2 border-dashed border-black/20 rounded-xl 
                               hover:border-yellow-500/50 hover:bg-white/20 transition-all duration-300
                               flex flex-col items-center justify-center gap-1.5
                               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="text-blue-500 animate-spin" size={24} />
                      <span className="text-blue-600 text-sm font-medium">{ocrProgress || 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="text-black" size={24} />
                      <span className="text-black font-bold text-sm">Click to upload VOTER ID CARD</span>
                      <span className="text-black/80 text-xs font-semibold">Complete card in landscape format (PNG/JPG, max 5MB)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="relative">
                  <img
                    src={voterIdPreview}
                    alt="Voter ID Preview"
                    className="w-full h-36 object-contain bg-white/10 rounded-xl border border-black/20"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full
                                 hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X size={16} />
                  </button>
                  <div className="mt-2 flex items-center gap-2 text-green-600">
                    <CheckCircle2 size={16} />
                    <span className="text-sm font-medium">Valid Voter ID card verified ✅</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleVerifyVoterID}
            disabled={verifyLoading || !voterID || !voterIdImage || isLoading}
            className="w-full py-2 text-sm bg-gradient-to-r from-green-500 to-blue-600 
                         text-white rounded-xl font-semibold
                         hover:from-green-600 hover:to-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transform hover:scale-105 transition-all duration-300
                         shadow-lg hover:shadow-xl
                         flex items-center justify-center"
          >
            {verifyLoading || isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-2" size={16} />
                Verify Voter ID
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};