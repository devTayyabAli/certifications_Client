/**
 * Si Her DeFi API Client
 * Enterprise client for communication with Express / MongoDB backend.
 */

import type { Part2, CohortEvent } from "./types";

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
  /** Skipped after using every attempt: no badge, but counts as done for the certificate */
  isSkipped?: boolean;
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
  /** added to the learner's calendar, at the session's current date and time */
  isScheduled: boolean;
  scheduledProvider: "google" | "apple" | "outlook" | "proton" | "other" | null;
  /** added to a calendar, but the session has moved since: the learner should add it again */
  calendarOutdated?: boolean;
  addedToCalendarAt?: string | null;
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
    // the learner's own time zone, so reminders can be sent in their time
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }
    return request<any>(`/modules/${slugOrId}/schedule`, {
      method: "POST",
      body: JSON.stringify({ calendarType, timezone }),
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

/** Signed by the server: what the learner's wallet may claim from the badges contract. */
export interface ClaimVoucher {
  contract: string;
  chainId: number;
  learner: string;
  moduleIds: number[];
  capstone: boolean;
  nonce: string;
  deadline: number;
  signature: string;
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
  /** earned badges (week numbers) and the certificate not yet in the wallet; null when unknown */
  claimable?: { moduleIds: number[]; capstone: boolean } | null;
  /** true when the learner can claim something now from their own wallet */
  canMint: boolean;
  /** an on-chain mint in flight (poll until status is "minted"), or why the last one failed */
  mint?: {
    pending: boolean;
    error: string | null;
    txHash: string | null;
    explorerUrl: string | null;
  };
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

  /**
   * A signed voucher for the learner's wallet to claim its earned badges (and
   * the certificate, once unlocked) from the badges contract.
   */
  async claimVoucher() {
    return request<ClaimVoucher>("/certificate/claim", { method: "POST" });
  },

  /**
   * Reports the claim transaction the wallet sent. The server checks it on-chain;
   * the certificate only shows as minted once that's confirmed.
   */
  async recordClaim(txHash: string) {
    return request<CertificateData>("/certificate/claim/submitted", {
      method: "POST",
      body: JSON.stringify({ txHash }),
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
  /** Always null now: out of attempts means start over or skip, no waiting */
  retryAvailableAt: string | null;
  retryAfterHours: number;
  isPassed: boolean;
  /** Skipped after using every attempt: no badge, but counts as done for the certificate */
  isSkipped?: boolean;
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

  /** Out of attempts (or skipped): start over with a fresh set of attempts. */
  async restart(moduleIdOrSlug: string) {
    return request<QuizData>(`/quiz/${moduleIdOrSlug}/restart`, { method: "POST" });
  },

  /** Out of attempts: skip this week's quiz — no badge, still counts toward the certificate. */
  async skip(moduleIdOrSlug: string) {
    return request<QuizData>(`/quiz/${moduleIdOrSlug}/skip`, { method: "POST" });
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

export interface PartnersCopy {
  heading: string;
  subheading: string;
  referralNote: string;
}

/** Shown until the CMS copy loads, and if it can't be loaded. */
export const PARTNERS_COPY_DEFAULTS: PartnersCopy = {
  heading: "From our partners",
  subheading: "",
  referralNote: "Si Her DAO may earn a referral fee from links marked “Referral link”.",
};

export const partnerApi = {
  async getPartners() {
    return request<PartnerItem[]>("/partners", {
      method: "GET",
    });
  },

  /** Heading, subtitle and referral note around the partner cards (edited in the CMS → Partners). */
  async getCopy() {
    return request<PartnersCopy>("/partners/copy", { method: "GET" });
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

  /**
   * Part 2 content and saved reflection answers
   */
  async getPart2() {
    // Content, whether it's open, and saved answers all come from the server; no
    // local stand-in, so a learner is never shown it as open or done when it isn't
    return request<Part2>("/onboard/part2", { method: "GET" });
  },

  /**
   * Submit Onboard Part 2 reflection answers
   */
  async submitPart2(answers: Record<string, string>) {
    // Errors reach the page, so answers are never shown as submitted unless the server saved them
    return request<{ progress: { answers: Record<string, string>; completedAt: string } }>("/onboard/part2", {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
  },
};

export const eventsApi = {
  async getAll() {
    // Events are managed in the CMS; if they can't be loaded, show none rather
    // than a hardcoded copy that may list changed or deleted events
    return request<CohortEvent[]>("/events", { method: "GET" }).catch(() => [] as CohortEvent[]);
  },
};



/** The learner's private calendar-subscription links (every session, kept up to date). */
export interface CalendarFeedLinks {
  /** https feed URL — paste into Proton ("Add calendar from URL") or any calendar app */
  url: string;
  /** opens Apple Calendar's subscribe dialog */
  webcalUrl: string;
  googleUrl: string;
  outlookUrl: string;
}

export const calendarFeedApi = {
  async getLinks() {
    return request<CalendarFeedLinks>("/calendar/feed-link", { method: "GET" });
  },
};
