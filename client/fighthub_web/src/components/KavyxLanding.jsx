"use client";

import { useMemo, useState } from "react";
import {
  MotionDiv,
  MotionA,
  MotionButton,
  useFadeUpVariants,
} from "./Motion"

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/15 grid place-items-center">
        <span className="text-lg font-semibold tracking-tight">K</span>
      </div>
      <div className="leading-tight">
        <div className="text-sm tracking-[0.2em] text-white/70">KAVYX</div>
        <div className="text-xs text-white/50">fight intelligence</div>
      </div>
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
      {children}
    </span>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">
      {children}
    </span>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <p className="mt-2 text-sm text-white/70 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function KavyxLanding() {
  const v = useFadeUpVariants();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "idle", msg: "" });

  const year = useMemo(() => new Date().getFullYear(), []);

  async function onSubmit(e) {
    e.preventDefault();
    setStatus({ type: "loading", msg: "Submitting…" });

    // Replace this with your API route when ready:
    // await fetch("/api/waitlist", { method: "POST", body: JSON.stringify({ email }) })
    // For now, fake success.
    await new Promise((r) => setTimeout(r, 450));

    if (!email || !email.includes("@")) {
      setStatus({ type: "error", msg: "Enter a real email." });
      return;
    }

    setStatus({
      type: "success",
      msg: "You’re on the list. Watch your inbox.",
    });
    setEmail("");
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute top-40 right-[-120px] h-[420px] w-[420px] rounded-full bg-white/6 blur-3xl" />
        <div className="absolute bottom-[-220px] left-[-180px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),rgba(0,0,0,0.0)_55%)]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto max-w-6xl px-5 pt-6">
        <div className="flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a className="hover:text-white transition" href="#features">
              Features
            </a>
            <a className="hover:text-white transition" href="#for">
              For You
            </a>
            <a className="hover:text-white transition" href="#waitlist">
              Waitlist
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#waitlist"
              className="rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition"
            >
              Get early access
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-12 md:pt-16">
        <MotionDiv
          variants={v.container}
          initial="hidden"
          animate="show"
          className="grid gap-10 md:grid-cols-12 md:gap-8 items-center"
        >
          <MotionDiv variants={v.item} className="md:col-span-7">
            <div className="flex flex-wrap gap-2">
              <Badge>Fight intelligence</Badge>
              <Badge>Discovery</Badge>
              <Badge>Video + data</Badge>
            </div>

            <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
              KAVYX finds talent.
              <span className="block text-white/70">
                Fast. Fair. Brutally efficient.
              </span>
            </h1>

            <p className="mt-5 text-base md:text-lg text-white/70 leading-relaxed max-w-xl">
              Fighters get discovered without begging for connections. Scouts
              stop wasting hours scrolling noise. KAVYX turns fight video +
              profiles into a search and ranking engine.
            </p>

            <MotionDiv
              variants={v.item}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <a
                href="#waitlist"
                className="rounded-xl bg-white text-black px-5 py-3 text-sm font-semibold hover:bg-white/90 transition"
              >
                Join the waitlist
              </a>
              <a
                href="#features"
                className="rounded-xl bg-white/5 text-white px-5 py-3 text-sm font-semibold ring-1 ring-white/12 hover:bg-white/8 transition"
              >
                See what it does
              </a>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="inline-block h-2 w-2 rounded-full bg-white/50" />
                Built for fighters & scouts
              </div>
            </MotionDiv>

            <MotionDiv variants={v.item} className="mt-8 flex flex-wrap gap-2">
              <Pill>Filters: weight • region • record</Pill>
              <Pill>Profiles that don’t lie</Pill>
              <Pill>Clip-first scouting</Pill>
            </MotionDiv>
          </MotionDiv>

          <MotionDiv variants={v.item} className="md:col-span-5">
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold tracking-tight">
                  Scout Dashboard
                </div>
                <span className="text-xs text-white/50">prototype</span>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  { k: "Match Quality", v: "High" },
                  { k: "Nearby Prospects", v: "12" },
                  { k: "Avg. Response Time", v: "2h" },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 ring-1 ring-white/10"
                  >
                    <div className="text-sm text-white/70">{row.k}</div>
                    <div className="text-sm font-semibold">{row.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-xs text-white/50">Top signal</div>
                <div className="mt-1 text-sm font-semibold">
                  Pressure + pace stays high after 2nd round
                </div>
                <div className="mt-2 text-sm text-white/70">
                  KAVYX flags fighters whose clips show repeatable patterns.
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <div className="h-2 w-2 rounded-full bg-white/50" />
                <div className="h-2 w-2 rounded-full bg-white/25" />
                <div className="h-2 w-2 rounded-full bg-white/25" />
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>

        {/* Social proof strip */}
        <section className="mt-14 rounded-3xl bg-white/4 ring-1 ring-white/10 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-sm font-semibold tracking-tight">
                What KAVYX replaces
              </div>
              <p className="mt-1 text-sm text-white/70 max-w-xl">
                Instagram scrolling, gatekept matchups, missing records, and “my
                coach knows a guy.”
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-2xl font-semibold">1</div>
                <div className="mt-1 text-xs text-white/60">profile format</div>
              </div>
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-2xl font-semibold">0</div>
                <div className="mt-1 text-xs text-white/60">guesswork</div>
              </div>
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-2xl font-semibold">∞</div>
                <div className="mt-1 text-xs text-white/60">opportunity</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Built to cut through noise
              </h2>
              <p className="mt-2 text-sm md:text-base text-white/70 max-w-2xl">
                A platform that treats fighters like athletes, not content
                creators. Clean scouting, fast outreach, and consistent
                profiles.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Feature
              title="Real profiles"
              desc="Weight class, record, gym, region—structured and searchable. No more missing basics."
            />
            <Feature
              title="Clip-first scouting"
              desc="Lead with video. Scouts evaluate quickly, fighters showcase what matters."
            />
            <Feature
              title="Filters that matter"
              desc="Find the right matchup in minutes: size, style, experience, location, availability."
            />
            <Feature
              title="Direct outreach"
              desc="Message fighters with context. Reduce back-and-forth and speed up bookings."
            />
            <Feature
              title="Signals over hype"
              desc="KAVYX can evolve into analysis: pace, pressure, patterns—repeatable traits."
            />
            <Feature
              title="Fair discovery"
              desc="Visibility isn’t reserved for whoever already knows the right people."
            />
          </div>
        </section>

        {/* For fighters/scouts */}
        <section id="for" className="mt-16 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
            <div className="text-xs text-white/60 tracking-[0.2em]">
              FOR FIGHTERS
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              Get seen without begging
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                One clean profile scouts can actually use.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                Clips that show your style, not your follower count.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                Faster match opportunities when you’re ready.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
            <div className="text-xs text-white/60 tracking-[0.2em]">
              FOR SCOUTS
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">
              Stop scrolling. Start booking.
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                Filters to find the exact fighter you need.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                Quick evaluation with consistent video layouts.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                Message, confirm, move—no wasted cycles.
              </li>
            </ul>
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="mt-16">
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">
                  Get early access
                </h3>
                <p className="mt-2 text-sm md:text-base text-white/70 max-w-xl">
                  Join the waitlist. If you’re a fighter or scout, you’ll get
                  first access to the private beta.
                </p>
              </div>

              <form onSubmit={onSubmit} className="w-full md:max-w-md">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl bg-black/40 px-4 py-3 text-sm outline-none ring-1 ring-white/12 focus:ring-white/25"
                  />
                  <MotionButton
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "rounded-xl px-5 py-3 text-sm font-semibold transition",
                      "bg-white text-black hover:bg-white/90",
                      status.type === "loading" &&
                        "opacity-70 cursor-not-allowed",
                    )}
                    disabled={status.type === "loading"}
                    type="submit"
                  >
                    {status.type === "loading" ? "Sending…" : "Join"}
                  </MotionButton>
                </div>

                <div className="mt-3 min-h-[18px] text-xs">
                  {status.type === "error" && (
                    <span className="text-red-300">{status.msg}</span>
                  )}
                  {status.type === "success" && (
                    <span className="text-emerald-300">{status.msg}</span>
                  )}
                  {status.type === "loading" && (
                    <span className="text-white/60">{status.msg}</span>
                  )}
                </div>

                <div className="mt-2 text-xs text-white/50">
                  No spam. One email when beta opens.
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-white/55">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/15 grid place-items-center">
              <span className="text-sm font-semibold">K</span>
            </div>
            <div>
              <div className="text-white/70 font-semibold tracking-tight">
                KAVYX
              </div>
              <div className="text-xs text-white/45">
                © {year} — All rights reserved
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <a className="hover:text-white transition" href="#features">
              Features
            </a>
            <a className="hover:text-white transition" href="#for">
              For fighters & scouts
            </a>
            <a className="hover:text-white transition" href="#waitlist">
              Waitlist
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
