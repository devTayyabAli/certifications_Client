/**
 * Si Her DeFi API Client
 * Enterprise client for communication with Express / MongoDB backend.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const AUTH_TOKEN_KEY = "siherdefi_auth_token";
export const AUTH_USER_KEY = "siherdefi_auth_user";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  // The token is sent only as a Bearer header — never as a cookie
  clearLegacyTokenCookie();
}

/** Older builds also kept the token in a readable cookie; remove it. */
function clearLegacyTokenCookie() {
  try {
    document.cookie = "siherdefi_token=; path=/; max-age=0; SameSite=Lax";
  } catch {
    // ignore in restricted envs
  }
}

export function getAuthUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthUser(user: any): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
  clearLegacyTokenCookie();
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Drops every piece of learner state this app keeps in the browser (token,
 * profile, wallet, cohort progress). Run on sign-out and before a new sign-in
 * so one learner's data never carries over to the next on a shared browser.
 */
export function clearLocalSession(): void {
  if (typeof window === "undefined") return;
  clearAuth();
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("siherdefi_")) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage.removeItem("siherdefi_dev_code");
  } catch {
    // storage unavailable (private mode) — nothing to clear
  }
}

export type OnboardingRoute = "/profile" | "/wallet" | "/dashboard";

/**
 * The next screen a signed-in learner still has to complete, in flow order:
 * profile (name) → wallet → dashboard. Read from the backend so it holds
 * across devices and can't be skipped by typing a URL.
 */
export function nextOnboardingRoute(state: {
  name?: string | null;
  walletAddress?: string | null;
}): OnboardingRoute {
  if (!state.name?.trim()) return "/profile";
  if (!state.walletAddress) return "/wallet";
  return "/dashboard";
}

export async function fetchNextOnboardingRoute(): Promise<OnboardingRoute> {
  const { user, profile } = await authApi.getMe();
  return nextOnboardingRoute({
    name: profile?.name,
    walletAddress: user?.walletAddress,
  });
}

