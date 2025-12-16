import React, { useState, ChangeEvent, FormEvent } from "react";
import Head from "next/head";
import { GetServerSidePropsContext } from "next";
import { createClient } from "@supabase/supabase-js";

type SteamProfileData = {
  displayName: string;
  avatar: string;
  profileUrl: string;
  timeCreated: string | null;
};

export default function HomePage() {
  const [steamID, setSteamID] = useState("");
  const [autoData, setAutoData] = useState<SteamProfileData | null>(null);
  const [error, setError] = useState("");
  const [accountStatus, setAccountStatus] = useState("Banned");
  const [activeReports, setActiveReports] = useState(
    `${Math.floor(600 + Math.random() * 1000)}`
  );

  const handleSteamIDChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value;
    setSteamID(id);
    if (id.length > 0) {
      try {
        const res = await fetch(`/api/steam?steamID=${id}`);
        if (!res.ok) {
          setError("Steam profile not found.");
          setAutoData(null);
          return;
        }
        const data: SteamProfileData = await res.json();
        setAutoData(data);
        setError("");
      } catch (err) {
        setError("Failed to fetch Steam profile.");
        setAutoData(null);
      }
    } else {
      setAutoData(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/sites/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steamID,
        accountStatus,
        reports: activeReports,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to save generated site");
      return;
    }

    const url = `/profile/${steamID}?accountStatus=${encodeURIComponent(
      accountStatus
    )}&activeReports=${encodeURIComponent(activeReports)}`;

    window.open(url, "_blank");
  };

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div className="container">
        <div className="form-container">
          <h1>Generate Your Steam Profile Website</h1>
          <form onSubmit={handleSubmit}>
            <label>Steam ID:</label>
            <input
              type="text"
              value={steamID}
              onChange={handleSteamIDChange}
              placeholder="Enter your Steam ID"
              required
            />

            {autoData && (
              <div className="auto-fields">
                <p>
                  <strong>Display Name:</strong> {autoData.displayName}
                </p>
                <p>
                  <strong>Profile URL:</strong>{" "}
                  <a href={autoData.profileUrl} target="_blank" rel="noreferrer">
                    {autoData.profileUrl}
                  </a>
                </p>
                <p>
                  <strong>Account Created:</strong> {autoData.timeCreated}
                </p>
              </div>
            )}

            {error && <p className="error">{error}</p>}

            <label>Account Status:</label>
            <select
              value={accountStatus}
              onChange={(e) => setAccountStatus(e.target.value)}
            >
              <option value="Banned">Banned</option>
              <option value="Good">Good</option>
              <option value="Pending Case">Pending Case</option>
            </select>

            <label>Active Reports:</label>
            <input
              type="number"
              value={activeReports}
              onChange={(e) => setActiveReports(e.target.value)}
              required
            />

            <button type="submit">Generate Website</button>
          </form>
        </div>

        <style jsx>{`
          .container {
            font-family: "Poppins", sans-serif;
            background: #171a21;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .form-container {
            background: #1b2838;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            color: #c7d5e0;
          }
          h1 {
            color: #66c0f4;
            text-align: center;
            margin-bottom: 1.5rem;
          }
          form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          label {
            font-weight: 500;
          }
          input,
          select {
            padding: 0.5rem;
            border-radius: 4px;
            border: none;
            font-size: 1rem;
            transition: all 0.3s ease;
          }
          input:focus,
          select:focus {
            outline: none;
            box-shadow: 0 0 10px rgba(102, 192, 244, 0.6);
          }
          button {
            padding: 0.7rem 1.2rem;
            background: #66c0f4;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            transition: background 0.3s ease;
            color: #171a21;
            align-self: center;
          }
          button:hover {
            background: #4aa3d8;
          }
          .auto-fields p {
            margin: 0.3rem 0;
          }
          .error {
            color: #ff4d4d;
          }
        `}</style>
      </div>
    </>
  );
}

/**
 * ✅ This part runs on the SERVER before rendering the page.
 * If the user is not logged in, they get redirected to /login.
 */
export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find Supabase session cookie
  const cookie = Object.values(ctx.req.cookies).find((v) =>
    v?.includes("access_token")
  );

  // Not logged in → go to /login
  if (!cookie) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const session = JSON.parse(decodeURIComponent(cookie));
  const { data } = await supabase.auth.getUser(session.access_token);

  // Invalid user → go to /login
  if (!data?.user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Logged in → allow page to render
  return { props: {} };
}
