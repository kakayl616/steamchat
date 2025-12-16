import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {

  const router = useRouter();

  useEffect(() => {
    // Add class only for generated Steam pages
    if (router.pathname.startsWith("/profile/")) {
      document.body.classList.add("no-global-style");
    } else {
      document.body.classList.remove("no-global-style");
    }
  }, [router.pathname]);

  return <Component {...pageProps} />;
}
