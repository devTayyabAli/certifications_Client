"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  useProfile,
  type UserProfile,
} from "@/components/profile-provider";
import { assetPath } from "@/lib/constants";
import { profileApi, isAuthenticated } from "@/lib/api";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Longest edge of the stored avatar — plenty for the certificate, small in the DB. */
const PHOTO_MAX_EDGE = 512;
const MAX_BIO_LENGTH = 300;

/** Downscales the picked image and returns it as a compact JPEG data URL. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  // Transparent PNGs would turn black as JPEG — paint a white backdrop first
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { profile, prefilledFields, saveProfile, applyApplicationPrefill } = useProfile();
  const isPrefilledFromApplication = prefilledFields.length > 0;

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /**
   * Only the fields the member has actually touched. Everything else falls
   * through to the stored profile, so values that arrive after the hydration
   * render show up on their own — no sync effect, and edits are never
   * clobbered by a later store update.
   */
  const [draft, setDraft] = useState<Partial<UserProfile>>({});

  const setField = <K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K],
  ) => {
    if (errorMessage) setErrorMessage("");
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const name = draft.name ?? profile.name;
  const role = draft.role ?? profile.role;
  const organization = draft.organization ?? profile.organization;
  const socialLink = draft.socialLink ?? profile.socialLink;
  const bio = draft.bio ?? profile.bio;
  // `null` is a real value here ("Remove photo"), so `??` would be wrong.
  const photoUrl =
    draft.photoUrl !== undefined ? draft.photoUrl : profile.photoUrl;

  // Protect route and sync latest profile from backend on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    async function loadBackendProfile() {
      try {
        const remote = await profileApi.getProfile();
        if (remote && isMounted) {
          const values = {
            name: remote.name || "",
            role: remote.role || "",
            organization: remote.organization || "",
            socialLink: remote.socialLink || "",
            bio: remote.bio || "",
            photoUrl: remote.photoUrl ?? "",
          };
          if (remote.prefilledFields && remote.prefilledFields.length > 0) {
            applyApplicationPrefill(values);
          } else {
            saveProfile(values);
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote profile:", err);
      }
    }

    loadBackendProfile();
    return () => {
      isMounted = false;
    };
  }, [router, applyApplicationPrefill, saveProfile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setErrorMessage("Please upload a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMessage("That photo is larger than 5 MB. Please choose a smaller one.");
      return;
    }

    try {
      setField("photoUrl", await resizePhoto(file));
    } catch {
      setErrorMessage("We couldn't read that image. Please try another file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      // 1. Sync with MongoDB backend API
      await profileApi.updateProfile({
        name: name.trim(),
        role: role.trim(),
        organization: organization.trim(),
        socialLink: socialLink.trim(),
        bio: bio.trim(),
        photoUrl: photoUrl || null,
      });

      // 2. Update local state
      saveProfile({
        name: name.trim(),
        role: role.trim(),
        organization: organization.trim(),
        socialLink: socialLink.trim(),
        bio: bio.trim(),
        photoUrl,
      });

      // 3. Navigate to next step
      router.push(fromDashboard ? "/dashboard" : "/wallet");
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to update profile. Please try again."
      );
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        placeholder="Upload your profile picture"
        onChange={handleFileChange}
      />

      {/* Header text */}
      <div>
        <h1 className="text-[22px] sm:text-[24px] font-bold tracking-tight text-[#171730]">
          Set up your profile
        </h1>
        <p className="mt-1 text-[12.5px] sm:text-[13px] leading-relaxed text-[#5f5f7a]">
          This is how you’ll appear to partners and the rest of the cohort. You
          can change it any time.
        </p>
      </div>

      {/* Info Callout — only when the form really was filled from the application */}
      {isPrefilledFromApplication && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f0eafb] p-3 text-[#5b21b6]">
          <InfoSparkleIcon />
          <p className="text-[12px] leading-relaxed">
            We’ve filled this in from your Si Her DeFi application — edit
            anything that’s out of date.
          </p>
        </div>
      )}

      {/* Profile photo upload section */}
      <div className="mt-4.5">
        <label className="block text-[12.5px] font-semibold text-[#171730]">
          Profile photo
        </label>

        <div className="mt-2 flex items-center gap-3.5">
          {photoUrl ? (
            /* Uploaded photo avatar (Figma Image 2 & 3) */
            <>
              <div className="relative size-13 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-xs">
                <Image
                  src={assetPath(photoUrl)}
                  alt="Profile avatar"
                  fill
                  unoptimized
                  sizes="52px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-[#f2e8ff] px-3 py-1 text-[12px] font-semibold text-[#7c2ae8] transition-colors hover:bg-[#ead5ff] cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setField("photoUrl", null)}
                  className="text-[11px] text-[#8e8ea6] transition-colors hover:text-[#5f5f7a] cursor-pointer"
                >
                  Remove photo
                </button>
              </div>
            </>
          ) : (
            /* Empty photo state (Figma Image 1) */
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="grid size-13 shrink-0 place-items-center rounded-full border border-dashed border-[#d8b4fe] bg-[#f8f4ff] text-[#7c2ae8] cursor-pointer hover:bg-[#f2e8ff] transition-colors"
              >
                <PlusIcon />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-[#f2e8ff] px-3.5 py-1 text-[12.5px] font-semibold text-[#7c2ae8] transition-colors hover:bg-[#ead5ff] cursor-pointer"
                >
                  Upload a photo
                </button>
                <p className="mt-1 text-[11px] text-[#8e8ea6]">
                  JPG, PNG or WebP · up to 5 MB · shown on your certificate
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form Inputs */}
      <div className="mt-4.5 space-y-3">
        {/* Your Name */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="name"
              className="text-[12px] font-semibold text-[#171730]"
            >
              Your name
            </label>
            {prefilledFields.includes("name") && <FromApplicationChip />}
          </div>
          <input
            id="name"
            type="text"
            placeholder="Firstname Lastname"
            required
            value={name}
            onChange={(e) => setField("name", e.target.value)}
            className="w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-[13px] font-normal text-[#171730] shadow-xs outline-none transition focus:border-[#7c2ae8] focus:ring-1 focus:ring-[#7c2ae8]"
          />
        </div>

        {/* Professional Role */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="role"
              className="text-[12px] font-semibold text-[#171730]"
            >
              Professional role{" "}
              <span className="font-normal text-[#8e8ea6]">— optional</span>
            </label>
            {prefilledFields.includes("role") && <FromApplicationChip />}
          </div>
          <input
            id="role"
            type="text"
            placeholder="Engineer, Writer, etc."
            value={role}
            onChange={(e) => setField("role", e.target.value)}
            className="w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-[13px] font-normal text-[#171730] shadow-xs outline-none transition focus:border-[#7c2ae8] focus:ring-1 focus:ring-[#7c2ae8]"
          />
        </div>

        {/* Organization */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="org"
              className="text-[12px] font-semibold text-[#171730]"
            >
              Organization{" "}
              <span className="font-normal text-[#8e8ea6]">— optional</span>
            </label>
            {prefilledFields.includes("organization") && <FromApplicationChip />}
          </div>
          <input
            id="org"
            type="text"
            value={organization}
            placeholder="Name of your organization"
            onChange={(e) => setField("organization", e.target.value)}
            className="w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-[13px] font-normal text-[#171730] shadow-xs outline-none transition focus:border-[#7c2ae8] focus:ring-1 focus:ring-[#7c2ae8]"
          />
        </div>

        {/* Social link */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="social"
              className="text-[12px] font-semibold text-[#171730]"
            >
              Social link{" "}
              <span className="font-normal text-[#8e8ea6]">— optional</span>
            </label>
            {prefilledFields.includes("socialLink") && <FromApplicationChip />}
          </div>
          <input
            id="social"
            type="text"
            value={socialLink}
            placeholder="https://linkedin.com/in/your-username"
            onChange={(e) => setField("socialLink", e.target.value)}
            className="w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-[13px] font-normal text-[#171730] shadow-xs outline-none transition focus:border-[#7c2ae8] focus:ring-1 focus:ring-[#7c2ae8]"
          />
        </div>

        {/* Bio */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label
              htmlFor="bio"
              className="text-[12px] font-semibold text-[#171730]"
            >
              Bio{" "}
              <span className="font-normal text-[#8e8ea6]">— optional</span>
            </label>
            {prefilledFields.includes("bio") && <FromApplicationChip />}
          </div>
          <textarea
            id="bio"
            rows={3}
            maxLength={MAX_BIO_LENGTH}
            value={bio}
            placeholder="A line about you and what you're building"
            onChange={(e) => setField("bio", e.target.value)}
            className="w-full resize-none rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-[13px] font-normal text-[#171730] shadow-xs outline-none transition focus:border-[#7c2ae8] focus:ring-1 focus:ring-[#7c2ae8]"
          />
          <p className="mt-0.5 text-right text-[10.5px] text-[#8e8ea6] tabular-nums">
            {bio.length} / {MAX_BIO_LENGTH}
          </p>
        </div>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mt-3 text-center text-[12px] font-medium text-red-500"
        >
          {errorMessage}
        </p>
      )}

      {/* Action Button: Continue or Saving (Figma Image 2 vs 3) */}
      <button
        type="submit"
        disabled={isSaving}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] px-4 py-3 text-[14px] font-semibold text-white shadow-md shadow-purple-950/20 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-90 cursor-pointer"
      >
        {isSaving ? (
          <>
            <SpinnerIcon />
            <span>Saving profile</span>
          </>
        ) : (
          <>
            <span>{fromDashboard ? "Save changes" : "Save & continue"}</span>
            <span aria-hidden="true" className="text-base font-normal">
              →
            </span>
          </>
        )}
      </button>

      {/* Footer Note */}
      <p className="mt-3 text-[11.5px] leading-relaxed text-[#8e8ea6]">
        Only your name is required. Next: connect a wallet on Base — it’s
        where your certificate lands.
      </p>
    </form>
  );
}

function FromApplicationChip() {
  return (
    <span className="rounded-full bg-[#eeeef6] px-2 py-0.5 text-[8.5px] font-bold tracking-wider text-[#7e7e96] uppercase">
      FROM YOUR APPLICATION
    </span>
  );
}

function InfoSparkleIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 shrink-0 text-[#7c2ae8] mt-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 7v3M10 13h.01" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="size-4 animate-spin text-white"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
