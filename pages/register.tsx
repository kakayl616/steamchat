import { useState } from "react";
import { supabaseBrowser } from "../lib/supabaseBrowser";
import { useRouter } from "next/router";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const { error } = await supabaseBrowser.auth.signUp({
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
