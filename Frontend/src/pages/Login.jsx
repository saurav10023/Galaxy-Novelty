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
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#F3F4F1] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-[22px] font-semibold text-[#14171C] tracking-tight">
            Staff login
          </h1>
          <p className="text-[13.5px] text-[#4B4F57] mt-1">
            Sign in to manage products and orders.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E1E3DD] rounded-2xl p-6 shadow-[0_16px_40px_-16px_rgba(20,23,28,0.15)]"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-[#FBEAE7] border border-[#F2C6BD] px-3.5 py-2.5 text-[13px] text-[#C0402E]">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="mobileNumber"
              className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5"
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
              className="w-full font-mono text-[14px] bg-[#F6F7F3] border border-[#E1E3DD] rounded-lg px-3.5 py-2.5 text-[#14171C] placeholder:text-[#9CA0A6] focus:outline-none focus:border-[#2F5DFF] transition-colors"
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="block font-mono text-[10.5px] uppercase tracking-wider text-[#9CA0A6] mb-1.5"
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
                className="w-full font-mono text-[14px] bg-[#F6F7F3] border border-[#E1E3DD] rounded-lg px-3.5 py-2.5 pr-16 text-[#14171C] placeholder:text-[#9CA0A6] focus:outline-none focus:border-[#2F5DFF] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-[#4B4F57] hover:text-[#14171C]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#14171C] text-white text-[14px] font-medium py-2.5 hover:bg-[#2F5DFF] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;