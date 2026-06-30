import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Concertly" },
      { name: "description", content: "Sign in to Concertly to log every show and unlock your live music stats." },
      { property: "og:title", content: "Sign in · Concertly" },
      { property: "og:description", content: "Sign in to Concertly to log every show and unlock your live music stats." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://concertly.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://concertly.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot-password") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/profile`,
        });
        if (error) throw error;
        toast.success("Reset link sent 📩", { description: "Check your email inbox for instructions." });
        setMode("sign-in");
      } else if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Concertly 🎟️", { description: "Your account is ready." });
        nav({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    nav({ to: "/dashboard" });
  }

  return (
    <main className="grid min-h-screen bg-background text-foreground md:grid-cols-2">
      {/* Left — visual side */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-pink to-teal p-12 md:flex">
        <Link to="/" className="font-display text-3xl font-extrabold tracking-tighter text-brand-foreground">
          CONCERTLY
        </Link>
        <div className="relative z-10">
          <h2 className="font-display text-5xl font-black leading-[0.95] text-brand-foreground">
            Track every show.
            <br />
            Discover your live music story.
          </h2>
          <p className="mt-4 max-w-md text-sm text-brand-foreground/80">
            The stats.fm for concerts — rich personal analytics, year-in-review
            wraps and shareable cards for every gig you've ever attended.
          </p>
        </div>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </aside>

      {/* Right — form */}
      <section className="flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-10 inline-block font-display text-2xl font-extrabold tracking-tighter text-brand md:hidden">
            CONCERTLY
          </Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            {mode === "sign-in" ? "Welcome back." : mode === "sign-up" ? "Start your archive." : "Reset password."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "Sign in to pick up where you left off."
              : mode === "sign-up"
                ? "Create an account and log your first show in seconds."
                : "Enter your account email to receive a reset link."}
          </p>

          {mode !== "forgot-password" && (
            <>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-hairline bg-surface px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface-2 disabled:opacity-60"
              >
                <GoogleIcon /> Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-hairline" /> or email <span className="h-px flex-1 bg-hairline" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={mode === "forgot-password" ? "mt-8 space-y-3" : "space-y-3"}>
            {mode === "sign-up" && (
              <input
                type="text"
                required
                autoComplete="name"
                aria-label="Display name"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputCls}
              />
            )}
            <input
              type="email"
              required
              autoComplete="email"
              aria-label="Email address"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
            {mode !== "forgot-password" && (
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                aria-label="Password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            )}
            {mode === "sign-in" && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setMode("forgot-password")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-brand py-3 text-sm font-bold text-brand-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {loading ? "Just a sec…" : mode === "sign-in" ? "Sign in" : mode === "sign-up" ? "Create account" : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? "New to Concertly?" : mode === "sign-up" ? "Already have an account?" : "Remember your password?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "sign-up" ? "sign-in" : mode === "forgot-password" ? "sign-in" : "sign-up")}
              className="font-semibold text-brand hover:underline"
            >
              {mode === "sign-up" ? "Sign in" : mode === "forgot-password" ? "Back to sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-1.9 1.3-4.4 2.1-7.2 2.1-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41 35.1 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
