"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { truncateAddress, useWallet } from "@/components/wallet-provider";
import { useProfile } from "@/components/profile-provider";
import { useCertificateUnlocked } from "@/lib/cohort-progress";
import { assetPath } from "@/lib/constants";
import { fetchNextOnboardingRoute, isAuthenticated } from "@/lib/api";
import { useSignOut } from "@/lib/use-sign-out";

const CERT_LOCKED_HINT =
  "Unlocks once you complete Collective Capital for Creators";

export default function DashboardSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { wallet, isOnBase, openModal } = useWallet();
  const { profile } = useProfile();
  const signOut = useSignOut();

  // Route protection: only authenticated learners who finished the profile and
  // wallet steps can reach the app pages.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    fetchNextOnboardingRoute()
      .then((next) => {
        if (!cancelled && next !== "/dashboard") router.replace(next);
      })
      .catch(() => {
        // Backend unreachable — let the page render with what it has
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // The drawer stores *which route* it was opened on, so navigating anywhere
  // closes it by derivation — no effect, and no frame where the old drawer is
  // still open over the new route.
  const [menuRoute, setMenuRoute] = useState<string | null>(null);
  const isMobileMenuOpen = menuRoute === pathname;
  const openMobileMenu = () => setMenuRoute(pathname);
  const closeMobileMenu = () => setMenuRoute(null);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isDashboardActive =
    pathname === "/dashboard" || pathname === "/onboard" || pathname.startsWith("/module");
  const isCertActive = pathname === "/certificate";
  const isSettingsActive = pathname === "/settings";
  const certificateUnlocked = useCertificateUnlocked();

  const avatarSrc = profile.photoUrl || assetPath("/ada-portrait.jpg");

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close user dropdown on outside click or Escape key
  useEffect(() => {
    if (!isUserMenuOpen && !isMobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUserMenuOpen(false);
        closeMobileMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen, isMobileMenuOpen]);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    closeMobileMenu();
    void signOut();
  };

  return (
    <>
      {/* ── Mobile Top Header (visible only on screens < md) ── */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-[#ececf2] bg-white/95 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src={assetPath("/Logo · SI HER DeFi.png")}
            alt="Si Her DeFi Artwork"
            width={100}
            height={100}
            style={{ width: "auto", height: "auto" }}
          />
        </Link>

        <div className="flex items-center gap-2">
          {wallet ? (
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-2.5 py-1 text-[11px] font-mono text-[#5f5f7a] shadow-2xs"
            >
              <span className={`size-1.5 rounded-full ${isOnBase ? "bg-[#0052ff]" : "bg-amber-400"}`} />
              <span>{truncateAddress(wallet.address)}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-1 rounded-full border border-[#7c2ae8]/30 bg-[#f7f2fe] px-2.5 py-1 text-[11px] font-semibold text-[#7c2ae8]"
            >
              <span>Connect</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openMobileMenu()}
            className="rounded-lg p-1.5 text-[#5f5f7a] hover:bg-gray-100 hover:text-[#171730] transition cursor-pointer"
            aria-label="Open mobile menu"
          >
            <HamburgerMenuIcon />
          </button>
        </div>
      </header>

      {/* ── Mobile Slide-over Drawer & Backdrop ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => closeMobileMenu()}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="fixed top-0 left-0 bottom-0 z-50 flex w-[290px] max-w-[85vw] flex-col justify-between bg-white p-5 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Top */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#ececf2]">
                <Link
                  href="/dashboard"
                  onClick={() => closeMobileMenu()}
                  className="flex items-center gap-2.5"
                >
                  <Image
                    src={assetPath("/Logo · SI HER DeFi.png")}
                    alt="Si Her DeFi Artwork"
                    width={100}
                    height={100}
                    style={{ width: "auto", height: "auto" }}
                  />
                </Link>

                <button
                  type="button"
                  onClick={() => closeMobileMenu()}
                  className="rounded-lg p-1 text-[#8e8ea6] hover:bg-gray-100 hover:text-[#171730] transition cursor-pointer"
                  aria-label="Close menu"
                >
                  <CloseMenuIcon />
                </button>
              </div>

              {/* Powered by Base pill */}
              <div className="mt-3.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-2.5 py-0.5">
                  <span className="text-[9px] font-semibold tracking-[0.14em] text-[#8e8ea6]">
                    POWERED BY
                  </span>
                  <span className="size-2 rounded-full bg-[#0052ff]" />
                  <span className="text-[9.5px] font-bold tracking-[0.14em] text-[#171730]">
                    BASE
                  </span>
                </span>
              </div>

              {/* Nav links */}
              <nav className="mt-6 space-y-1.5">
                <Link
                  href="/dashboard"
                  onClick={() => closeMobileMenu()}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${isDashboardActive
                    ? "bg-[#f3ebff] text-[#7c2ae8] font-semibold"
                    : "text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730]"
                    }`}
                >
                  <DashboardNavIcon />
                  <span>Dashboard</span>
                </Link>

                {certificateUnlocked ? (
                  <Link
                    href="/certificate"
                    onClick={() => closeMobileMenu()}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${isCertActive
                      ? "bg-[#f3ebff] text-[#7c2ae8] font-semibold"
                      : "text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730]"
                      }`}
                  >
                    <CertificateNavIcon />
                    <span>Certificate</span>
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    title={CERT_LOCKED_HINT}
                    className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] text-[#b4b4c4]"
                  >
                    <CertificateNavIcon />
                    <span>Certificate</span>
                    <LockIcon className="ml-auto size-3.5" />
                  </span>
                )}

                <Link
                  href="/settings"
                  onClick={() => closeMobileMenu()}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${isSettingsActive
                    ? "bg-[#f3ebff] text-[#7c2ae8] font-semibold"
                    : "text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730]"
                    }`}
                >
                  <SettingsNavIcon />
                  <span>Settings</span>
                </Link>
              </nav>
            </div>

            {/* Drawer Bottom: Wallet + User */}
            <div className="space-y-3 pt-4 border-t border-[#ececf2]">
              {/* Wallet block */}
              <div className="flex items-center justify-between rounded-xl border border-[#e4e4ed] bg-[#f9fafc] px-3 py-2 text-[11.5px]">
                <div className="flex items-center gap-2 font-medium text-[#171730]">
                  <span className={`size-2 rounded-full ${wallet ? "bg-[#0052ff]" : "bg-[#dcdce8]"}`} />
                  <span>{wallet ? "Base" : "Not connected"}</span>
                </div>
                {wallet ? (
                  <a
                    href={`https://basescan.org/address/${wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] text-[#8e8ea6] hover:text-[#0052ff] transition"
                  >
                    {truncateAddress(wallet.address)}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      openModal();
                    }}
                    className="text-[11px] font-semibold text-[#7c2ae8] hover:underline cursor-pointer"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* User profile block */}
              <div className="rounded-xl border border-[#ececf2] bg-white p-3 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-black/10">
                    <Image
                      src={avatarSrc}
                      alt={profile.name}
                      fill
                      unoptimized
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-[#171730]">{profile.name}</p>
                    <p className="truncate text-[11px] text-[#8e8ea6]">{profile.role}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-[#f0f0f5]">
                  <Link
                    href="/profile?from=dashboard"
                    onClick={() => closeMobileMenu()}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition"
                  >
                    <EditPencilIcon />
                    <span>Edit profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => closeMobileMenu()}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730] transition"
                  >
                    <SettingsNavIcon className="size-3.5" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <LogoutNavIcon />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar (hidden on screens < md) ── */}
      <aside
        className={`sticky top-3 my-3 ml-3 h-[calc(100vh-1.5rem)] hidden md:flex flex-col justify-between rounded-2xl border border-[#ececf2] bg-white shadow-[0_1px_3px_rgba(23,23,48,0.04),0_10px_28px_-18px_rgba(23,23,48,0.12)] transition-all duration-300 z-30 shrink-0 ${collapsed ? "w-[56px]" : "w-[240px]"
          }`}
      >
        {/* ── Top section: brand + nav ── */}
        <div className={collapsed ? "flex flex-col items-center py-5 gap-5" : "px-5 py-6"}>

          {/* Logo row (expanded: logo + toggle button) */}
          {collapsed ? (
            /* Collapsed: logo only — clicking it expands */
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center justify-center rounded-lg p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <Image
                src={assetPath("/Brand.png")}
                alt="Si Her DeFi Artwork"
                width={100}
                height={100}
                style={{ width: "auto", height: "auto" }}
              />
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <Image
                  src={assetPath("/Logo · SI HER DeFi.png")}
                  alt="Si Her DeFi Artwork"
                  width={100}
                  height={100}
                  style={{ width: "auto", height: "auto" }}
                />
              </Link>
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg p-1.5 text-[#8e8ea6] hover:bg-gray-100 hover:text-[#171730] transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <SidebarToggleIcon />
              </button>
            </div>
          )}

          {/* POWERED BY BASE */}
          {collapsed ? (
            /* Collapsed: just the blue dot */
            <span className="size-2 rounded-full bg-[#0052ff]" title="Powered by Base" />
          ) : (
            <div className="mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e4ed] bg-[#f9fafc] px-2.5 py-1">
                <span className="text-[9px] font-semibold tracking-[0.14em] text-[#8e8ea6]">
                  POWERED BY
                </span>
                <span className="size-2 rounded-full bg-[#0052ff]" />
                <span className="text-[9.5px] font-bold tracking-[0.14em] text-[#171730]">
                  BASE
                </span>
              </span>
            </div>
          )}

          {/* Navigation */}
          {collapsed ? (
            /* Collapsed: icons only */
            <nav className="flex flex-col items-center gap-2 mt-4">
              <Link
                href="/dashboard"
                className={`flex items-center justify-center rounded-xl p-2 transition-colors ${isDashboardActive
                  ? "text-[#7c2ae8]"
                  : "text-[#8e8ea6] hover:text-[#171730] hover:bg-gray-50"
                  }`}
                title="Dashboard"
              >
                <div className="relative">
                  <DashboardNavIcon />
                  {isDashboardActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#7c2ae8]" />
                  )}
                </div>
              </Link>

              {certificateUnlocked ? (
                <Link
                  href="/certificate"
                  className={`flex items-center justify-center rounded-xl p-2 transition-colors ${isCertActive
                    ? "text-[#7c2ae8]"
                    : "text-[#8e8ea6] hover:text-[#171730] hover:bg-gray-50"
                    }`}
                  title="Certificate"
                >
                  <div className="relative">
                    <CertificateNavIcon />
                    {isCertActive && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#7c2ae8]" />
                    )}
                  </div>
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title={`Certificate — ${CERT_LOCKED_HINT}`}
                  className="flex cursor-not-allowed items-center justify-center rounded-xl p-2 text-[#b4b4c4]"
                >
                  <span className="relative">
                    <CertificateNavIcon />
                    <LockIcon className="absolute -right-1.5 -bottom-1.5 size-2.5" />
                  </span>
                </span>
              )}

              <Link
                href="/settings"
                className={`flex items-center justify-center rounded-xl p-2 transition-colors ${isSettingsActive
                  ? "text-[#7c2ae8]"
                  : "text-[#8e8ea6] hover:text-[#171730] hover:bg-gray-50"
                  }`}
                title="Settings"
              >
                <div className="relative">
                  <SettingsNavIcon />
                  {isSettingsActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-[#7c2ae8]" />
                  )}
                </div>
              </Link>
            </nav>
          ) : (
            <nav className="mt-8 space-y-1.5">
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${isDashboardActive
                  ? "bg-[#f3ebff] text-[#7c2ae8] font-semibold"
                  : "text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730]"
                  }`}
              >
                <DashboardNavIcon />
                <span>Dashboard</span>
              </Link>

              {certificateUnlocked ? (
                <Link
                  href="/certificate"
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${isCertActive
                    ? "bg-[#f3ebff] text-[#7c2ae8] font-semibold"
                    : "text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730]"
                    }`}
                >
                  <CertificateNavIcon />
                  <span>Certificate</span>
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  title={CERT_LOCKED_HINT}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] text-[#b4b4c4]"
                >
                  <CertificateNavIcon />
                  <span>Certificate</span>
                  <LockIcon className="ml-auto size-3.5" />
                </span>
              )}

              <Link
                href="/settings"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-colors ${isSettingsActive
                  ? "bg-[#f3ebff] text-[#7c2ae8] font-semibold"
                  : "text-[#5f5f7a] hover:bg-gray-50 hover:text-[#171730]"
                  }`}
              >
                <SettingsNavIcon />
                <span>Settings</span>
              </Link>
            </nav>
          )}
        </div>

        {/* ── Bottom section: wallet + user ── */}
        <div
          className={`border-t border-[#f0f0f5] ${collapsed
            ? "flex flex-col items-center py-4 gap-4"
            : "px-5 py-4 space-y-4"
            }`}
        >
          {/* Wallet */}
          {collapsed ? (
            wallet ? (
              <a
                href={`https://basescan.org/address/${wallet.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid place-items-center rounded-lg p-1.5 transition-colors text-[#0052ff] hover:bg-blue-50"
                title={`${truncateAddress(wallet.address)} on Base (view on BaseScan)`}
              >
                <WalletNavIcon />
              </a>
            ) : (
              <button
                type="button"
                onClick={openModal}
                className="grid place-items-center rounded-lg p-1.5 transition-colors text-[#8e8ea6] hover:bg-gray-100 cursor-pointer"
                title="Connect wallet"
              >
                <WalletNavIcon />
              </button>
            )
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-[#e4e4ed] bg-[#f9fafc] px-3 py-2 text-[11.5px]">
              <div className="flex items-center gap-2 font-medium text-[#171730]">
                <span
                  className={`size-2 rounded-full ${wallet ? "bg-[#0052ff]" : "bg-[#dcdce8]"}`}
                />
                <span>{wallet ? "Base" : "Not connected"}</span>
              </div>
              {wallet ? (
                <a
                  href={`https://basescan.org/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-[#8e8ea6] hover:text-[#0052ff] transition"
                  title="View on BaseScan"
                >
                  {truncateAddress(wallet.address)}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={openModal}
                  className="text-[11px] font-semibold text-[#7c2ae8] hover:underline cursor-pointer"
                >
                  Connect
                </button>
              )}
            </div>
          )}

          {/* User avatar & card with 3-dots dropdown */}
          {collapsed ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="relative size-8 overflow-hidden rounded-full border border-black/10 transition-transform hover:scale-105 cursor-pointer block"
                title={profile.name}
                aria-label="User menu"
                aria-expanded={isUserMenuOpen}
              >
                <Image
                  src={avatarSrc}
                  alt={profile.name}
                  fill
                  unoptimized
                  sizes="32px"
                  className="object-cover"
                />
              </button>

              {/* Collapsed dropdown popover */}
              {isUserMenuOpen && (
                <div className="absolute bottom-0 left-12 w-56 rounded-2xl border border-[#e4e4ed] bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 p-2 border-b border-[#f0f0f5]">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-black/10">
                      <Image
                        src={avatarSrc}
                        alt={profile.name}
                        fill
                        unoptimized
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-[#171730]">{profile.name}</p>
                      <p className="truncate text-[10.5px] text-[#8e8ea6]">{profile.role}</p>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/profile?from=dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-[#5f5f7a] hover:bg-[#f9f9fc] hover:text-[#171730] transition"
                    >
                      <svg viewBox="0 0 24 24" className="size-4 text-[#8e8ea6]" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Edit profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-[#5f5f7a] hover:bg-[#f9f9fc] hover:text-[#171730] transition"
                    >
                      <SettingsNavIcon className="size-4 text-[#8e8ea6]" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#f0f0f5]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-black/10">
                    <Image
                      src={avatarSrc}
                      alt={profile.name}
                      fill
                      unoptimized
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-[#171730] leading-tight">
                      {profile.name}
                    </p>
                    <p className="truncate text-[10.5px] text-[#8e8ea6] leading-tight mt-0.5">
                      {profile.role}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${isUserMenuOpen
                    ? "bg-gray-100 text-[#171730]"
                    : "text-[#8e8ea6] hover:text-[#171730] hover:bg-gray-100"
                    }`}
                  title="Account options"
                  aria-label="Account options"
                  aria-expanded={isUserMenuOpen}
                >
                  <MoreHorizontalIcon />
                </button>
              </div>

              {/* Expanded dropdown popover */}
              {isUserMenuOpen && (
                <div className="absolute bottom-12 left-0 right-0 w-full rounded-2xl border border-[#e4e4ed] bg-white p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 p-2 border-b border-[#f0f0f5]">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-black/10">
                      <Image
                        src={avatarSrc}
                        alt={profile.name}
                        fill
                        unoptimized
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-bold text-[#171730]">{profile.name}</p>
                      <p className="truncate text-[10.5px] text-[#8e8ea6]">{profile.role}</p>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/profile?from=dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-[#5f5f7a] hover:bg-[#f9f9fc] hover:text-[#171730] transition"
                    >
                      <svg viewBox="0 0 24 24" className="size-4 text-[#8e8ea6]" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Edit profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-[#5f5f7a] hover:bg-[#f9f9fc] hover:text-[#171730] transition"
                    >
                      <SettingsNavIcon className="size-4 text-[#8e8ea6]" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#f0f0f5]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-4 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Icon components
// ---------------------------------------------------------------------------

function SidebarToggleIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <line x1="8" y1="3" x2="8" y2="17" />
    </svg>
  );
}

function DashboardNavIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
    </svg>
  );
}

function WalletNavIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="14" height="10" rx="2" />
      <circle cx="13" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4" fill="currentColor">
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
    </svg>
  );
}

function SettingsNavIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HamburgerMenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseMenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EditPencilIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-3.5 text-[#8e8ea6]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m13.5 3.5 3 3L6 17H3v-3L13.5 3.5z" />
    </svg>
  );
}

function LogoutNavIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-3.5 text-red-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LockIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="9" width="10" height="8" rx="1.5" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function CertificateNavIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
      <polyline points="15 13 18 22 12 19 6 22 9 13" />
    </svg>
  );
}


