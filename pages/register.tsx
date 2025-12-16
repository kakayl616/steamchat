import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const signUp = async (e: any) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return setError(error.message);
    router.push("/login");
  };

  return (
    <div>
      <h1>Create Account</h1>
      <form onSubmit={signUp}>
        <input placeholder="Email" onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
        <button>Create Account</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
}
