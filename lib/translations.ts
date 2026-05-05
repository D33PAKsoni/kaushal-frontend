// UI string translations — Kannada and English only
export type Lang = "kn" | "en";

export const T = {
  // Language selector page
  selectLanguage: {
    kn: "ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ",
    en: "Select Language",
  },
  languageSubtitle: {
    kn: "ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆ ಆರಿಸಿ",
    en: "Choose your preferred language",
  },
  kannada: { kn: "ಕನ್ನಡ", en: "Kannada" },
  english: { kn: "English", en: "English" },
  continue: { kn: "ಮುಂದೆ", en: "Continue" },

  // Registration page
  registration: { kn: "ನೋಂದಣಿ", en: "Registration" },
  name: { kn: "ಹೆಸರು", en: "Name" },
  namePlaceholder: { kn: "ನಿಮ್ಮ ಹೆಸರು ಟೈಪ್ ಮಾಡಿ", en: "Type your name" },
  trade: { kn: "ವೃತ್ತಿ", en: "Trade" },
  tradePlaceholder: { kn: "ವೃತ್ತಿ ಆಯ್ಕೆ ಮಾಡಿ", en: "Select your trade" },
  district: { kn: "ಜಿಲ್ಲೆ", en: "District" },
  districtPlaceholder: { kn: "ಜಿಲ್ಲೆ ಆಯ್ಕೆ ಮಾಡಿ", en: "Select your district" },
  electrician: { kn: "ಎಲೆಕ್ಟ್ರಿಷಿಯನ್", en: "Electrician" },
  plumber: { kn: "ಪ್ಲಂಬರ್", en: "Plumber" },
  fillAllFields: {
    kn: "ದಯವಿಟ್ಟು ಎಲ್ಲಾ ಮಾಹಿತಿ ತುಂಬಿರಿ",
    en: "Please fill all fields",
  },
  connectionError: {
    kn: "ಸಂಪರ್ಕ ದೋಷ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    en: "Connection error. Please try again.",
  },
  pleaseWait: { kn: "ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ...", en: "Please wait..." },
  back: { kn: "ಹಿಂದೆ", en: "Back" },

  // Interview page
  interviewStart: {
    kn: "ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಿ",
    en: "Start Interview",
  },
  readyQuestion: {
    kn: "ಸಂದರ್ಶನ ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧರಿದ್ದೀರಾ?",
    en: "Ready to start the interview?",
  },
  enableCamera: {
    kn: "ಕ್ಯಾಮೆರಾ ಮತ್ತು ಮೈಕ್ ಆನ್ ಮಾಡಿ",
    en: "Enable camera and microphone",
  },
  quietPlace: {
    kn: "ಶಾಂತ ಸ್ಥಳದಲ್ಲಿ ಕುಳಿತುಕೊಳ್ಳಿ",
    en: "Sit in a quiet place",
  },
  eightQuestions: {
    kn: "8 ಪ್ರಶ್ನೆಗಳು · ~8 ನಿಮಿಷ",
    en: "8 questions · ~8 minutes",
  },
  listeningLabel: { kn: "ಕೇಳುತ್ತಿದ್ದೇನೆ...", en: "Listening..." },
  questionPlaying: { kn: "ಪ್ರಶ್ನೆ ಕೇಳಿ...", en: "Playing question..." },
  yourAnswer: { kn: "ನಿಮ್ಮ ಉತ್ತರ:", en: "Your answer:" },
  analyzing: { kn: "ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...", en: "Analysing..." },
  submitAnswer: { kn: "ಉತ್ತರ ಸಲ್ಲಿಸಿ", en: "Submit Answer" },
  speaking: { kn: "ಮಾತನಾಡಿ...", en: "Speak now..." },
  skipQuestion: { kn: "ಪ್ರಶ್ನೆ ಬಿಟ್ಟು · ಉತ್ತರಿಸಿ", en: "Skip · Answer" },
  previousAnswers: { kn: "ಹಿಂದಿನ ಉತ್ತರಗಳು", en: "Previous answers" },
  interviewComplete: { kn: "ಸಂದರ್ಶನ ಮುಗಿದಿದೆ", en: "Interview Complete" },
  questionsAnswered: { kn: "ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲಾಗಿದೆ", en: "questions answered" },
  averageScore: { kn: "ಸರಾಸರಿ ಸ್ಕೋರ್", en: "Average score" },
  scoringInProgress: {
    kn: "ಸ್ಕೋರಿಂಗ್ ನಡೆಯುತ್ತಿದೆ... ಫಲಿತಾಂಶ ಶೀಘ್ರದಲ್ಲಿ.",
    en: "Scoring in progress... Results coming soon.",
  },
  thankYou: { kn: "ನಿಮ್ಮ ಸಮಯಕ್ಕೆ ಧನ್ಯವಾದ", en: "Thank you for your time" },
  home: { kn: "ಮುಖಪುಟ", en: "Home" },

  // Stage labels
  stageBackground: { kn: "ಹಿನ್ನೆಲೆ", en: "Background" },
  stageL1: { kn: "ಮೂಲ ಕೌಶಲ", en: "Core Skills" },
  stageL2: { kn: "ಸುಧಾರಿತ", en: "Advanced" },
  stageSituational: { kn: "ಸನ್ನಿವೇಶ", en: "Situational" },
  stageClosing: { kn: "ಮುಕ್ತಾಯ", en: "Closing" },

  // Opening question
  openingQuestion: {
    kn: "ನಮಸ್ಕಾರ! ಕೌಶಲ ಮಿತ್ರ ಸಂದರ್ಶನಕ್ಕೆ ಸ್ವಾಗತ. ನಿಮ್ಮ ಕೆಲಸದ ಅನುಭವದ ಬಗ್ಗೆ ಹೇಳಿ.",
    en: "Welcome to the KaushalMitra interview. Please tell me about your work experience.",
  },
} as const;

export const t = (key: keyof typeof T, lang: Lang): string => {
  return T[key][lang] ?? T[key]["en"];
};
