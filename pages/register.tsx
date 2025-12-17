import { useState } from "react";
import { useRouter } from "next/router";
import { supabaseBrowser } from "../lib/supabaseBrowser";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } =
      await supabaseBrowser.auth.signUp({
        email,
        password,
      });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/login");
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: "auto" }}>
        <h1>Create Account</h1>

        <form onSubmit={signUp}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        {error && (
          <p style={{ color: "red", marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
