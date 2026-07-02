import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, Phone, User, Lock,
  ArrowRight, Camera, Loader2, CheckCircle2, MapPin
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { auth } from "../firebase"; // your firebase config

export default function Register() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                         = useState("mobile");
  const [mobileNumber, setMobileNumber]         = useState("");
  const [otp, setOtp]                           = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [formData, setFormData]                 = useState({ username: "", password: "" });
  const [address, setAddress]                   = useState({ street: "", city: "", state: "", pincode: "" });
  const [avatar, setAvatar]                     = useState(null);
  const [avatarPreview, setAvatarPreview]       = useState(null);
  const [showPassword, setShowPassword]         = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState("");
  const [isDuplicateError, setIsDuplicateError] = useState(false);
  const recaptchaRef                            = useRef(null);

  const isMobileValid = /^[0-9]{10}$/.test(mobileNumber);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const stepIndex = { mobile: 0, otp: 1, details: 2 }[step];
  const steps     = ["Mobile", "OTP", "Details"];

  /* ── Step 1: Send OTP via Firebase ── */
  const handleSendOTP = async () => {
    if (!isMobileValid) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    setError("");

    try {
      // Set up recaptcha
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          recaptchaRef.current,
          { size: "invisible" }
        );
      }

      const phoneNumber = `+91${mobileNumber}`;
      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        window.recaptchaVerifier
      );

      setConfirmationResult(result);
      setStep("otp");
    } catch (err) {
      console.error(err);
      // Reset recaptcha on failure
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      setError(err.message || "Failed to send OTP. Try again.");
    } finally { setLoading(false); }
  };

  /* ── Step 2: Verify OTP & call backend verify-mobile ── */
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setLoading(true);
    setError("");

    try {
      // Verify with Firebase
      const result = await confirmationResult.confirm(otp);
      const firebaseToken = await result.user.getIdToken();

      // Tell backend mobile is verified
      await API.post(
        "/api/v1/users/verify-mobile",
        {},
        { headers: { Authorization: `Bearer ${firebaseToken}` } }
      );

      // Store token for registration step
      sessionStorage.setItem("firebaseToken", firebaseToken);
      setStep("details");
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (message === "Mobile number already registered") {
        setError("This mobile number is already registered.");
        setIsDuplicateError(true);
      } else {
        setError(message || "Invalid OTP. Try again.");
      }
    } finally { setLoading(false); }
  };

  /* ── Step 3: Register ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setError("Username and password are required");
      return;
    }
    setLoading(true);
    setError("");
    setIsDuplicateError(false);

    try {
      const firebaseToken = sessionStorage.getItem("firebaseToken");

      if (!firebaseToken) {
        setError("Session expired. Please verify your mobile number again.");
        setStep("mobile");
        return;
      }

      const data = new FormData();
      data.append("username", formData.username);
      data.append("password", formData.password);
      if (address.street) data.append("address", JSON.stringify(address));
      if (avatar) data.append("avatar", avatar);

      const res = await API.post(
        "/api/v1/users/register",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${firebaseToken}`
          }
        }
      );

      sessionStorage.removeItem("firebaseToken");
      login(res.data.data);
      navigate("/");
    } catch (err) {
      const message = err.response?.data?.message || "";
      if (message === "Username already exists") {
        setError("This username is already taken.");
        setIsDuplicateError(true);
      } else if (message === "Mobile number already exists") {
        setError("This mobile number is already registered.");
        setIsDuplicateError(true);
      } else {
        setError(message || "Registration failed. Please try again.");
      }
    } finally { setLoading(false); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) { setAvatar(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const handleResendOTP = async () => {
    setOtp("");
    setError("");
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    await handleSendOTP();
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-all
            ${i < stepIndex  ? "bg-blue-600 text-white"
            : i === stepIndex ? "bg-blue-600 text-white ring-4 ring-blue-100"
            : "bg-gray-100 text-gray-400"}`}>
            {i < stepIndex ? "✓" : i + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${i === stepIndex ? "text-blue-600" : "text-gray-400"}`}>
            {s}
          </span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-1 ${i < stepIndex ? "bg-blue-600" : "bg-gray-100"}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Invisible recaptcha container */}
      <div ref={recaptchaRef} />

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-600">
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-lg leading-none">
              🏫
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-white text-base tracking-tight">The Little Kingdom</span>
              <span className="font-light text-blue-200 text-xs tracking-widest uppercase">Store</span>
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight">
              Join the Happy Parents Club<br />
              <span className="text-blue-200">happy parents.</span>
            </h1>
            <p className="text-blue-100 text-base font-light max-w-xs">
              Create an account and start shopping for your school essentials today.
            </p>
          </div>
          <p className="text-blue-200 text-sm">© {new Date().getFullYear()} The Little Kingdom. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex justify-center items-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-base leading-none">
              🏫
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-gray-900 text-base tracking-tight">The Little Kingdom</span>
              <span className="font-light text-blue-600 text-xs tracking-widest uppercase">Store</span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900">Create account</h2>
            <p className="text-gray-500 text-sm">
              {step === "mobile"  && "Enter your mobile number to get started"}
              {step === "otp"     && `OTP sent to +91 ${mobileNumber}`}
              {step === "details" && "Almost done — fill in your details"}
            </p>
          </div>

          <StepIndicator />

          {/* Error */}
          {error && (
            <div className="flex flex-col gap-1 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                {error}
              </div>
              {isDuplicateError && (
                <p className="text-xs text-red-500 pl-3 mt-0.5">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold underline hover:text-red-700">Sign in here</Link>
                </p>
              )}
            </div>
          )}

          {/* ── Step 1: Mobile ── */}
          {step === "mobile" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                  <span className="px-3 py-3 bg-gray-50 text-sm text-gray-500 border-r border-gray-200 font-medium">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value.replace(/\D/, ""))}
                    onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                    className="flex-1 px-3 py-3 text-sm outline-none text-gray-800"
                  />
                </div>
                {mobileNumber && (
                  <p className={`text-xs pl-1 ${isMobileValid ? "text-green-500" : "text-gray-400"}`}>
                    {mobileNumber.length}/10 digits {isMobileValid && "✓"}
                  </p>
                )}
              </div>
              <button
                onClick={handleSendOTP}
                disabled={loading || !isMobileValid}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Sending OTP...</>
                  : <>Send OTP <ArrowRight size={15} /></>}
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Enter OTP</label>
                <input
                  type="tel"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/, ""))}
                  onKeyDown={e => e.key === "Enter" && handleVerifyOTP()}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-[0.5em] text-center font-bold bg-white"
                />
                <p className="text-xs text-gray-400 text-center">
                  OTP sent to +91 {mobileNumber} — expires in 10 minutes
                </p>
              </div>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Verifying...</>
                  : <>Verify OTP <ArrowRight size={15} /></>}
              </button>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setStep("mobile"); setOtp(""); setError(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ← Change number
                </button>
                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-xs text-blue-600 hover:underline font-medium disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Details ── */}
          {step === "details" && (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Verified mobile badge */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                <span className="text-sm text-green-700 font-semibold">+91 {mobileNumber}</span>
                <span className="text-xs text-green-500 ml-auto">Verified</span>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                      : <User size={24} className="text-gray-400" />}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-md">
                    <Camera size={12} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Profile Photo</p>
                  <p className="text-xs text-gray-400">Optional — click the camera icon to upload</p>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-blue-500" />
                  <label className="text-sm font-semibold text-gray-700">Delivery Address</label>
                  <span className="text-xs text-gray-400">(Optional)</span>
                </div>
                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <input
                    type="text"
                    placeholder="House / Flat / Street address"
                    value={address.street}
                    onChange={e => setAddress({ ...address, street: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={address.city}
                      onChange={e => setAddress({ ...address, city: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={address.state}
                      onChange={e => setAddress({ ...address, state: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <input
                    type="tel"
                    maxLength={6}
                    placeholder="Pincode"
                    value={address.pincode}
                    onChange={e => setAddress({ ...address, pincode: e.target.value.replace(/\D/, "") })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all mt-2"
              >
                {loading
                  ? <><Loader2 size={15} className="animate-spin" /> Creating account...</>
                  : <>Create Account <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}