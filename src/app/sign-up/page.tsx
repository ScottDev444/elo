"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      setErrorMessage("Your username must be at least 3 characters long.");
      return;
    }

    if (cleanUsername.length > 30) {
      setErrorMessage("Your username must be 30 characters or fewer.");
      return;
    }

    if (!/^[a-zA-Z0-9 _.-]+$/.test(cleanUsername)) {
      setErrorMessage(
        "Your username can only contain letters, numbers, spaces, dots, dashes and underscores.",
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: cleanUsername,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        await supabase
          .from("users")
          .upsert(
            {
              id: data.user?.id,
              username: cleanUsername,
              role: "user",
            },
            {
              onConflict: "id",
            },
          );

        router.replace("/account");
        router.refresh();
        return;
      }

      setHasSignedUp(true);
    } catch {
      setErrorMessage(
        "Something went wrong while creating your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="elo-signup-page">
      <div className="elo-signup-background" aria-hidden="true">
        <span className="elo-signup-shard shard-one" />
        <span className="elo-signup-shard shard-two" />
        <span className="elo-signup-shard shard-three" />
        <span className="elo-signup-shard shard-four" />
        <span className="elo-signup-shard shard-five" />
        <span className="elo-signup-shard shard-six" />
      </div>

      <div className="elo-signup-scroll">
        <header className="elo-signup-topbar">
          <strong>East Lothian Online</strong>
          <span>Your Community&apos;s Digital Home</span>
        </header>

        <section className="elo-signup-card">
          {hasSignedUp ? (
            <div className="elo-signup-success-wrap">
              <CheckCircle2 className="elo-signup-success-icon" size={48} />
              <h1>Check your inbox.</h1>
              <p className="elo-signup-subtitle">
                We&apos;ve sent a confirmation link to <strong>{email}</strong>.
              </p>
              <Link href="/log-in" className="elo-signup-primary-link">
                Go to login
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              <Link href="/log-in" className="elo-signup-back">
                ‹ Back
              </Link>

              <h1>Join ELO 📍</h1>

              <form onSubmit={handleSubmit} className="elo-signup-form">
                <label htmlFor="username" className="elo-signup-label">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={30}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Choose a username"
                  className="elo-signup-input"
                />

                <label htmlFor="email" className="elo-signup-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="you@example.com"
                  className="elo-signup-input"
                />

                <label htmlFor="password" className="elo-signup-label">
                  Password
                </label>
                <div className="elo-signup-password-container">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isSubmitting}
                    placeholder="Create a password"
                    className="elo-signup-password-input"
                  />
                  <button
                    type="button"
                    className="elo-signup-show-button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>

                <label htmlFor="confirm-password" className="elo-signup-label">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter it again"
                  className="elo-signup-input elo-signup-confirm"
                />

                <p className="elo-signup-hint">Use at least 8 characters.</p>

                {errorMessage ? (
                  <div className="elo-signup-message elo-signup-error" role="alert">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="elo-signup-create"
                >
                  {isSubmitting ? <LoaderCircle size={19} className="elo-signup-spin" /> : null}
                  <span>{isSubmitting ? "Creating account..." : "Create account"}</span>
                </button>
              </form>

              <p className="elo-signup-signin-prompt">
                Already have an account? <Link href="/log-in">Sign in</Link>
              </p>
            </>
          )}
        </section>
      </div>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-signup-page {
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    background: #007B5C;
    color: #111111;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-signup-page *,
  .elo-signup-page *::before,
  .elo-signup-page *::after { box-sizing: border-box; }

  .elo-signup-background {
    position: fixed;
    z-index: 0;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(circle at 80% 18%, rgba(255,255,255,.08), transparent 26%),
      radial-gradient(circle at 10% 80%, rgba(0,0,0,.08), transparent 28%),
      linear-gradient(145deg, #008564 0%, #007B5C 42%, #005744 100%);
  }

  .elo-signup-shard { position: absolute; display: block; opacity: .11; transform: rotate(16deg); }
  .elo-signup-shard.shard-one { top:-90px; left:-120px; width:380px; height:280px; background:#fff; clip-path:polygon(0 0,100% 12%,58% 100%,0 70%); }
  .elo-signup-shard.shard-two { top:0; left:16%; width:360px; height:260px; background:#000; opacity:.055; clip-path:polygon(20% 0,100% 0,72% 100%,0 72%); }
  .elo-signup-shard.shard-three { top:16%; right:-130px; width:430px; height:330px; background:#fff; opacity:.07; clip-path:polygon(35% 0,100% 18%,100% 100%,0 72%); }
  .elo-signup-shard.shard-four { bottom:-150px; left:-90px; width:460px; height:390px; background:#000; opacity:.05; clip-path:polygon(0 18%,70% 0,100% 78%,30% 100%); }
  .elo-signup-shard.shard-five { bottom:-100px; right:4%; width:420px; height:360px; background:#fff; opacity:.06; clip-path:polygon(22% 0,100% 24%,76% 100%,0 78%); }
  .elo-signup-shard.shard-six { top:42%; left:45%; width:350px; height:280px; background:#fff; opacity:.035; clip-path:polygon(0 25%,72% 0,100% 78%,28% 100%); }

  .elo-signup-scroll {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: 18px 22px 38px;
    overflow-y: auto;
  }

  .elo-signup-topbar {
    width:100%; max-width:500px; align-self:center; display:flex; flex-direction:column;
    align-items:center; justify-content:center; margin-bottom:25px; text-align:center;
  }
  .elo-signup-topbar strong { color:#fff; font-size:20px; line-height:25px; font-weight:800; letter-spacing:-.4px; }
  .elo-signup-topbar span { margin-top:3px; color:rgba(255,255,255,.78); font-size:12px; line-height:17px; font-weight:600; }

  .elo-signup-card {
    width:100%; max-width:500px; align-self:center; margin:auto;
    border:1px solid rgba(255,255,255,.36); border-radius:24px;
    background:rgba(255,255,255,.96); padding:24px;
    box-shadow:0 28px 65px rgba(0,44,33,.17),0 4px 18px rgba(0,0,0,.05);
    backdrop-filter:blur(12px);
  }

  .elo-signup-back { display:inline-block; margin-bottom:18px; color:#008564; font-size:15px; font-weight:700; text-decoration:none; }
  .elo-signup-card h1 { margin:0; color:#111; font-size:29px; line-height:35px; font-weight:800; letter-spacing:-.7px; }
  .elo-signup-form { margin-top:26px; }
  .elo-signup-label { display:block; margin:0 0 8px; color:#292929; font-size:14px; line-height:18px; font-weight:700; }

  .elo-signup-input,
  .elo-signup-password-container {
    width:100%; height:54px; border:1px solid #DEDEDE; border-radius:13px; background:#F7F7F7;
  }
  .elo-signup-input { margin-bottom:18px; outline:0; padding:0 15px; color:#111; font-size:16px; }
  .elo-signup-input::placeholder,
  .elo-signup-password-input::placeholder { color:#8C8C8C; }
  .elo-signup-input:focus,
  .elo-signup-password-container:focus-within { border-color:#008564; background:#fff; box-shadow:0 0 0 3px rgba(0,133,100,.09); }

  .elo-signup-password-container { display:flex; align-items:center; margin-bottom:18px; overflow:hidden; }
  .elo-signup-password-input { min-width:0; flex:1; height:100%; border:0; outline:0; background:transparent; padding:0 15px; color:#111; font-size:16px; }
  .elo-signup-show-button { height:100%; display:flex; align-items:center; gap:6px; border:0; background:transparent; padding:0 15px; color:#008564; font-size:13px; font-weight:700; cursor:pointer; }
  .elo-signup-show-button:disabled { cursor:not-allowed; opacity:.6; }
  .elo-signup-confirm { margin-bottom:0; }
  .elo-signup-hint { margin:8px 0 16px; color:#707070; font-size:12px; line-height:18px; }

  .elo-signup-message { margin:0 0 16px; border-radius:13px; padding:12px 14px; font-size:13px; line-height:19px; font-weight:600; }
  .elo-signup-error { background:#fff1f2; color:#9f1239; }

  .elo-signup-create,
  .elo-signup-primary-link {
    width:100%; height:56px; display:flex; align-items:center; justify-content:center; gap:8px;
    border:0; border-radius:13px; background:#008564; color:#fff; font-size:16px; font-weight:800;
    text-decoration:none; cursor:pointer;
  }
  .elo-signup-create:hover,
  .elo-signup-primary-link:hover { background:#00785b; }
  .elo-signup-create:disabled { cursor:not-allowed; opacity:.6; }

  .elo-signup-signin-prompt { margin:20px 0 0; text-align:center; color:#707070; font-size:14px; }
  .elo-signup-signin-prompt a { color:#008564; font-weight:800; text-decoration:none; }

  .elo-signup-success-wrap { text-align:center; }
  .elo-signup-success-icon { margin:0 auto 20px; color:#008564; }
  .elo-signup-success-wrap .elo-signup-subtitle { margin:10px 0 24px; color:#707070; font-size:15px; line-height:23px; }
  .elo-signup-success-wrap .elo-signup-subtitle strong { color:#111; }

  .elo-signup-spin { animation:elo-signup-spin .8s linear infinite; }
  @keyframes elo-signup-spin { to { transform:rotate(360deg); } }

  @media (max-width: 560px) {
    .elo-signup-scroll { padding:18px 16px 28px; }
    .elo-signup-card { padding:22px 18px; border-radius:22px; }
  }
`;
