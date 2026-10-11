"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useProfile, type UserProfile } from "@/components/profile-provider";
import { profileApi, isAuthenticated } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { LabelInput } from "@/components/ui/LabelInput";
import { toDataUrl } from "@/lib/image";

type Field = "name" | "role" | "organization" | "socialLink" | "bio";

const FIELDS: {
  key: Exclude<Field, "bio">;
  id: string;
  label: string;
  placeholder: string;
  type?: "text" | "url";
  autoComplete?: string;
}[] = [
  {
    key: "name",
    id: "name",
    label: "Your name",
    placeholder: "Firstname Lastname",
    autoComplete: "name",
  },
  {
    key: "role",
    id: "role",
    label: "Professional role (optional)",
    placeholder: "Engineer, Writer, etc.",
    autoComplete: "organization-title",
  },
  {
    key: "organization",
    id: "org",
    label: "Organization (optional)",
    placeholder: "Name of your organization",
    autoComplete: "organization",
  },
  {
    key: "socialLink",
    id: "social",
    label: "Social link (optional)",
    placeholder: "https://linkedin.com/in/your-username",
    type: "url",
    autoComplete: "url",
  },
];

const Tag = () => (
  <span className="rounded-full bg-[#eeeef6] px-2 py-0.5 text-[11px] font-medium text-[#7e7e96] whitespace-nowrap">
    From your application
  </span>
);

export default function ProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { profile, prefilledFields, saveProfile, applyApplicationPrefill } = useProfile();

  const [values, setValues] = useState<Record<Field, string>>({
    name: profile.name || "",
    role: profile.role || "",
    organization: profile.organization || "",
    socialLink: profile.socialLink || "",
    bio: profile.bio || "",
  });
  const [photo, setPhoto] = useState<string>(profile.photoUrl || "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;
    profileApi
      .getProfile()
      .then((remote) => {
        if (!isMounted || !remote) return;
        const v = {
          name: remote.name || "",
          role: remote.role || "",
          organization: remote.organization || "",
          socialLink: remote.socialLink || "",
          bio: remote.bio || "",
        };
        setValues(v);
        setPhoto(remote.photoUrl || "");
        if (remote.prefilledFields && remote.prefilledFields.length > 0) {
          applyApplicationPrefill({ ...v, photoUrl: remote.photoUrl ?? "" });
        } else {
          saveProfile({ ...v, photoUrl: remote.photoUrl ?? "" });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [router, applyApplicationPrefill, saveProfile]);

  const handlePickPhoto = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("That photo is over 5 MB. Try a smaller one.");
      return;
    }
    setErrorMessage(null);
    try {
      const dataUrl = await toDataUrl(file);
      setPhoto(dataUrl);
    } catch {
      setErrorMessage("Could not process photo.");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setNameError("Add your name — it’s the one printed on your certificate.");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await profileApi.updateProfile({
        name: values.name.trim(),
        role: values.role.trim(),
        organization: values.organization.trim(),
        socialLink: values.socialLink.trim(),
        bio: values.bio.trim(),
        photoUrl: photo,
      });

      saveProfile({
        name: values.name.trim(),
        role: values.role.trim(),
        organization: values.organization.trim(),
        socialLink: values.socialLink.trim(),
        bio: values.bio.trim(),
        photoUrl: photo,
      });

      router.push(fromDashboard ? "/dashboard" : "/wallet");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update profile. Please try again.");
      setIsSaving(false);
    }
  };

  const isPrefilledFromApplication = prefilledFields.length > 0;

  return (
    <div className="w-full">
      <form className="w-full" noValidate onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          type="file"
          onChange={(e) => {
            handlePickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div>
          <h1 className="text-[22px] sm:text-[24px] font-medium tracking-tight text-[#171730]">
            Set up your profile
          </h1>
          <p className="mt-1 text-[12.5px] sm:text-[13px] leading-relaxed text-[#5f5f7a]">
            This is how you’ll appear to partners and the rest of the cohort. You can change it any time.
          </p>
        </div>

        {isPrefilledFromApplication && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f0eafb] p-3 text-[#5b21b6]">
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
            <p className="text-[12px] leading-relaxed">
              We’ve filled this in from your Si Her DeFi application — edit anything that’s out of date.
            </p>
          </div>
        )}

        <div className="mt-4.5">
          <label className="block text-[12.5px] font-medium text-[#171730]">
            Profile photo
          </label>
          <div className="mt-2 flex items-center gap-3.5">
            {photo ? (
              <>
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Profile avatar" className="size-full object-cover" src={photo} />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg bg-[#f2e8ff] px-3 py-1 text-[12px] font-medium text-[#7c2ae8] transition-colors hover:bg-[#ead5ff] cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoto("")}
                    className="text-[11px] text-[#8e8ea6] transition-colors hover:text-[#5f5f7a] cursor-pointer"
                  >
                    Remove photo
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="grid size-14 shrink-0 place-items-center rounded-full border border-dashed border-[#d8b4fe] bg-[#f8f4ff] text-[#7c2ae8] cursor-pointer hover:bg-[#f2e8ff] transition-colors"
                >
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
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg bg-[#f2e8ff] px-3.5 py-1 text-[12.5px] font-medium text-[#7c2ae8] transition-colors hover:bg-[#ead5ff] cursor-pointer"
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

        <div className="mt-4 space-y-2.5">
          {FIELDS.map((f) => {
            const isPrefilled = prefilledFields.includes(f.key);
            return (
              <div key={f.key}>
                <LabelInput
                  id={f.id}
                  name={f.key}
                  label={f.label}
                  type={f.type ?? "text"}
                  corner={12}
                  height={48}
                  placeholder={f.placeholder}
                  autoComplete={f.autoComplete}
                  value={values[f.key]}
                  disabled={isSaving}
                  invalid={f.key === "name" && !!nameError}
                  describedBy={f.key === "name" && nameError ? "name-error" : undefined}
                  adornment={isPrefilled ? <Tag /> : undefined}
                  onChange={(v) => {
                    setValues({ ...values, [f.key]: v });
                    if (f.key === "name" && nameError) setNameError(null);
                  }}
                />
                {f.key === "name" && nameError && (
                  <p id="name-error" role="alert" className="mt-1.5 text-[12px] text-red-500">
                    {nameError}
                  </p>
                )}
              </div>
            );
          })}
          <div>
            <LabelInput
              id="bio"
              name="bio"
              label="Bio (optional)"
              multiline
              height={96}
              corner={12}
              maxLength={300}
              placeholder="A line about you and what you're building"
              value={values.bio}
              disabled={isSaving}
              adornment={prefilledFields.includes("bio") ? <Tag /> : undefined}
              onChange={(v) => setValues({ ...values, bio: v })}
            />
            <p className="mt-1 text-right text-[11px] text-[#8e8ea6]">Max 300 characters</p>
          </div>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-3 text-[12px] text-red-500">
            {errorMessage}
          </p>
        )}

        <div className="mt-5">
          <Button type="submit" loading={isSaving} loadingLabel="Saving profile">
            {fromDashboard ? "Save changes" : "Save & continue"}
          </Button>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-[#8e8ea6]">
          Only your name is required. Next: connect a wallet on Base — it’s where your certificate lands.
        </p>
      </form>
    </div>
  );
}
