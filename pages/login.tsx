import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const signIn = async (e: any) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // ✅ Full reload so cookies attach before SSR
    window.location.href = "/dashboard";
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: "420px", margin: "auto" }}>

        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>
          Login
        </h1>

        <p style={{ textAlign: "center", opacity: 0.7, marginBottom: "20px" }}>
          Access your account
        </p>

        <form onSubmit={signIn}>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <button disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>

        {error && (
          <p style={{ color: "#f87171", textAlign: "center", marginTop: "10px" }}>
            {error}
          </p>
        )}

        <p style={{ textAlign: "center", marginTop: "15px", fontSize: "0.9rem" }}>
          Don’t have an account?{" "}
          <a href="/register">Create one</a>
        </p>

      </div>
    </div>
  );
}
