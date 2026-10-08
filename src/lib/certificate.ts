import type { CertificateBadge, CertificateContent } from "@/lib/api";

/**
 * LinkedIn "Add to profile → Licenses & certifications", pre-filled.
 * https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&…
 */
export function linkedInAddToProfileUrl(opts: {
  content: CertificateContent;
  issuedAt: string | null;
  verifyUrl: string;
  verificationCode: string;
}) {
  const params = new URLSearchParams({ startTask: "CERTIFICATION_NAME", name: opts.content.credentialName });
  if (opts.content.linkedinOrganizationId) params.set("organizationId", opts.content.linkedinOrganizationId);
  else params.set("organizationName", opts.content.linkedinOrganizationName);
  if (opts.issuedAt) {
    const issued = new Date(opts.issuedAt);
    params.set("issueYear", String(issued.getFullYear()));
    params.set("issueMonth", String(issued.getMonth() + 1));
  }
  params.set("certUrl", opts.verifyUrl);
  params.set("certId", opts.verificationCode);
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** LinkedIn post composer, sharing the public verification page. */
export function linkedInShareUrl(verifyUrl: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
}

export function formatIssueDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

// ---------------------------------------------------------------------------
// High-resolution PNG, drawn on a canvas (no external images, so the canvas
// never gets "tainted" and can always be exported)
// ---------------------------------------------------------------------------

const W = 2400;
const H = 1700;
const INK = "#171730";
const MUTED = "#8e8ea6";
const BODY = "#5f5f7a";
const PURPLE = "#6d25d6";
const FONT = `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;

function hexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  // Letter-spaced, centred text (canvas has no letterSpacing everywhere yet)
  const chars = [...text];
  const width = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + tracking * (chars.length - 1);
  let cursor = x - width / 2;
  ctx.textAlign = "left";
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = "center";
}

export async function downloadCertificatePng(opts: {
  recipientName: string;
  content: CertificateContent;
  badges: CertificateBadge[];
  totalBadges: number;
  issuedAt: string | null;
  verificationCode: string;
  verifyUrl: string;
  network: string;
}) {
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Paper
  ctx.fillStyle = "#f4f2fb";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(60, 60, W - 120, H - 120, 48);
  ctx.fill();
  const accent = ctx.createLinearGradient(60, 0, W - 60, 0);
  accent.addColorStop(0, "#5b1ea6");
  accent.addColorStop(0.5, "#7526dd");
  accent.addColorStop(1, "#a855f7");
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(60, 60, W - 120, 18, [48, 48, 0, 0]);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = W / 2;

  // Crest
  hexagon(ctx, cx, 230, 70);
  ctx.fillStyle = PURPLE;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 54px ${FONT}`;
  ctx.fillText("✦", cx, 250);

  ctx.fillStyle = MUTED;
  ctx.font = `600 30px ${FONT}`;
  spaced(ctx, "CERTIFICATE OF COMPLETION", cx, 380, 9);

  ctx.fillStyle = INK;
  ctx.font = `700 112px ${FONT}`;
  ctx.fillText(opts.recipientName || "Si Her DeFi learner", cx, 520);

  ctx.fillStyle = BODY;
  ctx.font = `400 36px ${FONT}`;
  wrap(ctx, opts.content.statement, 1500).forEach((line, i) => ctx.fillText(line, cx, 600 + i * 52));

  ctx.fillStyle = INK;
  ctx.font = `800 44px ${FONT}`;
  spaced(ctx, opts.content.programName.toUpperCase(), cx, 770, 10);
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${FONT}`;
  spaced(
    ctx,
    `${opts.content.cohortLabel} · ${opts.content.cohortDates} · POWERED BY ${opts.network}`.toUpperCase(),
    cx,
    820,
    5,
  );

  // Badges
  ctx.strokeStyle = "#ececf2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(500, 905);
  ctx.lineTo(W - 500, 905);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - 260, 885, 520, 40);
  ctx.fillStyle = MUTED;
  ctx.font = `700 24px ${FONT}`;
  spaced(ctx, `MODULE BADGES EARNED · ${opts.badges.length} OF ${opts.totalBadges}`, cx, 914, 6);

  const perRow = 6;
  const r = 58;
  const gap = 150;
  const earnedWeeks = new Set(opts.badges.map((b) => b.week));
  const slots = Array.from({ length: opts.totalBadges }, (_, i) => i + 1);
  slots.forEach((week, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, slots.length - row * perRow);
    const x = cx - ((inRow - 1) * gap) / 2 + (i % perRow) * gap;
    const y = 1010 + row * 145;
    hexagon(ctx, x, y, r);
    if (earnedWeeks.has(week)) {
      ctx.fillStyle = PURPLE;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
    } else {
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "#d8d8e5";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#c4c4d4";
    }
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(String(week).padStart(2, "0"), x, y + 12);
  });

  // Details
  const details: [string, string][] = [
    ["ISSUED", formatIssueDate(opts.issuedAt) || "—"],
    ["CREDENTIAL ID", opts.verificationCode],
    ["NETWORK", opts.network],
  ];
  details.forEach(([label, value], i) => {
    const x = cx + (i - 1) * 520;
    ctx.fillStyle = MUTED;
    ctx.font = `700 22px ${FONT}`;
    spaced(ctx, label, x, 1345, 4);
    ctx.fillStyle = INK;
    ctx.font = `600 32px ${FONT}`;
    ctx.fillText(value, x, 1392);
  });

  // Footer
  ctx.strokeStyle = "#f0f0f5";
  ctx.beginPath();
  ctx.moveTo(220, 1450);
  ctx.lineTo(W - 220, 1450);
  ctx.stroke();
  const footer = (label: string, name: string, tagline: string, x: number, align: CanvasTextAlign) => {
    ctx.textAlign = align;
    ctx.fillStyle = MUTED;
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(label, x, 1505);
    ctx.fillStyle = INK;
    ctx.font = `900 40px ${FONT}`;
    ctx.fillText(name, x, 1555);
    ctx.fillStyle = MUTED;
    ctx.font = `400 24px ${FONT}`;
    ctx.fillText(tagline, x, 1592);
  };
  footer("ISSUED BY", opts.content.issuerName, opts.content.issuerTagline, 220, "left");
  footer("PRESENTED BY", opts.content.presenterName, opts.content.presenterTagline, W - 220, "right");
  ctx.textAlign = "center";
  ctx.fillStyle = PURPLE;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(`Verify: ${opts.verifyUrl}`, cx, 1600);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the image");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `si-her-defi-certificate-${opts.verificationCode}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
