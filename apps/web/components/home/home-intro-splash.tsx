"use client";

import { useEffect, useState } from "react";

const FADE_DELAY_MS = 2300;
const FADE_DURATION_MS = 1400;

export function HomeIntroSplash() {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible");

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fading"), FADE_DELAY_MS);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), FADE_DELAY_MS + FADE_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div className={`home-intro-splash ${phase === "fading" ? "is-fading" : ""}`} aria-hidden="true">
      <div className="home-intro-splash__backdrop" />
      <div className="home-intro-splash__frame">
        <img
          src="/intro/fgd-banner.jpg"
          alt=""
          className="home-intro-splash__image home-intro-splash__image--desktop"
        />
        <img
          src="/intro/fgd-face.jpg"
          alt=""
          className="home-intro-splash__image home-intro-splash__image--mobile"
        />
      </div>
    </div>
  );
}
