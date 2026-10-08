"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { useProfile } from "@/components/profile-provider";
import { useWallet } from "@/components/wallet-provider";
import { assetPath } from "@/lib/constants";
import {
  profileApi,
  walletApi,
  settingsApi,
  isAuthenticated,
} from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { profile, saveProfile } = useProfile();
  const { wallet, isOnBase, openModal, disconnect, saveWallet } = useWallet();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [onChainPrivacy, setOnChainPrivacy] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Protect route & sync profile, wallet, and settings from MongoDB backend
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;

    async function loadSettingsData() {
      try {
        const [profileRes, walletRes, settingsRes] = await Promise.allSettled([
          profileApi.getProfile(),
          walletApi.getStatus(),
          settingsApi.getSettings(),
        ]);

        if (!isMounted) return;

        // Sync Profile
        if (profileRes.status === "fulfilled" && profileRes.value) {
          const p = profileRes.value;
          saveProfile({
            name: p.name || "",
            role: p.role || "",
            organization: p.organization || "",
            socialLink: p.socialLink || "",
            bio: p.bio || "",
            photoUrl: p.photoUrl !== undefined ? p.photoUrl : null,
          });
        }

        // Sync Wallet
        if (
          walletRes.status === "fulfilled" &&
          walletRes.value?.connected &&
          walletRes.value?.address
        ) {
          saveWallet({
            address: walletRes.value.address,
            chainId: walletRes.value.chainId || "0x2105",
          });
        }

        // Sync Settings
        if (settingsRes.status === "fulfilled" && settingsRes.value) {
          setEmailNotifications(settingsRes.value.emailNotifications);
          setOnChainPrivacy(settingsRes.value.onChainVerificationPrivacy);
        }
      } catch (err) {
        console.warn("Could not load settings data from backend:", err);
      }
    }

    loadSettingsData();

    return () => {
      isMounted = false;
    };
  }, [router, saveProfile, saveWallet]);

  const handleToggleSetting = async (
    key: "emailNotifications" | "onChainVerificationPrivacy",
    nextValue: boolean,
  ) => {
    if (key === "emailNotifications") setEmailNotifications(nextValue);
    if (key === "onChainVerificationPrivacy") setOnChainPrivacy(nextValue);

    setIsSavingSettings(true);
    try {
      await settingsApi.updateSettings({ [key]: nextValue });
      showToast(
        key === "emailNotifications"
          ? nextValue
            ? "Email notifications turned on"
            : "Email notifications turned off"
          : nextValue
            ? "On-chain verification privacy enabled"
            : "On-chain verification privacy disabled",
      );
    } catch (err) {
      console.warn("Failed to update setting:", err);
      // Revert on error
      if (key === "emailNotifications") setEmailNotifications(!nextValue);
      if (key === "onChainVerificationPrivacy") setOnChainPrivacy(!nextValue);
      showToast("Failed to save setting to backend");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setIsDisconnecting(true);
    try {
      await walletApi.disconnect();
      disconnect();
      showToast("Wallet disconnected successfully");
    } catch (err) {
      console.warn("Failed to disconnect wallet on backend:", err);
      disconnect();
      showToast("Wallet disconnected locally");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const avatarSrc = profile.photoUrl || assetPath("/ada-portrait.jpg");

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f8fc] font-sans antialiased text-[#171730]">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-60 rounded-xl bg-[#171730] px-4 py-2.5 text-[12.5px] font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-3">
          {toastMessage}
        </div>
      )}

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-14 sm:py-8 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-[#171730]">
              Settings
            </h1>
            <p className="mt-1 text-[13px] text-[#5f5f7a]">
              Manage your cohort profile, connected wallet, and platform preferences.
            </p>
          </div>

          {/* Profile Section */}
          <section className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-bold text-[#171730]">Profile Information</h2>
                <p className="text-[12px] text-[#8e8ea6]">
                  This is how your credentials appear on your on-chain certificate.
                </p>
              </div>
              <Link
                href="/profile?from=dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#501c9c] via-[#6d25d6] to-[#983cf4] px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm hover:brightness-105 transition"
              >
                <span>Edit profile</span>
                <span>→</span>
              </Link>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-black/10 shadow-xs">
                <Image
                  src={avatarSrc}
                  alt={profile.name || "Member avatar"}
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#171730]">{profile.name}</h3>
                <p className="text-[12.5px] font-medium text-[#7c2ae8]">{profile.role}</p>
                <p className="text-[12px] text-[#8e8ea6] mt-0.5">{profile.organization}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[12.5px]">
              <div className="p-3 rounded-xl bg-[#f9f9fc] border border-[#ececf2]">
                <span className="text-[#8e8ea6] block text-[11px] font-medium uppercase tracking-wider">
                  Social Profile
                </span>
                <span className="text-[#171730] font-medium truncate block mt-0.5">
                  {profile.socialLink || "Not specified"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#f9f9fc] border border-[#ececf2]">
                <span className="text-[#8e8ea6] block text-[11px] font-medium uppercase tracking-wider">
                  Cohort
                </span>
                <span className="text-[#171730] font-medium block mt-0.5">
                  Cohort 01 — Si Her DeFi
                </span>
              </div>
            </div>
          </section>

          {/* Wallet Section */}
          <section className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)] space-y-4">
            <h2 className="text-[16px] font-bold text-[#171730]">Connected Wallet</h2>
            <p className="text-[12px] text-[#8e8ea6]">
              Your on-chain certificate will be minted to this address on Base Mainnet.
            </p>

            {wallet ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#f9f9fc] border border-[#e4e4ed]">
                <div className="flex items-center gap-3">
                  <span className={`size-3 rounded-full ${isOnBase ? "bg-[#0052ff]" : "bg-amber-400"}`} />
                  <div>
                    <p className="font-mono text-[13px] font-semibold text-[#171730] break-all sm:break-normal">
                      {wallet.address}
                    </p>
                    <p className="text-[11px] text-[#8e8ea6]">Base Mainnet</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://basescan.org/address/${wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[#e2e2ec] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#5f5f7a] hover:bg-gray-50 transition"
                  >
                    View on BaseScan ↗
                  </a>
                  <button
                    type="button"
                    disabled={isDisconnecting}
                    onClick={handleDisconnectWallet}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11.5px] font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer disabled:opacity-50"
                  >
                    {isDisconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#f9f9fc] border border-[#e4e4ed]">
                <div>
                  <p className="text-[13px] font-semibold text-[#171730]">No wallet connected</p>
                  <p className="text-[11px] text-[#8e8ea6]">Connect a wallet to receive your certificate.</p>
                </div>
                <button
                  type="button"
                  onClick={openModal}
                  className="rounded-xl bg-[#7c2ae8] text-white px-4 py-2 text-[12px] font-semibold hover:bg-[#6a22c9] transition cursor-pointer"
                >
                  Connect wallet
                </button>
              </div>
            )}
          </section>

          {/* Preferences */}
          <section className="rounded-2xl border border-[#ececf2] bg-white p-6 shadow-[0_2px_12px_rgba(23,23,48,0.03)] space-y-4">
            <h2 className="text-[16px] font-bold text-[#171730]">Account Preferences</h2>
            <div className="divide-y divide-[#f0f0f5] text-[13px]">
              {/* Email Notifications Toggle */}
              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#171730]">Email notifications</p>
                  <p className="text-[11px] text-[#8e8ea6]">Get updates when new modules, live sessions, and materials are published.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailNotifications}
                  disabled={isSavingSettings}
                  onClick={() => handleToggleSetting("emailNotifications", !emailNotifications)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    emailNotifications ? "bg-[#7c2ae8]" : "bg-[#e2e2ec]"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      emailNotifications ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* On-Chain Privacy Toggle */}
              <div className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#171730]">On-chain verification privacy</p>
                  <p className="text-[11px] text-[#8e8ea6]">Display your full name publicly on the Base certificate registry & verification page.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onChainPrivacy}
                  disabled={isSavingSettings}
                  onClick={() => handleToggleSetting("onChainVerificationPrivacy", !onChainPrivacy)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    onChainPrivacy ? "bg-[#7c2ae8]" : "bg-[#e2e2ec]"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      onChainPrivacy ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
