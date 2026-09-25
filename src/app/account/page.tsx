"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, ArrowUpCircle, BarChart3, CheckCircle2, ChevronRight,
  Eye, FileText, FlaskConical, Grid2X2, Headphones, HelpCircle, LoaderCircle,
  LockKeyhole, LogOut, MapPin, Megaphone, Pencil, Plus, RefreshCw,
  ShieldCheck, Store, Trash2, TrendingUp,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

// Install as app/account/page.tsx (or src/app/account/page.tsx).
// Website route destinations.
const ROUTES = {
  login: "/log-in?next=/account",
  createPage: "/create-page",
  editPage: (id: string) => `/edit-page/${encodeURIComponent(id)}`,
  livePage: (page: OwnedPage) => `/pages/${encodeURIComponent(page.slug || page.id)}`,
  createPlace: "/create-place",
  managePlaces: "/manage-places",
  partnership: (id: string) => `/partnership?pageId=${encodeURIComponent(id)}`,
  analytics: (id: string) => `/analytics?pageId=${encodeURIComponent(id)}`,
  trends: (id: string) => `/local-trends?pageId=${encodeURIComponent(id)}`,
  support: "/support",
  privacy: "/privacy",
  terms: "/terms",
  deleteAccount: "/delete-account",
};

type OwnedPage = {
  id: string; name: string; slug: string | null; status: string | null;
  is_local_partner: boolean | null; brand_color: string | null;
  created_at: string | null; partner_started_at: string | null;
  place_enabled: boolean | null;
};
type AccountData = { userId: string; username: string; email: string; page: OwnedPage | null };
const BENEFITS = [
  { icon: ArrowUpCircle, title: "More visibility", text: "Give your posts greater prominence across the ELO feed." },
  { icon: BarChart3, title: "Page analytics", text: "Understand views, clicks and how people engage with your Page." },
  { icon: TrendingUp, title: "Local Trends", text: "See what people across East Lothian are searching for." },
  { icon: Megaphone, title: "Dedicated Advert slot", text: "Promote your business with an evergreen advert on ELO." },
  { icon: Grid2X2, title: "Every post type", text: "Unlock the full range of Partner posting tools." },
  { icon: Headphones, title: "Priority support", text: "Get quicker help when you need support with ELO." },
];
function initial(value: string) { return value.trim()[0]?.toUpperCase() || "E"; }
function statusLabel(status: string | null) {
  switch (status?.trim().toLowerCase()) {
    case "approved": return "Live";
    case "pending": case "review": return "Under review";
    case "rejected": return "Needs attention";
    default: return "Draft";
  }
}
function errorMessage(error: unknown) {
  return error && typeof error === "object" && "message" in error
    ? String(error.message) : "Please try again.";
}
function Box({ children, style, className }: { children?: ReactNode; style?: CSSProperties; className?: string }) {
  return <div className={className} style={{ display: "flex", flexDirection: "column", minWidth: 0, borderWidth: 0, borderStyle: "solid", boxSizing: "border-box", ...style }}>{children}</div>;
}
function Copy({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <span style={{ display: "block", ...style }}>{children}</span>;
}
function Action({
  href,
  children,
  style,
}: {
  href: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        width: "100%",
        textDecoration: "none",
        borderWidth: 0,
        borderStyle: "solid",
        boxSizing: "border-box",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </Link>
  );
}
function Setting({ href, icon, children, danger = false }: { href: string; icon: ReactNode; children: ReactNode; danger?: boolean }) {
  return <Action href={href} style={styles.settingRow}>{icon}<Copy style={{ ...styles.settingLabel, ...(danger ? styles.deleteAccountLabel : {}) }}>{children}</Copy><ChevronRight size={18} color={danger ? "#C28B86" : "#A4A4A4"} /></Action>;
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const generation = useRef(0);
  const signOutBusy = useRef(false);
  const currentUserId = useRef<string | null>(null);

  const loadAccount = useCallback(async (showLoader = false) => {
    const request = ++generation.current;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (request !== generation.current) return;
      if (authError) throw authError;
      if (!user) {
        currentUserId.current = null;
        setAccount(null);
        return;
      }
      if (currentUserId.current !== user.id) {
        setAccount(null);
      }
      currentUserId.current = user.id;
      const [profile, pageResult] = await Promise.all([
        supabase.from("users").select("username").eq("id", user.id).maybeSingle(),
        supabase.from("groups").select("id,name,slug,status,is_local_partner,brand_color,created_at,place_enabled")
          .eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      ]);
      if (request !== generation.current) return;
      if (pageResult.error) throw pageResult.error;
      let partnerStartedAt: string | null = null;
      const firstPage = pageResult.data as Omit<OwnedPage, "partner_started_at"> | null;
      if (firstPage?.is_local_partner) {
        const { data } = await supabase.from("groups").select("partner_started_at")
          .eq("id", firstPage.id).maybeSingle();
        partnerStartedAt = typeof data?.partner_started_at === "string" ? data.partner_started_at : null;
      }
      if (request !== generation.current) return;
      const username = typeof profile.data?.username === "string" ? profile.data.username.trim()
        : typeof user.user_metadata?.username === "string" ? user.user_metadata.username.trim() : "";
      setAccount({ userId: user.id, username: username || "ELO User", email: user.email || "",
        page: firstPage ? { ...firstPage, partner_started_at: partnerStartedAt } : null });
    } catch (caught) {
      if (request === generation.current) setError(errorMessage(caught));
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let active = true;
    let authTimer: ReturnType<typeof setTimeout> | undefined;
    void loadAccount(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      clearTimeout(authTimer);
      if (!session?.user) {
        ++generation.current;
        currentUserId.current = null;
        setAccount(null); setLoading(false);
        setError(null); setNotice(null);
      } else {
        if (currentUserId.current !== session.user.id) {
          ++generation.current;
          setAccount(null); setLoading(true); setNotice(null);
        }
        // Defer database calls until Supabase's auth callback has returned.
        authTimer = setTimeout(() => { if (active) void loadAccount(); }, 0);
      }
    });
    const onFocus = () => { if (!signOutBusy.current) void loadAccount(); };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false; ++generation.current; clearTimeout(authTimer);
      subscription.unsubscribe(); window.removeEventListener("focus", onFocus);
    };
  }, [loadAccount, supabase]);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await loadAccount();
    setRefreshing(false);
  }
  async function signOut() {
    if (signOutBusy.current || !window.confirm("Sign out? You can sign back in at any time.")) return;
    signOutBusy.current = true; setSigningOut(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      ++generation.current; currentUserId.current = null; setAccount(null);
      router.replace("/"); router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { signOutBusy.current = false; setSigningOut(false); }
  }

  const page = account?.page ?? null;
  const isPartner = page?.is_local_partner === true;
  const isELO = page?.slug?.trim().toLowerCase() === "east-lothian-online" || page?.name?.trim().toLowerCase() === "east lothian online";
  // UI gating mirrors the app. Destination pages and database RLS must enforce access.
  const hasPartnerToolsAccess = isPartner || isELO;
  const isLive = page?.status?.trim().toLowerCase() === "approved";
  const accent = /^#[0-9a-f]{6}$/i.test(page?.brand_color?.trim() || "") ? page!.brand_color!.trim() : "#005744";
  const partnerDate = page?.partner_started_at ? new Date(page.partner_started_at) : null;
  const partnerSince = partnerDate && !Number.isNaN(partnerDate.getTime())
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(partnerDate) : null;

  return (
    <div className="elo-account" style={{ minHeight: "100dvh", background: "#F4F5F4", color: "#111111" }}>
      <SiteHeader />
      <main className="elo-account-content" style={{ padding: "20px 18px 110px", maxWidth: 760, margin: "0 auto" }}>
        {error && <div role="alert" className="elo-message elo-error">{error}<button type="button" onClick={() => void refresh()} disabled={refreshing}>Try again</button></div>}
        {notice && <div role="status" className="elo-message">{notice}<button type="button" onClick={() => setNotice(null)}>Dismiss</button></div>}
        {loading ? <div className="elo-loading" role="status"><LoaderCircle className="elo-spin" size={30} /><span>Loading account…</span></div>
          : !account ? <Box style={styles.noPageCard}>
            <Box style={styles.noPageIcon}><Store size={26} color="#005744" /></Box>
            <h1 style={{ ...styles.noPageTitle, marginBottom: 0 }}>Your account</h1>
            <Copy style={styles.noPageText}>{error ? "Your account couldn’t be loaded. Please try again." : "Sign in to manage your ELO account and Page."}</Copy>
            {!error && <Action href={ROUTES.login} style={styles.createPageButton}><Copy style={styles.createPageButtonText}>Log in</Copy><ArrowRight size={19} color="white" /></Action>}
          </Box> : <>
            <Box style={styles.accountIntro}>
              <Box style={styles.avatar}><Copy style={styles.avatarText}>{initial(account.username)}</Copy></Box>
              <Box style={styles.identity}>
                <h1 className="elo-ellipsis" style={{ ...styles.name, margin: 0 }}>{account.username}</h1>
                <Copy style={{ ...styles.email, overflowWrap: "anywhere" }}>{account.email}</Copy>
              </Box>
              <button className="elo-refresh" type="button" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh account"><RefreshCw size={19} className={refreshing ? "elo-spin" : undefined} /></button>
            </Box>
            <h2 style={styles.sectionTitle}>Your Page</h2>
            {page ? <>
              <Box style={styles.pageCard}>
                <Box style={styles.pageTop}>
                  <Box style={{ ...styles.pageBrand, backgroundColor: accent }}><Copy style={styles.pageBrandLetter}>{initial(page.name)}</Copy></Box>
                  <Box style={styles.pageInfo}>
                    <Copy style={{ ...styles.pageName, overflowWrap: "anywhere" }}>{page.name}</Copy>
                    <Box style={styles.pageMeta}><Box style={{ ...styles.statusDot, backgroundColor: isLive ? "#169B62" : "#D59022" }} /><Copy style={styles.pageStatus}>{statusLabel(page.status)}</Copy></Box>
                  </Box>
                </Box>
                <Box style={isPartner ? styles.partnerBand : styles.demoBand}>
                  <Box style={isPartner ? styles.partnerIcon : styles.demoIcon}>{isPartner ? <CheckCircle2 size={21} color="white" /> : <FlaskConical size={21} color="#8A4B00" />}</Box>
                  <Box style={styles.tierText}><Copy style={isPartner ? styles.partnerLabel : styles.demoLabel}>{isPartner ? "LOCAL PARTNER" : "DEMO PAGE"}</Copy><Copy style={isPartner ? styles.partnerSubtext : styles.demoSubtext}>{isPartner ? partnerSince ? `Partner since ${partnerSince}` : "Local Partner" : "Your free Page is using the Demo level."}</Copy></Box>
                </Box>
                <Box style={styles.pageActions}>
                  {isLive && <Action href={ROUTES.livePage(page)} style={styles.viewButton}><Eye size={18} color="#222222" /><Copy style={styles.viewButtonText}>View live</Copy></Action>}
                  <Action href={ROUTES.editPage(page.id)} style={{ ...styles.editButton, backgroundColor: accent }}><Pencil size={17} color="white" /><Copy style={styles.editButtonText}>Edit Page</Copy></Action>
                </Box>
              </Box>
              {page.place_enabled === true && isLive && <Box style={styles.placesCard}>
                <Box style={styles.placesTop}><Box style={styles.placesIcon}><MapPin size={23} color="#005744" /></Box><Box style={styles.placesText}><Copy style={styles.placesTitle}>Places</Copy><Copy style={styles.placesBody}>Add each physical location your organisation operates from. There is no limit.</Copy></Box></Box>
                <Box style={styles.placeButtons}>
                  <Action href={ROUTES.createPlace} style={styles.createPlaceButton}><Copy style={styles.createPlaceButtonText}>Create Place</Copy><Plus size={20} color="white" /></Action>
                  <Action href={ROUTES.managePlaces} style={styles.managePlacesButton}><Pencil size={17} color="#005744" /><Copy style={styles.managePlacesButtonText}>Edit Places</Copy></Action>
                </Box>
              </Box>}
              <Box style={styles.insightsCard}>
                <Box style={styles.insightsHeadingRow}><Box><Copy style={styles.insightsEyebrow}>PARTNER TOOLS</Copy><Copy style={styles.insightsTitle}>Insights</Copy></Box>
                  {!hasPartnerToolsAccess && <Box style={styles.insightsLockedBadge}><LockKeyhole size={11} color="#7E8783" /><Copy style={styles.insightsLockedBadgeText}>PARTNERSHIP</Copy></Box>}
                </Box>
                {[{ title: "Analytics", body: "Views, clicks and post performance.", icon: BarChart3, href: ROUTES.analytics(page.id) }, { title: "Local Trends", body: "See what East Lothian is searching for right now.", icon: TrendingUp, href: ROUTES.trends(page.id) }].map((item, index) => (
                  <Action key={item.title} href={hasPartnerToolsAccess ? item.href : isLive ? ROUTES.partnership(page.id) : ROUTES.support}
                    style={{ ...styles.trendsButton, ...(index ? styles.secondInsightButton : {}), ...(!hasPartnerToolsAccess ? styles.insightButtonLocked : {}) }}>
                    <Box style={{ ...styles.trendsIcon, ...(!hasPartnerToolsAccess ? styles.trendsIconLocked : {}) }}><item.icon size={22} color={hasPartnerToolsAccess ? "#005744" : "#89928E"} /></Box>
                    <Box style={styles.trendsCopy}><Copy style={{ ...styles.trendsTitle, ...(!hasPartnerToolsAccess ? styles.trendsTitleLocked : {}) }}>{item.title}</Copy><Copy style={styles.trendsBody}>{item.body}</Copy></Box>
                    {hasPartnerToolsAccess ? <ChevronRight size={20} color="#7B8681" /> : <LockKeyhole size={16} color="#A4ACA8" />}
                  </Action>
                ))}
                {!hasPartnerToolsAccess && <Copy style={styles.insightsLockedNote}>{isLive ? "Included with Partnership" : "Partnership is available after your Page is approved."}</Copy>}
              </Box>
              {!hasPartnerToolsAccess && isLive && <Box style={styles.upgradePanel}>
                <Box style={styles.upgradeTop}><Box style={styles.lockIcon}><LockKeyhole size={22} color="white" /></Box><Box style={styles.upgradeHeading}><Copy style={styles.upgradeEyebrow}>ELO PARTNERSHIP</Copy><Copy style={styles.upgradeTitle}>Partner with ELO</Copy></Box></Box>
                <Copy style={styles.upgradeIntro}>Unlock the full ELO toolkit for your organisation — more visibility, deeper insight and more ways to reach local people.</Copy>
                <Box style={styles.priceRow}><Copy style={styles.price}>£19.99</Copy><Copy style={styles.priceSuffix}>/ month</Copy></Box>
                <Box style={styles.benefits}>{BENEFITS.map(benefit => <Box key={benefit.title} style={styles.benefitRow}><Box style={styles.benefitIcon}><benefit.icon size={19} color="#005744" /></Box><Box style={styles.benefitText}><Copy style={styles.benefitTitle}>{benefit.title}</Copy><Copy style={styles.benefitDescription}>{benefit.text}</Copy></Box><LockKeyhole size={16} color="#A8A8A8" /></Box>)}</Box>
                <Action href={ROUTES.partnership(page.id)} style={styles.upgradeButton}><Copy style={styles.upgradeButtonText}>Unlock Partnership</Copy><ArrowRight size={20} color="white" /></Action>
                <Copy style={styles.upgradeNote}>Plus more Partner features as ELO continues to grow.</Copy>
              </Box>}
              {isPartner && <Box style={styles.partnerSummary}><ShieldCheck size={24} color="#005744" /><Box style={styles.partnerSummaryText}><Copy style={styles.partnerSummaryTitle}>Partnership active</Copy><Copy style={styles.partnerSummaryBody}>Your Page has Partnership visibility, tools and status.</Copy></Box></Box>}
            </> : <Box style={styles.noPageCard}>
              <Box style={styles.noPageIcon}><Store size={26} color="#005744" /></Box><Copy style={styles.noPageTitle}>Create your Page</Copy><Copy style={styles.noPageText}>Each account can have one ELO Page for a local business, organisation or community group.</Copy>
              <Action href={ROUTES.createPage} style={styles.createPageButton}><Copy style={styles.createPageButtonText}>Create Page</Copy><ArrowRight size={19} color="white" /></Action>
            </Box>}
            <h2 style={{ ...styles.sectionTitle, ...styles.accountTitle }}>Account</h2>
            <Box style={styles.settings}>
              <Setting href={ROUTES.support} icon={<HelpCircle size={22} color="#005744" />}>Help &amp; support</Setting>
              <Box style={styles.divider} />
              <a
                href="mailto:hello@eastlothian.online"
                style={{ ...styles.settingRow, textDecoration: "none" }}
              >
                <HelpCircle size={22} color="#005744" />
                <Copy style={styles.settingLabel}>Email us</Copy>
                <ChevronRight size={18} color="#A4A4A4" />
              </a>
            </Box>
            <h2 style={{ ...styles.sectionTitle, ...styles.legalTitle }}>Legal &amp; privacy</h2>
            <Box style={styles.settings}>
              <Setting href={ROUTES.privacy} icon={<ShieldCheck size={21} color="#005744" />}>Privacy Policy</Setting><Box style={styles.divider} />
              <Setting href={ROUTES.terms} icon={<FileText size={21} color="#005744" />}>Terms of Use</Setting><Box style={styles.divider} />
              <Setting href={ROUTES.deleteAccount} danger icon={<Trash2 size={21} color="#B42318" />}>Delete account</Setting>
            </Box>
            <button type="button" disabled={signingOut} onClick={() => void signOut()} style={{ ...styles.signOut, width: "100%" }}><LogOut size={19} color="#B42318" /><Copy style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Copy></button>
          </>}
      </main>
      <style>{`
        .elo-account { font-family: var(--font-geist-sans), Arial, sans-serif; }
        .elo-account *, .elo-account *::before, .elo-account *::after { box-sizing: border-box; }
        .elo-account h1, .elo-account h2 { margin-top: 0; line-height: 1.2; }
        .elo-account button { display: flex; border: 0; padding: 0; background: transparent; font: inherit; text-align: left; cursor: pointer; }
        .elo-account button:disabled { opacity: .55; cursor: not-allowed; }
        .elo-account svg { flex-shrink: 0; }
        .elo-account a:focus-visible, .elo-account button:focus-visible { outline: 2px solid #007A5E; outline-offset: 4px; }
        .elo-account a:active, .elo-account button:active { opacity: .8; }
        .elo-account .elo-refresh { color: #005744; padding: 10px; border-radius: 12px; margin-left: 6px; }
        .elo-account .elo-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .elo-account .elo-loading { min-height: 45vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #005744; }
        .elo-account .elo-message { padding: 14px 16px; margin-bottom: 18px; border-radius: 14px; background: #E8F4F0; color: #005744; font-size: 13px; line-height: 1.6; }
        .elo-account .elo-error { background: #FFE9E7; color: #B42318; }
        .elo-account .elo-message button { color: inherit; text-decoration: underline; margin-top: 6px; font-weight: 800; }
        .elo-account .elo-spin { animation: elo-account-spin 1s linear infinite; }
        @keyframes elo-account-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .elo-account .elo-spin { animation: none; } }
        @media (min-width: 768px) { .elo-account .elo-account-content { padding-top: 32px !important; } }
      `}</style>
    </div>
  );
}

