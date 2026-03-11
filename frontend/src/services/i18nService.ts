export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const supportedLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' }
];

export const translations = {
  en: {
    // Landing Page
    title: 'VoteLink',
    subtitle: 'Secure, Transparent, and Accessible Digital Voting Platform',
    startVoting: 'Start Voting',
    learnMore: 'Learn More',
    whyChoose: 'Why Choose VoteLink?',
    howItWorks: 'How VoteLink Works',
    securityTransparency: 'Security & Transparency',
    
    // Features
    secureVoting: 'Secure Voting',
    secureVotingDesc: 'End-to-end encryption with biometric verification ensures your vote is protected',
    transparentProcess: 'Transparent Process',
    transparentProcessDesc: 'Real-time monitoring and audit trails for complete transparency',
    accessibleDesign: 'Accessible Design',
    accessibleDesignDesc: 'Full accessibility support for voters with disabilities',
    remoteVoting: 'Remote Voting',
    remoteVotingDesc: 'Vote securely from anywhere with proper identity verification',
    
    // Authentication
    loginTitle: 'Login to VoteLink',
    loginSubtitle: 'Your Secure Digital Voting Platform',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email',
    mobileLabel: 'Mobile Number',
    mobilePlaceholder: 'Enter your mobile number',
    continueGoogle: 'Continue with Google',
    demoMode: 'Demo Mode (Skip Auth)',
    
    // Voting Steps
    registerVerify: 'Register & Verify',
    registerVerifyDesc: 'Upload your Voter ID and complete identity verification',
    authentication: 'Authentication',
    authenticationDesc: 'Multi-factor authentication with OTP verification',
    castVote: 'Cast Your Vote',
    castVoteDesc: 'Select your candidate and confirm your choice',
    verificationReceipt: 'Verification Receipt',
    verificationReceiptDesc: 'Get your digital voting certificate',
    
    // Instructions
    votingInstructions: 'Voting Instructions',
    instructionsSubtitle: 'Please read carefully before proceeding to vote',
    votingRules: 'Voting Rules',
    voteSecrecy: 'Vote Secrecy',
    securityGuidelines: 'Security Guidelines',
    accessibilitySupport: 'Accessibility Support',
    proceedToVoting: 'Proceed to Voting',
    
    // Voting Interface
    selectParty: 'Select Your Political Party',
    selectPartyDesc: 'Choose your preferred political party by clicking on their card. Review your selection carefully before casting your vote.',
    confirmVote: 'Confirm Your Vote',
    reviewSelection: 'Please review your selection carefully',
    importantNotice: 'Important Notice:',
    cannotUndo: 'This action cannot be undone. You will only be able to vote once.',
    cancel: 'Cancel',
    
    // Common
    voter: 'Voter',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    next: 'Next',
    back: 'Back',
    submit: 'Submit',
    confirm: 'Confirm',
    
    // Language selector
    selectLanguage: 'Select Language',
    moreLanguages: 'More languages coming soon...',
    
    // Help & Support
    needHelp: 'Need Help?',
    needHelpDesc: 'We\'re here to assist you throughout the voting process',
    voterHelpline: 'Voter Helpline',
    voterHelplineDesc: 'Call our 24/7 support helpline for immediate assistance',
    accessibilityHelpline: 'Accessibility Support',
    accessibilityHelplineDesc: 'Specialized assistance for voters with disabilities',
    onlineSupport: 'Online Support',
    onlineSupportDesc: 'Live chat support and comprehensive FAQ'
  },
  
  hi: {
    // Landing Page
    title: 'वोटलिंक',
    subtitle: 'सुरक्षित, पारदर्शी और सुलभ डिजिटल मतदान मंच',
    startVoting: 'मतदान शुरू करें',
    learnMore: 'और जानें',
    whyChoose: 'वोटलिंक क्यों चुनें?',
    howItWorks: 'वोटलिंक कैसे काम करता है',
    securityTransparency: 'सुरक्षा और पारदर्शिता',
    
    // Features
    secureVoting: 'सुरक्षित मतदान',
    secureVotingDesc: 'बायोमेट्रिक सत्यापन के साथ एंड-टू-एंड एन्क्रिप्शन आपके वोट की सुरक्षा सुनिश्चित करता है',
    transparentProcess: 'पारदर्शी प्रक्रिया',
    transparentProcessDesc: 'पूर्ण पारदर्शिता के लिए रीयल-टाइम निगरानी और ऑडिट ट्रेल्स',
    accessibleDesign: 'सुलभ डिज़ाइन',
    accessibleDesignDesc: 'विकलांग मतदाताओं के लिए पूर्ण पहुंच सहायता',
    remoteVoting: 'रिमोट वोटिंग',
    remoteVotingDesc: 'उचित पहचान सत्यापन के साथ कहीं से भी सुरक्षित रूप से वोट करें',
    
    // Authentication
    loginTitle: 'वोटलिंक में लॉगिन करें',
    loginSubtitle: 'आपका सुरक्षित डिजिटल मतदान मंच',
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    mobileLabel: 'मोबाइल नंबर',
    mobilePlaceholder: 'अपना मोबाइल नंबर दर्ज करें',
    continueGoogle: 'गूगल के साथ जारी रखें',
    demoMode: 'डेमो मोड (प्रमाणीकरण छोड़ें)',
    
    // Voting Steps
    registerVerify: 'पंजीकरण और सत्यापन',
    registerVerifyDesc: 'अपनी वोटर आईडी अपलोड करें और पहचान सत्यापन पूरा करें',
    authentication: 'प्रमाणीकरण',
    authenticationDesc: 'ओटीपी सत्यापन के साथ बहु-कारक प्रमाणीकरण',
    castVote: 'अपना वोट डालें',
    castVoteDesc: 'अपने उम्मीदवार का चयन करें और अपनी पसंद की पुष्टि करें',
    verificationReceipt: 'सत्यापन रसीद',
    verificationReceiptDesc: 'अपना डिजिटल मतदान प्रमाणपत्र प्राप्त करें',
    
    // Instructions
    votingInstructions: 'मतदान निर्देश',
    instructionsSubtitle: 'कृपया मतदान के लिए आगे बढ़ने से पहले ध्यान से पढ़ें',
    votingRules: 'मतदान नियम',
    voteSecrecy: 'वोट गुप्तता',
    securityGuidelines: 'सुरक्षा दिशानिर्देश',
    accessibilitySupport: 'पहुंच सहायता',
    proceedToVoting: 'मतदान के लिए आगे बढ़ें',
    
    // Voting Interface
    selectParty: 'अपनी राजनीतिक पार्टी का चयन करें',
    selectPartyDesc: 'उनके कार्ड पर क्लिक करके अपनी पसंदीदा राजनीतिक पार्टी चुनें। अपना वोट डालने से पहले अपने चयन की सावधानीपूर्वक समीक्षा करें।',
    confirmVote: 'अपने वोट की पुष्टि करें',
    reviewSelection: 'कृपया अपने चयन की सावधानीपूर्वक समीक्षा करें',
    importantNotice: 'महत्वपूर्ण सूचना:',
    cannotUndo: 'इस कार्य को पूर्ववत नहीं किया जा सकता। आप केवल एक बार वोट कर सकेंगे।',
    cancel: 'रद्द करें',
    
    // Common
    voter: 'मतदाता',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    next: 'अगला',
    back: 'वापस',
    submit: 'जमा करें',
    confirm: 'पुष्टि करें',
    
    // Language selector
    selectLanguage: 'भाषा चुनें',
    moreLanguages: 'और भाषाएं जल्द ही आने वाली हैं...',
    
    // Help & Support
    needHelp: 'मदद चाहिए?',
    needHelpDesc: 'हम पूरी मतदान प्रक्रिया के दौरान आपकी सहायता के लिए यहाँ हैं',
    voterHelpline: 'मतदाता हेल्पलाइन',
    voterHelplineDesc: 'तत्काल सहायता के लिए हमारी 24/7 सहायता हेल्पलाइन पर कॉल करें',
    accessibilityHelpline: 'पहुंच सहायता',
    accessibilityHelplineDesc: 'विकलांग मतदाताओं के लिए विशेष सहायता',
    onlineSupport: 'ऑनलाइन सहायता',
    onlineSupportDesc: 'लाइव चैट सहायता और व्यापक FAQ'
  },

  gu: {
    title: 'વોટલિંક',
    subtitle: 'સુરક્ષિત, પારદર્શક અને સુલભ ડિજિટલ મતદાન પ્લેટફોર્મ',
    startVoting: 'મતદાન શરૂ કરો',
    learnMore: 'વધુ જાણો',
    whyChoose: 'વોટલિંક કેમ પસંદ કરો?',
    howItWorks: 'વોટલિંક કેવી રીતે કામ કરે છે',
    securityTransparency: 'સુરક્ષા અને પારદર્શિતા',
    secureVoting: 'સુરક્ષિત મતદાન',
    secureVotingDesc: 'બાયોમેટ્રિક ચકાસણી સાથે એન્ડ-ટુ-એન્ડ એન્ક્રિપ્શન તમારા મતને સુરક્ષિત કરે છે',
    transparentProcess: 'પારદર્શક પ્રક્રિયા',
    transparentProcessDesc: 'સંપૂર્ણ પારદર્શિતા માટે રીઅલ-ટાઇમ મોનિટરિંગ અને ઓડિટ ટ્રેઇલ્સ',
    accessibleDesign: 'સુલભ ડિઝાઇન',
    accessibleDesignDesc: 'વિકલાંગ મતદારો માટે સંપૂર્ણ સુલભ સહાય',
    remoteVoting: 'રિમોટ વોટિંગ',
    remoteVotingDesc: 'યોગ્ય ઓળખ ચકાસણી સાથે ગમે ત્યાંથી સુરક્ષિત રીતે મત આપો',
    loginTitle: 'વોટલિંકમાં લૉગ ઇન કરો',
    loginSubtitle: 'તમારું સુરક્ષિત ડિજિટલ મતદાન પ્લેટફોર્મ',
    emailLabel: 'ઇમેઇલ સરનામું',
    emailPlaceholder: 'તમારો ઇમેઇલ દાખલ કરો',
    mobileLabel: 'મોબાઇલ નંબર',
    mobilePlaceholder: 'તમારો મોબાઇલ નંબર દાખલ કરો',
    continueGoogle: 'Google સાથે ચાલુ રાખો',
    demoMode: 'ડેમો મોડ (Auth છોડો)',
    registerVerify: 'નોંધણી અને ચકાસણી',
    registerVerifyDesc: 'તમારી વોટર ID અપલોડ કરો અને ઓળખ ચકાસણી પૂર્ણ કરો',
    authentication: 'પ્રમાણીકરણ',
    authenticationDesc: 'OTP ચકાસણી સાથે બહુ-પરિબળ પ્રમાણીકરણ',
    castVote: 'તમારો મત આપો',
    castVoteDesc: 'તમારા ઉમેદવારની પસંદ કરો અને તમારી પસંદગી કન્ફર્મ કરો',
    verificationReceipt: 'ચકાસણી રસીદ',
    verificationReceiptDesc: 'તમારું ડિજિટલ મતદાન પ્રમાણપત્ર મેળવો',
    votingInstructions: 'મતદાન સૂચનાઓ',
    instructionsSubtitle: 'કૃપા કરીને આગળ વધતા પહેલાં કાળજીપૂર્વક વાંચો',
    votingRules: 'મતદાન નિયમો',
    voteSecrecy: 'મત ગોપનીયતા',
    securityGuidelines: 'સુરક્ષા માર્ગદર્શિકા',
    accessibilitySupport: 'સુલભ સહાય',
    proceedToVoting: 'મતદાન માટે આગળ વધો',
    selectParty: 'તમારો રાજકીય પક્ષ પસંદ કરો',
    selectPartyDesc: 'તેમના કાર્ડ પર ક્લિક કરીને તમારો પ્રિય રાજકીય પક્ષ પસંદ કરો. તમારો મત આપતા પહેલાં તમારી પસંદગીની કાળજીપૂર્વક સમીક્ષા કરો.',
    confirmVote: 'તમારો મત કન્ફર્મ કરો',
    reviewSelection: 'કૃપા કરીને તમારી પસંદગીની કાળજીપૂર્વક સમીક્ષા કરો',
    importantNotice: 'મહત્વની સૂચના:',
    cannotUndo: 'આ ક્રિયા પૂર્વવત્ કરી શકાતી નથી. તમે ફક્ત એક જ વાર મત આપી શકશો.',
    cancel: 'રદ કરો',
    voter: 'મતદાર',
    loading: 'લોડ થઈ રહ્યું છે...',
    error: 'ભૂલ',
    success: 'સફળ',
    next: 'આગળ',
    back: 'પાછળ',
    submit: 'સબમિટ કરો',
    confirm: 'કન્ફર્મ કરો',
    selectLanguage: 'ભાષા પસંદ કરો',
    moreLanguages: 'વધુ ભાષાઓ ટૂંક સમયમાં...',
    needHelp: 'મદદ જોઈએ?',
    needHelpDesc: 'સમગ્ર મતદાન પ્રક્રિયા દરમ્યાન અમે તમારી સહાય કરવા અહીં છીએ',
    voterHelpline: 'મતદાર હેલ્પલાઇન',
    voterHelplineDesc: 'તાત્કાલિક સહાય માટે 24/7 સહાય હેલ્પલાઇન પર કૉલ કરો',
    accessibilityHelpline: 'સુલભ સહાય',
    accessibilityHelplineDesc: 'વિકલાંગ મતદારો માટે વિશેષ સહાય',
    onlineSupport: 'ઓનલાઇન સહાય',
    onlineSupportDesc: 'લાઇવ ચૅટ સહાય અને વ્યાપક FAQ'
  },

  mr: {
    title: 'व्होटलिंक',
    subtitle: 'सुरक्षित, पारदर्शक आणि सुलभ डिजिटल मतदान व्यासपीठ',
    startVoting: 'मतदान सुरू करा',
    learnMore: 'अधिक जाणून घ्या',
    whyChoose: 'व्होटलिंक का निवडा?',
    howItWorks: 'व्होटलिंक कसे कार्य करते',
    securityTransparency: 'सुरक्षा आणि पारदर्शकता',
    secureVoting: 'सुरक्षित मतदान',
    secureVotingDesc: 'बायोमेट्रिक सत्यापनासह एंड-टू-एंड एन्क्रिप्शन तुमचे मत सुरक्षित करते',
    transparentProcess: 'पारदर्शक प्रक्रिया',
    transparentProcessDesc: 'संपूर्ण पारदर्शकतेसाठी रिअल-टाइम देखरेख आणि ऑडिट ट्रेल्स',
    accessibleDesign: 'सुलभ रचना',
    accessibleDesignDesc: 'अपंग मतदारांसाठी संपूर्ण प्रवेशयोग्यता समर्थन',
    remoteVoting: 'रिमोट मतदान',
    remoteVotingDesc: 'योग्य ओळख सत्यापनासह कुठूनही सुरक्षितपणे मत द्या',
    loginTitle: 'व्होटलिंकमध्ये लॉगिन करा',
    loginSubtitle: 'तुमचे सुरक्षित डिजिटल मतदान व्यासपीठ',
    emailLabel: 'ईमेल पत्ता',
    emailPlaceholder: 'तुमचा ईमेल प्रविष्ट करा',
    mobileLabel: 'मोबाइल नंबर',
    mobilePlaceholder: 'तुमचा मोबाइल नंबर प्रविष्ट करा',
    continueGoogle: 'Google सह सुरू ठेवा',
    demoMode: 'डेमो मोड (Auth वगळा)',
    registerVerify: 'नोंदणी आणि सत्यापन',
    registerVerifyDesc: 'तुमची मतदार ओळखपत्र अपलोड करा आणि ओळख सत्यापन पूर्ण करा',
    authentication: 'प्रमाणीकरण',
    authenticationDesc: 'OTP सत्यापनासह बहु-घटक प्रमाणीकरण',
    castVote: 'तुमचे मत द्या',
    castVoteDesc: 'तुमच्या उमेदवाराची निवड करा आणि तुमची निवड निश्चित करा',
    verificationReceipt: 'सत्यापन पावती',
    verificationReceiptDesc: 'तुमचे डिजिटल मतदान प्रमाणपत्र मिळवा',
    votingInstructions: 'मतदान सूचना',
    instructionsSubtitle: 'कृपया मतदानापूर्वी काळजीपूर्वक वाचा',
    votingRules: 'मतदान नियम',
    voteSecrecy: 'मत गुप्तता',
    securityGuidelines: 'सुरक्षा मार्गदर्शक तत्त्वे',
    accessibilitySupport: 'प्रवेशयोग्यता समर्थन',
    proceedToVoting: 'मतदानासाठी पुढे जा',
    selectParty: 'तुमचा राजकीय पक्ष निवडा',
    selectPartyDesc: 'त्यांच्या कार्डावर क्लिक करून तुमचा आवडता पक्ष निवडा. मत देण्यापूर्वी तुमची निवड काळजीपूर्वक तपासा.',
    confirmVote: 'तुमचे मत निश्चित करा',
    reviewSelection: 'कृपया तुमची निवड काळजीपूर्वक तपासा',
    importantNotice: 'महत्त्वाची सूचना:',
    cannotUndo: 'ही क्रिया पूर्ववत करता येणार नाही. तुम्ही फक्त एकदाच मत देऊ शकाल.',
    cancel: 'रद्द करा',
    voter: 'मतदार',
    loading: 'लोड होत आहे...',
    error: 'त्रुटी',
    success: 'यश',
    next: 'पुढे',
    back: 'मागे',
    submit: 'सबमिट करा',
    confirm: 'निश्चित करा',
    selectLanguage: 'भाषा निवडा',
    moreLanguages: 'अधिक भाषा लवकरच...',
    needHelp: 'मदत हवी आहे?',
    needHelpDesc: 'संपूर्ण मतदान प्रक्रियेदरम्यान आम्ही तुमच्या मदतीसाठी येथे आहोत',
    voterHelpline: 'मतदार हेल्पलाइन',
    voterHelplineDesc: 'त्वरित सहाय्यासाठी 24/7 समर्थन हेल्पलाइनला कॉल करा',
    accessibilityHelpline: 'प्रवेशयोग्यता समर्थन',
    accessibilityHelplineDesc: 'अपंग मतदारांसाठी विशेष सहाय्य',
    onlineSupport: 'ऑनलाइन समर्थन',
    onlineSupportDesc: 'लाइव्ह चॅट समर्थन आणि सर्वसमावेशक FAQ'
  },

  ta: {
    title: 'வோட்லிங்க்',
    subtitle: 'பாதுகாப்பான, வெளிப்படையான மற்றும் அணுகக்கூடிய டிஜிட்டல் வாக்களிப்பு தளம்',
    startVoting: 'வாக்களிப்பை தொடங்கவும்',
    learnMore: 'மேலும் அறியவும்',
    whyChoose: 'வோட்லிங்க்கை ஏன் தேர்வு செய்ய வேண்டும்?',
    howItWorks: 'வோட்லிங்க் எவ்வாறு செயல்படுகிறது',
    securityTransparency: 'பாதுகாப்பு & வெளிப்படைத்தன்மை',
    secureVoting: 'பாதுகாப்பான வாக்களிப்பு',
    secureVotingDesc: 'பயோமெட்ரிக் சரிபார்ப்புடன் எண்ட்-டு-எண்ட் குறியாக்கம் உங்கள் வாக்கை பாதுகாக்கிறது',
    transparentProcess: 'வெளிப்படையான செயல்முறை',
    transparentProcessDesc: 'முழுமையான வெளிப்படைத்தன்மைக்கு நிகழ்நேர கண்காணிப்பு மற்றும் ஆடிட் திரைகள்',
    accessibleDesign: 'அணுகக்கூடிய வடிவமைப்பு',
    accessibleDesignDesc: 'மாற்றுத்திறனாளி வாக்காளர்களுக்கு முழு அணுகல் ஆதரவு',
    remoteVoting: 'தொலைநிலை வாக்களிப்பு',
    remoteVotingDesc: 'சரியான அடையாள சரிபார்ப்புடன் எங்கிருந்தும் பாதுகாப்பாக வாக்களிக்கவும்',
    loginTitle: 'வோட்லிங்க்கில் உள்நுழைக',
    loginSubtitle: 'உங்கள் பாதுகாப்பான டிஜிட்டல் வாக்களிப்பு தளம்',
    emailLabel: 'மின்னஞ்சல் முகவரி',
    emailPlaceholder: 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
    mobileLabel: 'மொபைல் எண்',
    mobilePlaceholder: 'உங்கள் மொபைல் எண்ணை உள்ளிடவும்',
    continueGoogle: 'Google உடன் தொடரவும்',
    demoMode: 'டெமோ முறை (Auth தவிர்க்கவும்)',
    registerVerify: 'பதிவுசெய்து சரிபார்க்கவும்',
    registerVerifyDesc: 'வாக்காளர் அடையாள அட்டையை பதிவேற்றவும் மற்றும் அடையாள சரிபார்ப்பை முடிக்கவும்',
    authentication: 'அங்கீகாரம்',
    authenticationDesc: 'OTP சரிபார்ப்புடன் பல-காரணி அங்கீகாரம்',
    castVote: 'உங்கள் வாக்கை அளிக்கவும்',
    castVoteDesc: 'உங்கள் வேட்பாளரை தேர்வுசெய்து தேர்வை உறுதிப்படுத்தவும்',
    verificationReceipt: 'சரிபார்ப்பு ரசீது',
    verificationReceiptDesc: 'உங்கள் டிஜிட்டல் வாக்களிப்பு சான்றிதழை பெறவும்',
    votingInstructions: 'வாக்களிப்பு வழிமுறைகள்',
    instructionsSubtitle: 'தொடர்வதற்கு முன் கவனமாகப் படிக்கவும்',
    votingRules: 'வாக்களிப்பு விதிகள்',
    voteSecrecy: 'வாக்கு இரகசியம்',
    securityGuidelines: 'பாதுகாப்பு வழிகாட்டுதல்கள்',
    accessibilitySupport: 'அணுகல் ஆதரவு',
    proceedToVoting: 'வாக்களிப்பிற்கு தொடரவும்',
    selectParty: 'உங்கள் அரசியல் கட்சியை தேர்வுசெய்யவும்',
    selectPartyDesc: 'கட்டையில் கிளிக் செய்வதன் மூலம் விருப்பமான கட்சியை தேர்வுசெய்யவும். வாக்களிப்பதற்கு முன் தேர்வை கவனமாக மதிப்பாய்வு செய்யவும்.',
    confirmVote: 'உங்கள் வாக்கை உறுதிப்படுத்தவும்',
    reviewSelection: 'தேர்வை கவனமாக மதிப்பாய்வு செய்யவும்',
    importantNotice: 'முக்கிய அறிவிப்பு:',
    cannotUndo: 'இந்த செயலை செயல்தவிர்க்க முடியாது. நீங்கள் ஒரு முறை மட்டுமே வாக்களிக்க முடியும்.',
    cancel: 'ரத்துசெய்',
    voter: 'வாக்காளர்',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    success: 'வெற்றி',
    next: 'அடுத்து',
    back: 'பின்',
    submit: 'சமர்ப்பிக்கவும்',
    confirm: 'உறுதிப்படுத்தவும்',
    selectLanguage: 'மொழியை தேர்வுசெய்யவும்',
    moreLanguages: 'மேலும் மொழிகள் விரைவில்...',
    needHelp: 'உதவி வேண்டுமா?',
    needHelpDesc: 'வாக்களிப்பு செயல்முறை முழுவதும் உங்களுக்கு உதவ இங்கே இருக்கிறோம்',
    voterHelpline: 'வாக்காளர் உதவி எண்',
    voterHelplineDesc: 'உடனடி உதவிக்கு 24/7 ஆதரவு உதவி எண்ணை அழைக்கவும்',
    accessibilityHelpline: 'அணுகல் ஆதரவு',
    accessibilityHelplineDesc: 'மாற்றுத்திறனாளி வாக்காளர்களுக்கு சிறப்பு உதவி',
    onlineSupport: 'ஆன்லைன் ஆதரவு',
    onlineSupportDesc: 'நேரடி அரட்டை ஆதரவு மற்றும் விரிவான FAQ'
  },

  te: {
    title: 'వోట్‌లింక్',
    subtitle: 'సురక్షిత, పారదర్శక మరియు అందుబాటులో ఉండే డిజిటల్ ఓటింగ్ వేదిక',
    startVoting: 'ఓటింగ్ ప్రారంభించండి',
    learnMore: 'మరింత తెలుసుకోండి',
    whyChoose: 'వోట్‌లింక్‌ను ఎందుకు ఎంచుకోవాలి?',
    howItWorks: 'వోట్‌లింక్ ఎలా పని చేస్తుంది',
    securityTransparency: 'భద్రత & పారదర్శకత',
    secureVoting: 'సురక్షిత ఓటింగ్',
    secureVotingDesc: 'బయోమెట్రిక్ ధృవీకరణతో ఎండ్-టు-ఎండ్ గుప్తీకరణ మీ ఓటును రక్షిస్తుంది',
    transparentProcess: 'పారదర్శక ప్రక్రియ',
    transparentProcessDesc: 'పూర్తి పారదర్శకత కోసం రియల్-టైమ్ పర్యవేక్షణ మరియు ఆడిట్ ట్రెయిల్స్',
    accessibleDesign: 'అందుబాటు డిజైన్',
    accessibleDesignDesc: 'వికలాంగ ఓటర్లకు పూర్తి అందుబాటు మద్దతు',
    remoteVoting: 'రిమోట్ ఓటింగ్',
    remoteVotingDesc: 'సరైన గుర్తింపు ధృవీకరణతో ఎక్కడి నుండైనా సురక్షితంగా ఓటు వేయండి',
    loginTitle: 'వోట్‌లింక్‌లో లాగిన్ అవ్వండి',
    loginSubtitle: 'మీ సురక్షిత డిజిటల్ ఓటింగ్ వేదిక',
    emailLabel: 'ఇమెయిల్ చిరునామా',
    emailPlaceholder: 'మీ ఇమెయిల్ నమోదు చేయండి',
    mobileLabel: 'మొబైల్ నంబర్',
    mobilePlaceholder: 'మీ మొబైల్ నంబర్ నమోదు చేయండి',
    continueGoogle: 'Google తో కొనసాగించండి',
    demoMode: 'డెమో మోడ్ (Auth దాటవేయండి)',
    registerVerify: 'నమోదు & ధృవీకరణ',
    registerVerifyDesc: 'ఓటర్ ID అప్‌లోడ్ చేసి గుర్తింపు ధృవీకరణ పూర్తి చేయండి',
    authentication: 'ప్రమాణీకరణ',
    authenticationDesc: 'OTP ధృవీకరణతో బహు-కారకాల ప్రమాణీకరణ',
    castVote: 'మీ ఓటు వేయండి',
    castVoteDesc: 'మీ అభ్యర్థిని ఎంచుకోండి మరియు ఎంపికను నిర్ధారించండి',
    verificationReceipt: 'ధృవీకరణ రసీదు',
    verificationReceiptDesc: 'మీ డిజిటల్ ఓటింగ్ సర్టిఫికెట్ పొందండి',
    votingInstructions: 'ఓటింగ్ సూచనలు',
    instructionsSubtitle: 'కొనసాగించే ముందు జాగ్రత్తగా చదవండి',
    votingRules: 'ఓటింగ్ నియమాలు',
    voteSecrecy: 'ఓటు రహస్యం',
    securityGuidelines: 'భద్రతా మార్గదర్శకాలు',
    accessibilitySupport: 'అందుబాటు మద్దతు',
    proceedToVoting: 'ఓటింగ్‌కు కొనసాగండి',
    selectParty: 'మీ రాజకీయ పార్టీని ఎంచుకోండి',
    selectPartyDesc: 'కార్డుపై క్లిక్ చేయడం ద్వారా నచ్చిన పార్టీని ఎంచుకోండి. ఓటు వేసే ముందు ఎంపికను జాగ్రత్తగా సమీక్షించండి.',
    confirmVote: 'మీ ఓటును నిర్ధారించండి',
    reviewSelection: 'మీ ఎంపికను జాగ్రత్తగా సమీక్షించండి',
    importantNotice: 'ముఖ్యమైన నోటీసు:',
    cannotUndo: 'ఈ చర్యను రద్దు చేయలేరు. మీరు ఒక్కసారి మాత్రమే ఓటు వేయగలరు.',
    cancel: 'రద్దు',
    voter: 'ఓటరు',
    loading: 'లోడ్ అవుతోంది...',
    error: 'లోపం',
    success: 'విజయం',
    next: 'తదుపరి',
    back: 'వెనుకకు',
    submit: 'సబ్మిట్ చేయండి',
    confirm: 'నిర్ధారించండి',
    selectLanguage: 'భాషను ఎంచుకోండి',
    moreLanguages: 'మరిన్ని భాషలు త్వరలో...',
    needHelp: 'సహాయం కావాలా?',
    needHelpDesc: 'ఓటింగ్ ప్రక్రియ అంతటా మీకు సహాయం చేయడానికి మేము ఇక్కడ ఉన్నాము',
    voterHelpline: 'ఓటరు హెల్ప్‌లైన్',
    voterHelplineDesc: 'తక్షణ సహాయం కోసం 24/7 మద్దతు హెల్ప్‌లైన్‌కు కాల్ చేయండి',
    accessibilityHelpline: 'అందుబాటు మద్దతు',
    accessibilityHelplineDesc: 'వికలాంగ ఓటర్లకు ప్రత్యేక సహాయం',
    onlineSupport: 'ఆన్‌లైన్ మద్దతు',
    onlineSupportDesc: 'లైవ్ చాట్ మద్దతు మరియు సమగ్ర FAQ'
  },

  bn: {
    title: 'ভোটলিংক',
    subtitle: 'নিরাপদ, স্বচ্ছ এবং অ্যাক্সেসযোগ্য ডিজিটাল ভোটিং প্ল্যাটফর্ম',
    startVoting: 'ভোটিং শুরু করুন',
    learnMore: 'আরও জানুন',
    whyChoose: 'ভোটলিংক কেন বেছে নেবেন?',
    howItWorks: 'ভোটলিংক কীভাবে কাজ করে',
    securityTransparency: 'নিরাপত্তা ও স্বচ্ছতা',
    secureVoting: 'নিরাপদ ভোটিং',
    secureVotingDesc: 'বায়োমেট্রিক যাচাইকরণ সহ এন্ড-টু-এন্ড এনক্রিপশন আপনার ভোট সুরক্ষিত রাখে',
    transparentProcess: 'স্বচ্ছ প্রক্রিয়া',
    transparentProcessDesc: 'সম্পূর্ণ স্বচ্ছতার জন্য রিয়েল-টাইম পর্যবেক্ষণ এবং অডিট ট্রেইলস',
    accessibleDesign: 'অ্যাক্সেসযোগ্য ডিজাইন',
    accessibleDesignDesc: 'প্রতিবন্ধী ভোটারদের জন্য সম্পূর্ণ অ্যাক্সেসিবিলিটি সহায়তা',
    remoteVoting: 'রিমোট ভোটিং',
    remoteVotingDesc: 'সঠিক পরিচয় যাচাইকরণ সহ যেকোনো জায়গা থেকে নিরাপদে ভোট দিন',
    loginTitle: 'ভোটলিংকে লগইন করুন',
    loginSubtitle: 'আপনার নিরাপদ ডিজিটাল ভোটিং প্ল্যাটফর্ম',
    emailLabel: 'ইমেইল ঠিকানা',
    emailPlaceholder: 'আপনার ইমেইল লিখুন',
    mobileLabel: 'মোবাইল নম্বর',
    mobilePlaceholder: 'আপনার মোবাইল নম্বর লিখুন',
    continueGoogle: 'Google দিয়ে চালিয়ে যান',
    demoMode: 'ডেমো মোড (Auth এড়িয়ে যান)',
    registerVerify: 'নিবন্ধন ও যাচাইকরণ',
    registerVerifyDesc: 'ভোটার আইডি আপলোড করুন এবং পরিচয় যাচাইকরণ সম্পন্ন করুন',
    authentication: 'প্রমাণীকরণ',
    authenticationDesc: 'OTP যাচাইকরণ সহ মাল্টি-ফ্যাক্টর প্রমাণীকরণ',
    castVote: 'আপনার ভোট দিন',
    castVoteDesc: 'আপনার প্রার্থী নির্বাচন করুন এবং পছন্দ নিশ্চিত করুন',
    verificationReceipt: 'যাচাইকরণ রসিদ',
    verificationReceiptDesc: 'আপনার ডিজিটাল ভোটিং সার্টিফিকেট পান',
    votingInstructions: 'ভোটিং নির্দেশিকা',
    instructionsSubtitle: 'অনুগ্রহ করে এগিয়ে যাওয়ার আগে সাবধানে পড়ুন',
    votingRules: 'ভোটিং নিয়মাবলী',
    voteSecrecy: 'ভোটের গোপনীয়তা',
    securityGuidelines: 'নিরাপত্তা নির্দেশিকা',
    accessibilitySupport: 'অ্যাক্সেসিবিলিটি সহায়তা',
    proceedToVoting: 'ভোটিংয়ের জন্য এগিয়ে যান',
    selectParty: 'আপনার রাজনৈতিক দল নির্বাচন করুন',
    selectPartyDesc: 'কার্ডে ক্লিক করে পছন্দের রাজনৈতিক দল নির্বাচন করুন। ভোট দেওয়ার আগে পছন্দ সাবধানে পর্যালোচনা করুন।',
    confirmVote: 'আপনার ভোট নিশ্চিত করুন',
    reviewSelection: 'আপনার পছন্দ সাবধানে পর্যালোচনা করুন',
    importantNotice: 'গুরুত্বপূর্ণ নোটিশ:',
    cannotUndo: 'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। আপনি শুধুমাত্র একবার ভোট দিতে পারবেন।',
    cancel: 'বাতিল',
    voter: 'ভোটার',
    loading: 'লোড হচ্ছে...',
    error: 'ত্রুটি',
    success: 'সফল',
    next: 'পরবর্তী',
    back: 'পিছনে',
    submit: 'জমা দিন',
    confirm: 'নিশ্চিত করুন',
    selectLanguage: 'ভাষা নির্বাচন করুন',
    moreLanguages: 'আরও ভাষা শীঘ্রই...',
    needHelp: 'সাহায্য দরকার?',
    needHelpDesc: 'ভোটিং প্রক্রিয়া জুড়ে আমরা আপনাকে সহায়তা করতে এখানে আছি',
    voterHelpline: 'ভোটার হেল্পলাইন',
    voterHelplineDesc: 'তাৎক্ষণিক সহায়তার জন্য 24/7 সাপোর্ট হেল্পলাইনে কল করুন',
    accessibilityHelpline: 'অ্যাক্সেসিবিলিটি সহায়তা',
    accessibilityHelplineDesc: 'প্রতিবন্ধী ভোটারদের জন্য বিশেষ সহায়তা',
    onlineSupport: 'অনলাইন সহায়তা',
    onlineSupportDesc: 'লাইভ চ্যাট সহায়তা এবং ব্যাপক FAQ'
  }
};

export class I18nService {
  private currentLanguage: string = 'en';
  private translations = translations;

  setLanguage(languageCode: string) {
    const isSupported = supportedLanguages.some(l => l.code === languageCode);
    if (!isSupported) return;

    this.currentLanguage = languageCode;
    localStorage.setItem('selectedLanguage', languageCode);
    document.documentElement.lang = languageCode;

    const rtlLanguages = ['ar', 'ur', 'he'];
    document.documentElement.dir = rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: languageCode } }));
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  getTranslation(key: string): string {
    const langTranslations = this.translations[this.currentLanguage as keyof typeof translations];
    const value = langTranslations?.[key as keyof typeof langTranslations];
    if (value) return value as string;
    // Fallback to English instead of returning the raw key
    const enTranslations = this.translations['en'];
    return (enTranslations?.[key as keyof typeof enTranslations] as string) ?? key;
  }

  getSupportedLanguages() {
    return supportedLanguages;
  }

  initializeLanguage() {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    const browserLanguage = navigator.language.split('-')[0];
    const defaultLanguage = savedLanguage || 
      (this.translations[browserLanguage as keyof typeof translations] ? browserLanguage : 'en');
    
    this.setLanguage(defaultLanguage);
  }
}

export const i18nService = new I18nService();