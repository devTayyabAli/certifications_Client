// Response shapes of the live certifications API (certifications-server.vercel.app/api/v1),
// taken from real responses. Kept identical so screens can be pointed at the real API.

export interface User {
  id: string;
  email: string;
  role: string;
  walletAddress: string | null;
  isEmailVerified: boolean;
}

export interface Profile {
  name: string;
  role: string;
  organization: string;
  socialLink: string;
  bio: string;
  photoUrl: string;
  prefilledFields?: string[];
}

export interface Prefill {
  prefilledFields: string[];
  name?: string;
  role?: string;
  organization?: string;
  socialLink?: string;
}

export interface Me {
  user: User;
  profile: Profile | null;
}

export interface WalletStatus {
  connected: boolean;
  address: string | null;
  chainId: string | null;
  network: string | null;
  isOnBase: boolean;
}

export type Part1Status = 'not_started' | 'draft' | 'completed';

export interface Part1Card {
  stepLabel: string;
  title: string;
  description: string;
  imageUrl: string;
  doneMessage: string;
  questionCount: number;
  questionsMinutes: number;
  videoMinutes: number;
}

export interface OnboardStatus {
  part1Done: boolean;
  part1Status: Part1Status;
  part1CompletedAt: string | null;
  part2Done: boolean;
  part2CompletedAt: string | null;
  part2Unlocked: boolean;
  part1Card: Part1Card;
}

export interface Part1Question {
  id: string;
  order: number;
  question: string;
  placeholder: string;
  hint: string;
  maxLength: number;
  required: boolean;
}

export interface Part1Social {
  id: string;
  order: number;
  platform: 'x' | 'linkedin';
  label: string;
  handle: string;
  url: string;
  required: boolean;
}

export interface Part1Progress {
  status: Part1Status;
  videoWatched: boolean;
  followedSocialIds: string[];
  answers: Record<string, string>;
  completedAt: string | null;
}

export interface Part1 {
  content: {
    part: string;
    stepLabel: string;
    card: { title: string; description: string; imageUrl: string; doneMessage: string };
    page: { title: string; subtitle: string };
    video: { url: string; posterUrl: string; caption: string; minutes: number };
    questionsMinutes: number;
    tasks: { video: string; socials: string; questions: string };
    socialsHeading: string;
    taskNote: string;
    questionsHeader: string;
    questionsIntro: string;
    completion: { title: string; message: string; nextStepNote: string };
    questions: Part1Question[];
    socials: Part1Social[];
  };
  progress: Part1Progress;
}

export interface Speaker {
  name: string;
  role?: string;
  companyName?: string;
  companyTag?: string;
  headshotUrl?: string;
  companyLogoUrl?: string;
  bio?: string;
  [k: string]: unknown;
}

export interface ModuleQuizSummary {
  available: boolean;
  isOpen: boolean;
  questionCount: number;
  passingScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  isPassed: boolean;
  isSkipped?: boolean;
}

export interface Module {
  id: string;
  slug: string;
  title: string;
  week: number;
  dateLabel: string;
  tag: string;
  presenter: string;
  partnerName: string;
  companyTag: string;
  description: string;
  aboutText: string[];
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  videoUrl: string | null;
  chapters: { time: string; title: string; _id?: string }[];
  scheduledDate: string;
  endDate: string;
  location: string;
  liveLink: string | null;
  sessionState: 'upcoming' | 'live' | 'recorded' | string;
  sessionStatus: string;
  isPrerequisiteForCertificate: boolean;
  isCompleted: boolean;
  badge: { name: string; image: string };
  quiz: ModuleQuizSummary;
  isScheduled: boolean;
  scheduledProvider: string | null;
  speakers: Speaker[];
}

export interface QuizQuestion {
  questionNumber: number;
  questionText: string;
  options: { key: string; text: string }[];
}

export interface QuizHint {
  timestamp: string;
  title?: string;
}

export interface QuizAnswer {
  attemptNumber: number;
  questionNumber: number;
  selectedOption: string;
  isCorrect: boolean;
  explanation?: string;
  hint?: QuizHint | null;
  result?: QuizResult;
}

export interface QuizResult {
  passed: boolean;
  score: number;
  totalQuestions: number;
  passingScore: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  retryAvailableAt: string | null;
  badgeEarned: { name: string; image: string } | null;
  certificateUnlocked: boolean;
  review: { questionNumber: number; questionText: string; hint?: QuizHint | null }[];
}

export interface Quiz {
  quizId: string;
  moduleSlug: string;
  title: string;
  isOpen: boolean;
  sessionState: string;
  maxAttempts: number;
  passingScore: number;
  totalQuestions: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  retryAvailableAt: string | null;
  retryAfterHours: number;
  isPassed: boolean;
  /** skipped after using every attempt: no badge, but counts as done for the certificate */
  isSkipped?: boolean;
  badge: { name: string; image: string };
  questions: QuizQuestion[];
  currentAttempt: { attemptNumber: number; answers: QuizAnswer[] } | null;
  lastResult: QuizResult | null;
}

export interface EarnedBadge {
  id: string;
  slug: string;
  moduleSlug: string;
  week: number;
  name: string;
  image: string;
  partnerName: string;
  earnedAt: string;
  moduleTitle?: string;
}

export interface Badges {
  totalCohortBadges: number;
  earnedCount: number;
  badges: EarnedBadge[];
}

export interface Certificate {
  status: 'locked' | 'earned' | 'minted' | string;
  recipientName: string;
  walletAddress: string | null;
  issuedAt: string | null;
  verificationCode: string | null;
  verifyUrl: string | null;
  unlockModule: { week: number; title: string; slug: string } | null;
  content: {
    programName: string;
    cohortLabel: string;
    cohortDates: string;
    statement: string;
    issuerName: string;
    issuerTagline: string;
    presenterName: string;
    presenterTagline: string;
    credentialName: string;
    linkedinOrganizationName: string;
    linkedinOrganizationId: string | null;
    shareText: string;
  };
  badges: EarnedBadge[];
  totalBadges: number;
  stillOpen: { week: number; title: string; slug: string }[];
  onChain: {
    enabled: boolean;
    network: string;
    chainId: number;
    contractAddress: string | null;
    tokenId: string | null;
    txHash: string | null;
    mintedAt: string | null;
    explorerUrl: string | null;
  };
  canMint: boolean;
}

export interface Settings {
  emailNotifications: boolean;
  onChainVerificationPrivacy: boolean;
}

export interface Partner {
  id: string;
  order: number;
  title: string;
  tag: string;
  description: string;
  imageUrl: string | null;
  actionText: string;
  actionUrl: string;
  footerText: string;
}

/** A cohort event that isn't a module (no quiz, no badge), e.g. a LinkedIn Live. Shown in the sessions list by date. */
export interface CohortEvent {
  id: string;
  kind: 'linkedin-live' | string;
  title: string;
  subtitle?: string;
  /** start time; the date is what's shown while `timeTba` is true */
  date: string;
  endDate?: string;
  timeTba?: boolean;
  partnerName?: string;
  speakers?: Speaker[];
  /** where "Join on LinkedIn" goes (the LinkedIn event page) */
  link: string;
  linkIsPlaceholder?: boolean;
}

/** Onboarding Part 2: a short close-out reflection, opens once every session and quiz is done. */
export interface Part2 {
  title: string;
  subtitle: string;
  /** written by the SI<3> team in the CMS: any number, any order */
  questions: { id: string; question: string; hint?: string; placeholder?: string; required: boolean }[];
  unlocked: boolean;
  progress: { answers: Record<string, string>; completedAt: string | null };
}