export class ApiErrorResponse extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = "ApiErrorResponse";
    this.statusCode = statusCode;
    this.data = data;
  }
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // non-json response
  }

  if (!response.ok) {
    // An expired or revoked session: drop it and send the learner back to
    // sign in, instead of leaving every page silently failing.
    if (
      response.status === 401 &&
      token &&
      typeof window !== "undefined" &&
      !endpoint.startsWith("/auth/verify-otp")
    ) {
      clearLocalSession();
      // Full reload on purpose: also resets in-memory stores and providers
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }

    const errorMsg =
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`;
    throw new ApiErrorResponse(errorMsg, response.status, payload);
  }

  return (payload?.data !== undefined ? payload.data : payload) as T;
}

export const authApi = {
  /**
   * Request 6-digit OTP to claim seat.
   * Only pre-registered cohort applicants or allowed users will succeed.
   */
  async claimSeat(email: string) {
    return request<{ email: string; expiresInMinutes: number; devCode?: string }>(
      "/auth/claim-seat",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    );
  },

  /**
   * Verify 6-digit OTP code and retrieve session token & user info.
   */
  async verifyOtp(email: string, code: string) {
    return request<{
      token: string;
      user: {
        id: string;
        email: string;
        role: string;
        walletAddress?: string;
        isEmailVerified: boolean;
      };
      profile: {
        name: string;
        role: string;
        organization: string;
        socialLink: string;
        bio: string;
        photoUrl: string | null;
        prefilledFields: string[];
      };
    }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      }),
    });
  },

  /**
   * Resend 6-digit OTP code to applicant's email.
   */
  async resendOtp(email: string) {
    return request<{ email: string; expiresInMinutes: number; devCode?: string }>(
      "/auth/resend-otp",
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }
    );
  },

  /**
   * Fetch authenticated user's current session and profile.
   */
  async getMe() {
    return request<{
      user: any;
      profile: any;
    }>("/auth/me", {
      method: "GET",
    });
  },

  /**
   * Logout current user.
   */
  async logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Signing out locally still counts even if the server can't be reached
    } finally {
      clearLocalSession();
    }
  },
};

export interface ProfileData {
  name: string;
  role?: string;
  organization?: string;
  socialLink?: string;
  bio?: string;
  photoUrl?: string | null;
  prefilledFields?: string[];
}

export const profileApi = {
  /**
   * Fetch user's profile from the backend
   */
  async getProfile() {
    return request<ProfileData>("/profile", {
      method: "GET",
    });
  },

  /**
   * Update user's profile on the backend
   */
  async updateProfile(updates: Partial<ProfileData> & { name: string }) {
    // Only send fields the caller set, so saving one field never blanks the
    // others (e.g. a bio pre-filled from the application).
    const body: Partial<ProfileData> = { name: updates.name };
    if (updates.role !== undefined) body.role = updates.role;
    if (updates.organization !== undefined) body.organization = updates.organization;
    if (updates.socialLink !== undefined) body.socialLink = updates.socialLink;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (updates.photoUrl !== undefined) body.photoUrl = updates.photoUrl;

    return request<ProfileData>("/profile", {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * Fetch prefill suggestions from initial application
   */
  async getPrefill() {
    return request<{
      prefilledFields: string[];
      name: string;
      role: string;
      organization: string;
    }>("/profile/prefill", {
      method: "GET",
    });
  },
};

export interface WalletStatusResponse {
  connected: boolean;
  address: string | null;
  chainId: string | null;
  network: string | null;
  isOnBase: boolean;
}

export interface ConnectWalletResponse {
  address: string;
  chainId: string;
  network: string;
  isOnBase: boolean;
}

export const walletApi = {
  /**
   * Get current wallet connection status for the authenticated user
   */
  async getStatus() {
    return request<WalletStatusResponse>("/wallet/status", {
      method: "GET",
    });
  },

  /**
   * Connect and persist a Base wallet address to the user's account
   */
  async connect(address: string, chainId: string | number = "0x2105", signature?: string) {
    return request<ConnectWalletResponse>("/wallet/connect", {
      method: "POST",
      body: JSON.stringify({
        address,
        chainId,
        signature,
      }),
    });
  },

  /**
   * Unlink/disconnect wallet from the user's account
   */
  async disconnect() {
    return request<{ disconnected: boolean }>("/wallet/disconnect", {
      method: "DELETE",
    });
  },

  /**
   * Request cryptographic signing nonce
   */
  async getNonce() {
    return request<{ nonce: string; message: string }>("/wallet/nonce", {
      method: "POST",
    });
  },
};

export interface SpeakerItem {
  id?: string;
  name: string;
  role: string;
  companyTag: string;
  companyName: string;
  headshotUrl?: string;
  additionalImageUrl?: string;
  companyLogoUrl?: string;
  bio?: string;
  sessionTitle?: string;
  sessionDescription?: string;
  sessionDate?: string;
  telegramHandle?: string;
  links: {
    website?: string;
    x?: string;
    linkedin?: string;
  };
}

/**
 * upcoming   — before the live session
 * live       — during the live session
 * recorded   — the recording is published
 * processing — the live session is over, the recording isn't up yet
 */
export type SessionState = "upcoming" | "live" | "recorded" | "processing";

export interface ModuleQuizSummary {
  available: boolean;
  /** The quiz opens once the session has taken place */
  isOpen: boolean;
  questionCount: number;
  passingScore?: number;
  maxAttempts: number;
  attemptsUsed: number;
  isPassed: boolean;
}

export interface ModuleItem {
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
  bannerUrl?: string | null;
  videoUrl: string | null;
  chapters: { time: string; title: string }[];
  scheduledDate: string | null;
  endDate: string | null;
  location?: string;
  liveLink: string | null;
  sessionState: SessionState;
  sessionStatus: "completed" | "live" | "upcoming";
  isPrerequisiteForCertificate: boolean;
  isCompleted: boolean;
  badge: { name: string; image: string };
  quiz: ModuleQuizSummary;
  isScheduled: boolean;
  scheduledProvider: "google" | "apple" | "outlook" | "proton" | "other" | null;
  speakers: SpeakerItem[];
}

export const modulesApi = {
  /**
   * Get all cohort learning modules with personal completion and schedule status
   */
  async getAll() {
    return request<ModuleItem[]>("/modules", {
      method: "GET",
    });
  },

  /**
   * Fetch live CMS cohort speakers directly from CMS database
   */
  async getCmsSpeakers() {
    return request<SpeakerItem[]>("/modules/cms/speakers", {
      method: "GET",
    });
  },

  /**
   * Get single module details by slug or ID
   */
  async getOne(slugOrId: string) {
    return request<ModuleItem>(`/modules/${slugOrId}`, {
      method: "GET",
    });
  },

  /**
   * Schedule a module live session to Google or Apple calendar
   */
  async schedule(
    slugOrId: string,
    calendarType: "google" | "apple" | "outlook" | "proton" | "other" = "google",
  ) {
    return request<any>(`/modules/${slugOrId}/schedule`, {
      method: "POST",
      body: JSON.stringify({ calendarType }),
    });
  },

  /**
   * Remove schedule for a module session
   */
  async unschedule(slugOrId: string) {
    return request<any>(`/modules/${slugOrId}/schedule`, {
      method: "DELETE",
    });
  },
};

/** Certificate wording — managed in the CMS (Si Her DeFi (Base) → Certificate). */
export interface CertificateContent {
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
}

export interface CertificateBadge {
  name: string;
  image: string;
  week: number | null;
  moduleTitle: string | null;
  earnedAt?: string;
}

export interface CertificateOnChain {
  /** False until the certificate contract is configured */
  enabled: boolean;
  network: string;
  chainId: number;
  contractAddress: string | null;
  tokenId: string | null;
  txHash: string | null;
  mintedAt: string | null;
  explorerUrl: string | null;
}

export interface CertificateData {
  status: "locked" | "unlocked" | "minted";
  recipientName: string;
  walletAddress: string | null;
  /** When the certificate was earned (null while locked) */
  issuedAt: string | null;
  verificationCode: string | null;
  verifyUrl: string | null;
  /** The module whose quiz unlocks the certificate */
  unlockModule: { week: number; title: string; slug: string } | null;
  content: CertificateContent;
  badges: CertificateBadge[];
  totalBadges: number;
  /** Modules with an open quiz the learner hasn't passed yet */
  stillOpen: { week: number; title: string; slug: string }[];
  onChain: CertificateOnChain;
  canMint: boolean;
}

/** What anyone with the code sees on the public verification page. */
export interface PublicCertificate {
  isValid: true;
  verificationCode: string;
  recipientName: string;
  nameHidden: boolean;
  status: "unlocked" | "minted";
  issuedAt: string;
  content: CertificateContent;
  badges: CertificateBadge[];
  totalBadges: number;
  onChain: CertificateOnChain;
}

export const certificateApi = {
  /**
   * The learner's certificate: status, wording, earned badges, verification link
   */
  async getCertificate() {
    return request<CertificateData>("/certificate", {
      method: "GET",
    });
  },

  /**
   * Public verification by the code printed on the certificate (no sign-in)
   */
  async verifyPublic(code: string) {
    return request<PublicCertificate>(`/certificate/verify/${encodeURIComponent(code)}`, {
      method: "GET",
    });
  },
};

export interface UserSettings {
  emailNotifications: boolean;
  onChainVerificationPrivacy: boolean;
}

export const settingsApi = {
  /**
   * Fetch current user preferences from backend
   */
  async getSettings() {
    return request<UserSettings>("/settings", {
      method: "GET",
    });
  },

  /**
   * Update user preferences in backend
   */
  async updateSettings(updates: Partial<UserSettings>) {
    return request<UserSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },
};

export interface QuizQuestionOption {
  key: "A" | "B" | "C" | "D";
  text: string;
  _id?: string;
}

/** Questions and options only — the server never sends the correct option. */
export interface QuizQuestion {
  questionNumber: number;
  questionText: string;
  options: QuizQuestionOption[];
}

export interface QuizHint {
  /** Point in the recording to rewatch, e.g. "3:15" */
  timestamp: string;
  title: string;
}

export interface QuizAnswerFeedback {
  questionNumber: number;
  selectedOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  /** Only for correct answers */
  explanation: string | null;
  /** Only for wrong answers */
  hint: QuizHint | null;
}

export interface QuizAttemptResult {
  attemptNumber: number;
  score: number;
  totalQuestions: number;
  passingScore: number;
  passed: boolean;
  attemptsRemaining: number;
  /** When a fresh round of attempts opens, if this round is used up (null = no wait / never) */
  retryAvailableAt: string | null;
  review: { questionNumber: number; questionText: string; hint: QuizHint | null }[];
  badgeEarned?: { name: string; image: string } | null;
  certificateUnlocked?: boolean;
}

export interface QuizData {
  quizId: string;
  moduleSlug: string;
  title: string;
  isOpen: boolean;
  sessionState: SessionState;
  maxAttempts: number;
  passingScore: number;
  totalQuestions: number;
  /** Within the current round of attempts */
  attemptsUsed: number;
  attemptsRemaining: number;
  /** Set while a used-up round is resting; a fresh round opens at this time */
  retryAvailableAt: string | null;
  /** 0 = no fresh rounds once attempts are used up */
  retryAfterHours: number;
  isPassed: boolean;
  badge: { name: string; image: string };
  questions: QuizQuestion[];
  /** An attempt the learner started and hasn't finished */
  currentAttempt: { attemptNumber: number; answers: QuizAnswerFeedback[] } | null;
  lastResult: QuizAttemptResult | null;
}

export interface QuizAnswerResponse extends QuizAnswerFeedback {
  attemptNumber: number;
  answeredCount: number;
  totalQuestions: number;
  /** Set when this answer finished the attempt */
  result: QuizAttemptResult | null;
}

export const quizApi = {
  async getQuiz(moduleIdOrSlug: string) {
    return request<QuizData>(`/quiz/${moduleIdOrSlug}`, {
      method: "GET",
    });
  },

  /** Locks in one answer; graded on the server. */
  async answer(
    moduleIdOrSlug: string,
    questionNumber: number,
    selectedOption: "A" | "B" | "C" | "D"
  ) {
    return request<QuizAnswerResponse>(`/quiz/${moduleIdOrSlug}/answer`, {
      method: "POST",
      body: JSON.stringify({ questionNumber, selectedOption }),
    });
  },
};

export interface EarnedBadgeItem {
  badgeId: string;
  name: string;
  image: string;
  earnedAt: string;
  sourceModuleId?: string;
}

export interface BadgesResponse {
  totalCohortBadges: number;
  earnedCount: number;
  badges: EarnedBadgeItem[];
}

export const badgeApi = {
  /**
   * Get user's earned badges and total cohort badges from MongoDB
   */
  async getBadges() {
    return request<BadgesResponse>("/badges", {
      method: "GET",
    });
  },
};

/** Partner card — managed in the CMS (Si Her DeFi (Base) → Partners). */
export interface PartnerItem {
  id: string;
  order: number;
  title: string;
  tag: string;
  description: string;
  imageUrl: string | null;
  actionText: string;
  actionUrl: string | null;
  footerText: string;
}

/** "More ways to build" banner — managed in the CMS (Si Her DeFi (Base) → More Ways). */
export interface MoreWaysContent {
  heading: string;
  subheading: string;
  cards: { id: string; title: string; description: string; linkText: string; linkUrl: string | null }[];
}

export const partnerApi = {
  async getPartners() {
    return request<PartnerItem[]>("/partners", {
      method: "GET",
    });
  },

  /** null when the team hasn't set the banner up (it is then hidden) */
  async getMoreWays() {
    return request<MoreWaysContent | null>("/partners/more-ways", {
      method: "GET",
    });
  },
};

export type OnboardSurveyStatus = "not_started" | "draft" | "completed";

/** Dashboard "Start here" card, managed in the CMS. */
export interface OnboardCard {
  stepLabel: string;
  title: string;
  description: string;
  imageUrl: string | null;
  doneMessage: string;
  questionCount: number;
  questionsMinutes: number | null;
  videoMinutes: number | null;
}

export interface OnboardStatusResponse {
  part1Done: boolean;
  part1Status: OnboardSurveyStatus;
  part1CompletedAt: string | null;
  part2Done: boolean;
  part2CompletedAt: string | null;
  part2Unlocked: boolean;
  part1Card: OnboardCard | null;
}

export interface OnboardQuestion {
  id: string;
  order: number;
  question: string;
  placeholder: string;
  hint: string;
  maxLength: number;
  required: boolean;
}

export interface OnboardSocial {
  id: string;
  order: number;
  platform: string;
  label: string;
  handle: string;
  url: string;
  required: boolean;
}

/** Si Her Onboard content, managed by the team in the SI3 CMS. */
export interface OnboardContent {
  part: "part1" | "part2";
  stepLabel: string;
  card: { title: string; description: string; imageUrl: string | null; doneMessage: string };
  page: { title: string; subtitle: string };
  video: { url: string | null; posterUrl: string | null; caption: string; minutes: number | null };
  questionsMinutes: number | null;
  tasks: { video: string; socials: string; questions: string };
  socialsHeading: string;
  taskNote: string;
  questionsHeader: string;
  questionsIntro: string;
  completion: { title: string; message: string; nextStepNote: string };
  questions: OnboardQuestion[];
  socials: OnboardSocial[];
}

export interface OnboardProgress {
  status: OnboardSurveyStatus;
  videoWatched: boolean;
  followedSocialIds: string[];
  /** questionId → saved answer */
  answers: Record<string, string>;
  completedAt: string | null;
}

export interface OnboardPart1Payload {
  answers?: { questionId: string; answerText: string }[];
  followedSocialIds?: string[];
  videoWatched?: boolean;
}

export const onboardApi = {
  /**
   * Get learner onboarding progress status from MongoDB
   */
  async getStatus() {
    return request<OnboardStatusResponse>("/onboard/status", {
      method: "GET",
    });
  },

  /**
   * Part 1 content from the CMS plus the learner's saved progress
   */
  async getPart1() {
    return request<{ content: OnboardContent; progress: OnboardProgress }>("/onboard/part1", {
      method: "GET",
    });
  },

  /**
   * Save partial Part 1 progress (Save & exit, follows, video watched)
   */
  async saveDraft(data: OnboardPart1Payload) {
    return request<OnboardProgress>("/onboard/part1/draft", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit Onboard Part 1 — validated against the questions in the CMS
   */
  async submitPart1(data: OnboardPart1Payload) {
    return request<{ success: boolean; surveyId: string; completedAt: string }>("/onboard/part1", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

