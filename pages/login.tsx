import { useState } from "react";
import { useRouter } from "next/router";
import { supabaseBrowser } from "../lib/supabaseBrowser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signIn = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  const { data, error } = await supabaseBrowser.auth.signInWithPassword({
    email,
    password,
  });

  setLoading(false);

  if (error) {
    setError(error.message);
    return;
  }

  // 🔑 USER IS LOGGED IN HERE
  const user = data.user;

  if (!user) {
    setError("Login failed. No user returned.");
    return;
  }

  // ✅ ADMIN CHECK
  const ADMIN_EMAIL = "zakitheboss21@gmail.com";

  if (user.email === ADMIN_EMAIL) {
    window.location.href = "/admin";
  } else {
    window.location.href = "/dashboard";
  }
};


  return (
    <div style={{ maxWidth: 420, margin: "auto" }}>
      <h1>Login</h1>

      <form onSubmit={signIn}>
        <input
          type="email"
          placeholder="Email"
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

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