// The app's styles translated directly to CSS pixels.
const styles = {
  "root": {
    "flex": 1,
    "backgroundColor": "#F4F5F4"
  },
  "scrollContent": {
    "paddingBottom": 110
  },
  "loading": {
    "flex": 1,
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column"
  },
  "content": {
    "paddingLeft": 18,
    "paddingRight": 18,
    "paddingTop": 20
  },
  "accountIntro": {
    "flexDirection": "row",
    "alignItems": "center",
    "paddingBottom": 24,
    "display": "flex"
  },
  "avatar": {
    "width": 54,
    "height": 54,
    "borderRadius": 27,
    "backgroundColor": "#005744",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "avatarText": {
    "color": "#FFFFFF",
    "fontSize": 22,
    "fontWeight": 900
  },
  "identity": {
    "flex": 1,
    "marginLeft": 14
  },
  "name": {
    "color": "#111111",
    "fontSize": 22,
    "fontWeight": 900,
    "letterSpacing": -0.45
  },
  "email": {
    "color": "#7A7A7A",
    "fontSize": 12,
    "fontWeight": 600,
    "marginTop": 3
  },
  "sectionTitle": {
    "color": "#111111",
    "fontSize": 21,
    "fontWeight": 900,
    "letterSpacing": -0.4,
    "marginBottom": 12
  },
  "pageCard": {
    "backgroundColor": "#FFFFFF",
    "borderRadius": 22,
    "padding": 18,
    "overflow": "hidden"
  },
  "pageTop": {
    "flexDirection": "row",
    "alignItems": "center",
    "display": "flex"
  },
  "pageBrand": {
    "width": 54,
    "height": 54,
    "borderRadius": 17,
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "pageBrandLetter": {
    "color": "#FFFFFF",
    "fontSize": 22,
    "fontWeight": 900
  },
  "pageInfo": {
    "flex": 1,
    "marginLeft": 13
  },
  "pageName": {
    "color": "#111111",
    "fontSize": 19,
    "lineHeight": "23px",
    "fontWeight": 900,
    "letterSpacing": -0.25
  },
  "pageMeta": {
    "flexDirection": "row",
    "alignItems": "center",
    "gap": 6,
    "marginTop": 6,
    "display": "flex"
  },
  "statusDot": {
    "width": 7,
    "height": 7,
    "borderRadius": 4,
    "flexShrink": 0
  },
  "pageStatus": {
    "color": "#777777",
    "fontSize": 11,
    "fontWeight": 800
  },
  "demoBand": {
    "marginTop": 17,
    "borderRadius": 16,
    "backgroundColor": "#FFF4E5",
    "padding": 13,
    "flexDirection": "row",
    "alignItems": "center",
    "display": "flex"
  },
  "partnerBand": {
    "marginTop": 17,
    "borderRadius": 16,
    "backgroundColor": "#E8F4F0",
    "padding": 13,
    "flexDirection": "row",
    "alignItems": "center",
    "display": "flex"
  },
  "demoIcon": {
    "width": 38,
    "height": 38,
    "borderRadius": 12,
    "backgroundColor": "#FFE3BB",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "partnerIcon": {
    "width": 38,
    "height": 38,
    "borderRadius": 12,
    "backgroundColor": "#005744",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "tierText": {
    "flex": 1,
    "marginLeft": 11
  },
  "demoLabel": {
    "color": "#8A4B00",
    "fontSize": 11,
    "fontWeight": 900,
    "letterSpacing": 0.7
  },
  "partnerLabel": {
    "color": "#005744",
    "fontSize": 11,
    "fontWeight": 900,
    "letterSpacing": 0.7
  },
  "demoSubtext": {
    "color": "#9B6A2E",
    "fontSize": 11,
    "lineHeight": "16px",
    "fontWeight": 700,
    "marginTop": 2
  },
  "partnerSubtext": {
    "color": "#47776B",
    "fontSize": 11,
    "lineHeight": "16px",
    "fontWeight": 700,
    "marginTop": 2
  },
  "pageActions": {
    "flexDirection": "row",
    "gap": 10,
    "marginTop": 16,
    "display": "flex"
  },
  "viewButton": {
    "flex": 1,
    "height": 47,
    "borderRadius": 13,
    "borderWidth": 1,
    "borderColor": "#E2E2E2",
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 7,
    "display": "flex",
    "borderStyle": "solid"
  },
  "viewButtonText": {
    "color": "#222222",
    "fontSize": 13,
    "fontWeight": 900
  },
  "editButton": {
    "flex": 1,
    "height": 47,
    "borderRadius": 13,
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 7,
    "display": "flex"
  },
  "editButtonText": {
    "color": "#FFFFFF",
    "fontSize": 13,
    "fontWeight": 900
  },
  "upgradePanel": {
    "marginTop": 14,
    "backgroundColor": "#171A18",
    "borderRadius": 24,
    "padding": 20
  },
  "upgradeTop": {
    "flexDirection": "row",
    "alignItems": "center",
    "display": "flex"
  },
  "lockIcon": {
    "width": 46,
    "height": 46,
    "borderRadius": 15,
    "backgroundColor": "#B42318",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "upgradeHeading": {
    "flex": 1,
    "marginLeft": 13
  },
  "upgradeEyebrow": {
    "color": "#FFB4AC",
    "fontSize": 10,
    "fontWeight": 900,
    "letterSpacing": 1
  },
  "upgradeTitle": {
    "color": "#FFFFFF",
    "fontSize": 22,
    "lineHeight": "27px",
    "fontWeight": 900,
    "letterSpacing": -0.45,
    "marginTop": 3
  },
  "upgradeIntro": {
    "color": "rgba(255,255,255,0.69)",
    "fontSize": 13,
    "lineHeight": "20px",
    "fontWeight": 600,
    "marginTop": 14
  },
  "priceRow": {
    "flexDirection": "row",
    "alignItems": "flex-end",
    "marginTop": 18,
    "display": "flex"
  },
  "price": {
    "color": "#FFFFFF",
    "fontSize": 34,
    "lineHeight": "38px",
    "fontWeight": 900,
    "letterSpacing": -1
  },
  "priceSuffix": {
    "color": "rgba(255,255,255,0.55)",
    "fontSize": 12,
    "fontWeight": 800,
    "marginLeft": 5,
    "marginBottom": 4
  },
  "benefits": {
    "marginTop": 20,
    "borderTopWidth": 1,
    "borderTopColor": "rgba(255,255,255,0.11)",
    "borderStyle": "solid"
  },
  "benefitRow": {
    "flexDirection": "row",
    "alignItems": "center",
    "paddingTop": 13,
    "paddingBottom": 13,
    "borderBottomWidth": 1,
    "borderBottomColor": "rgba(255,255,255,0.08)",
    "display": "flex",
    "borderStyle": "solid"
  },
  "benefitIcon": {
    "width": 38,
    "height": 38,
    "borderRadius": 12,
    "backgroundColor": "#E8F4F0",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "benefitText": {
    "flex": 1,
    "marginLeft": 11,
    "marginRight": 11
  },
  "benefitTitle": {
    "color": "#FFFFFF",
    "fontSize": 13,
    "fontWeight": 900
  },
  "benefitDescription": {
    "color": "rgba(255,255,255,0.52)",
    "fontSize": 10,
    "lineHeight": "15px",
    "fontWeight": 600,
    "marginTop": 2
  },
  "upgradeButton": {
    "height": 54,
    "borderRadius": 15,
    "backgroundColor": "#007A5E",
    "marginTop": 19,
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 9,
    "display": "flex"
  },
  "upgradeButtonText": {
    "color": "#FFFFFF",
    "fontSize": 14,
    "fontWeight": 900
  },
  "upgradeNote": {
    "color": "rgba(255,255,255,0.42)",
    "fontSize": 10,
    "lineHeight": "15px",
    "textAlign": "center",
    "fontWeight": 600,
    "marginTop": 10
  },
  "partnerSummary": {
    "marginTop": 14,
    "backgroundColor": "#E8F4F0",
    "borderRadius": 20,
    "padding": 17,
    "flexDirection": "row",
    "alignItems": "center",
    "display": "flex"
  },
  "partnerSummaryText": {
    "flex": 1,
    "marginLeft": 12
  },
  "partnerSummaryTitle": {
    "color": "#005744",
    "fontSize": 15,
    "fontWeight": 900
  },
  "partnerSummaryBody": {
    "color": "#47776B",
    "fontSize": 11,
    "lineHeight": "16px",
    "fontWeight": 700,
    "marginTop": 3
  },
  "insightsCard": {
    "marginTop": 18,
    "borderRadius": 19,
    "padding": 16,
    "backgroundColor": "#FFFFFF",
    "borderWidth": 1,
    "borderColor": "#DDE4E1",
    "borderStyle": "solid"
  },
  "insightsHeadingRow": {
    "flexDirection": "row",
    "alignItems": "flex-start",
    "justifyContent": "space-between",
    "gap": 12,
    "display": "flex"
  },
  "insightsLockedBadge": {
    "minHeight": 28,
    "borderRadius": 9,
    "backgroundColor": "#ECEFEE",
    "paddingLeft": 8,
    "paddingRight": 8,
    "flexDirection": "row",
    "alignItems": "center",
    "gap": 5,
    "display": "flex"
  },
  "insightsLockedBadgeText": {
    "color": "#7E8783",
    "fontSize": 7,
    "fontWeight": 900,
    "letterSpacing": 0.7
  },
  "insightsEyebrow": {
    "color": "#008564",
    "fontSize": 8,
    "fontWeight": 900,
    "letterSpacing": 1
  },
  "insightsTitle": {
    "marginTop": 4,
    "color": "#173C33",
    "fontSize": 18,
    "lineHeight": "22px",
    "fontWeight": 900,
    "letterSpacing": -0.3
  },
  "trendsButton": {
    "marginTop": 13,
    "minHeight": 76,
    "borderRadius": 16,
    "backgroundColor": "#F1F6F4",
    "paddingLeft": 12,
    "paddingRight": 12,
    "paddingTop": 11,
    "paddingBottom": 11,
    "flexDirection": "row",
    "alignItems": "center",
    "display": "flex"
  },
  "trendsIcon": {
    "width": 46,
    "height": 46,
    "borderRadius": 14,
    "backgroundColor": "#DDEDE7",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "secondInsightButton": {
    "marginTop": 9
  },
  "insightButtonLocked": {
    "backgroundColor": "#F5F6F5",
    "borderWidth": 1,
    "borderColor": "#E5E8E6",
    "borderStyle": "solid"
  },
  "trendsIconLocked": {
    "backgroundColor": "#E9ECEA"
  },
  "trendsTitleLocked": {
    "color": "#68736E"
  },
  "insightsLockedNote": {
    "marginTop": 10,
    "color": "#8B9490",
    "fontSize": 8.5,
    "fontWeight": 800,
    "textAlign": "center"
  },
  "trendsCopy": {
    "flex": 1,
    "marginLeft": 11,
    "marginRight": 8
  },
  "trendsTitle": {
    "color": "#173C33",
    "fontSize": 12,
    "fontWeight": 900
  },
  "trendsBody": {
    "marginTop": 3,
    "color": "#6E7A75",
    "fontSize": 9.5,
    "lineHeight": "14px",
    "fontWeight": 600
  },
  "placesCard": {
    "marginTop": 18,
    "borderRadius": 18,
    "padding": 16,
    "backgroundColor": "#FFFFFF",
    "borderWidth": 1,
    "borderColor": "#D9E0DD",
    "borderStyle": "solid"
  },
  "placesTop": {
    "flexDirection": "row",
    "alignItems": "flex-start",
    "display": "flex"
  },
  "placesIcon": {
    "width": 46,
    "height": 46,
    "borderRadius": 14,
    "backgroundColor": "#E7F2EE",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "placesText": {
    "flex": 1,
    "marginLeft": 12
  },
  "placesTitle": {
    "color": "#182620",
    "fontSize": 15,
    "fontWeight": 900
  },
  "placesBody": {
    "marginTop": 4,
    "color": "#73807B",
    "fontSize": 11,
    "lineHeight": "17px"
  },
  "placeButtons": {
    "marginTop": 14,
    "gap": 9
  },
  "createPlaceButton": {
    "height": 48,
    "borderRadius": 13,
    "backgroundColor": "#005744",
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 7,
    "display": "flex"
  },
  "createPlaceButtonText": {
    "color": "#FFFFFF",
    "fontSize": 12,
    "fontWeight": 900
  },
  "managePlacesButton": {
    "height": 48,
    "borderRadius": 13,
    "borderWidth": 1,
    "borderColor": "#B8CEC6",
    "backgroundColor": "#F5FAF8",
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 7,
    "display": "flex",
    "borderStyle": "solid"
  },
  "managePlacesButtonText": {
    "color": "#005744",
    "fontSize": 12,
    "fontWeight": 900
  },
  "noPageCard": {
    "backgroundColor": "#FFFFFF",
    "borderRadius": 22,
    "padding": 22
  },
  "noPageIcon": {
    "width": 50,
    "height": 50,
    "borderRadius": 16,
    "backgroundColor": "#E8F4F0",
    "alignItems": "center",
    "justifyContent": "center",
    "display": "flex",
    "flexDirection": "column",
    "flexShrink": 0
  },
  "noPageTitle": {
    "color": "#111111",
    "fontSize": 21,
    "fontWeight": 900,
    "marginTop": 16
  },
  "noPageText": {
    "color": "#737373",
    "fontSize": 13,
    "lineHeight": "20px",
    "fontWeight": 600,
    "marginTop": 7
  },
  "createPageButton": {
    "height": 51,
    "borderRadius": 14,
    "backgroundColor": "#005744",
    "marginTop": 18,
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 8,
    "display": "flex"
  },
  "createPageButtonText": {
    "color": "#FFFFFF",
    "fontSize": 14,
    "fontWeight": 900
  },
  "accountTitle": {
    "marginTop": 30
  },
  "legalTitle": {
    "marginTop": 28
  },
  "settings": {
    "backgroundColor": "#FFFFFF",
    "borderRadius": 20,
    "paddingLeft": 16,
    "paddingRight": 16,
    "overflow": "hidden"
  },
  "settingRow": {
    "height": 61,
    "flexDirection": "row",
    "alignItems": "center",
    "gap": 12,
    "display": "flex"
  },
  "settingLabel": {
    "flex": 1,
    "color": "#222222",
    "fontSize": 14,
    "fontWeight": 800
  },
  "deleteAccountLabel": {
    "color": "#B42318"
  },
  "divider": {
    "height": 1,
    "backgroundColor": "#EEEEEE",
    "marginLeft": 33
  },
  "signOut": {
    "height": 55,
    "backgroundColor": "#FFFFFF",
    "borderRadius": 18,
    "marginTop": 18,
    "flexDirection": "row",
    "alignItems": "center",
    "justifyContent": "center",
    "gap": 8,
    "display": "flex"
  },
  "signOutText": {
    "color": "#B42318",
    "fontSize": 14,
    "fontWeight": 900
  }
} satisfies Record<string, CSSProperties>;