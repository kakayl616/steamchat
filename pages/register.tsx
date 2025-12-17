import { useState } from "react";
import { useRouter } from "next/router";
import { supabaseBrowser } from "../lib/supabaseBrowser";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/login");
  };

  return (
    <div style={{ maxWidth: 420, margin: "auto" }}>
      <h1>Create Account</h1>

      <form onSubmit={signUp}>
        <input
          type="email"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button>Create Account</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
