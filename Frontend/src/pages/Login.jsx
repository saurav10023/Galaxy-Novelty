// pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const AUTH_API = `${import.meta.env.VITE_API_URL}/api/v1/admin`;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!mobileNumber.trim() || !password) {
      setError("Mobile number and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${AUTH_API}/login`,
        { mobileNumber: mobileNumber.trim(), password },
        { withCredentials: true }
      );

      // controller returns { data: { user, accessToken, refreshToken } }
      login(res.data.data);
      navigate("/admin/");
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full max-w-[100vw] overflow-x-hidden flex items-center justify-center bg-white px-6 py-10">
      {/* Ambient glow blobs — slow independent drift, always low-opacity wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-16 w-[min(480px,140vw)] h-[480px] rounded-full bg-gradient-to-r from-fuchsia-300/40 via-cyan-200/30 to-transparent blur-3xl login-blob-a"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 w-[min(520px,140vw)] h-[520px] rounded-full bg-gradient-to-r from-cyan-200/30 via-fuchsia-200/30 to-transparent blur-3xl login-blob-b"
      />

      <div className="relative w-full max-w-sm login-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] bg-white/80 backdrop-blur-md border border-slate-200 rounded-full px-3.5 py-1.5 mb-4">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-60 login-dot-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-500" />
            </span>
            <span className="text-slate-500">Admin access</span>
          </div>
          <h1 className="font-display text-[24px] font-semibold text-slate-900 tracking-tight leading-[1.05]">
            Staff login
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1.5">
            Sign in to manage products and orders.
          </p>
        </div>

        {/* Card — signature detail: a die-cut access-badge notch at the top
            edge plus a gradient hairline, echoing a physical keycard rather
            than a generic form panel. */}
        <div className="relative">
          <div className="absolute left-1/2 -top-px -translate-x-1/2 h-[3px] w-16 rounded-b-full bg-gradient-to-r from-fuchsia-500 to-cyan-500" />
          <form
            onSubmit={handleSubmit}
            className="bg-white/75 backdrop-blur-xl border border-slate-200 rounded-[20px] p-6 shadow-[0_24px_60px_-28px_rgba(217,70,239,0.35)]"
          >
            {error && (
              <div className="mb-4 rounded-xl bg-rose-50/80 border border-rose-200 px-3.5 py-2.5 text-[13px] text-rose-600 login-error-enter">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="mobileNumber"
                className="block font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-1.5"
              >
                Mobile number
              </label>
              <input
                id="mobileNumber"
                type="tel"
                autoComplete="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="9876543210"
                className="w-full font-mono text-[14px] bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2.5 min-h-[44px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400/15"
              />
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="block font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full font-mono text-[14px] bg-white/70 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-16 min-h-[44px] text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-150 focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-400/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] uppercase tracking-wide text-slate-400 hover:text-fuchsia-600 transition-colors duration-150"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="relative w-full overflow-hidden rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-[14px] font-medium py-2.5 min-h-[44px] shadow-[0_16px_36px_-16px_rgba(217,70,239,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-16px_rgba(217,70,239,0.65)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {submitting ? "Signing in…" : "Sign in"}
              </span>
              {!submitting && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 login-btn-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent"
                />
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes login-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(28px, 18px) scale(1.08); }
        }
        @keyframes login-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-24px, -16px) scale(1.1); }
        }
        @keyframes login-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-shake-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-ping {
          0% { transform: scale(1); opacity: 0.6; }
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes login-sweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        .login-blob-a { animation: login-drift-a 16s ease-in-out infinite; }
        .login-blob-b { animation: login-drift-b 20s ease-in-out infinite; }
        .login-enter { animation: login-fade-up 0.5s cubic-bezier(.2,.8,.3,1.1) both; }
        .login-error-enter { animation: login-shake-in 0.3s ease both; }
        .login-dot-ping { animation: login-ping 1.8s cubic-bezier(0,0,0.2,1) infinite; }
        .login-btn-sweep { animation: login-sweep 2.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .login-blob-a, .login-blob-b, .login-dot-ping, .login-btn-sweep {
            animation: none !important;
          }
          .login-enter, .login-error-enter {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;