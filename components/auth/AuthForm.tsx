"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  onAuthenticated?: () => void;
};

const EMAIL_REGEX =
  /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;

const PASSWORD_ALLOWED =
  /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{}|;:'",.<>/?\\~`]+$/;

const COMMON_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];

function levenshtein(a: string, b: string) {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp: number[] = Array(bl + 1).fill(0);
  for (let j = 0; j <= bl; j++) dp[j] = j;
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[bl];
}

export default function AuthForm({ onAuthenticated }: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<"main" | "email" | "phone">("main");
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const win: any = window;
    if (!recaptchaRef.current) return;
    if (!win?.recaptchaVerifier) {
      try {
        win.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          recaptchaRef.current,
          { size: "invisible" }
        );
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!resendAvailableAt) {
      setResendCountdown(0);
      return;
    }
    const t = setInterval(() => {
      const diff = Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000));
      setResendCountdown(diff);
      if (diff <= 0) {
        clearInterval(t);
        setResendAvailableAt(null);
      }
    }, 300);
    return () => clearInterval(t);
  }, [resendAvailableAt]);

  function validateEmailStructure(v: string) {
    if (!v) return "Email is required";
    if (!EMAIL_REGEX.test(v)) return "Invalid email format";
    return null;
  }

  function fuzzyDomainWarning(v: string) {
    try {
      const parts = v.split("@");
      if (parts.length !== 2) return null;
      const domain = parts[1].toLowerCase();
      for (const d of COMMON_DOMAINS) {
        if (levenshtein(domain, d) === 1) {
          return `Did you mean ${parts[0]}@${d}?`;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  function validatePassword(v: string) {
    if (!v) return "Password is required";
    if (v.length < 8) return "Password must be at least 8 characters";
    if (!PASSWORD_ALLOWED.test(v)) return "Password contains unsupported characters";
    return null;
  }

  async function postRegisterHost(idToken: string, name: string | null, phoneVal: string | null) {
    const res = await fetch("/api/register-host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, name, phone: phoneVal }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`register-host failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function postLogin(idToken: string) {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "same-origin",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`login failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function handleEmailSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setEmailError(null);
    setEmailWarning(null);
    setPasswordError(null);

    const emErr = validateEmailStructure(email);
    const pwErr = validatePassword(password);
    if (emErr) return setEmailError(emErr);
    if (pwErr) return setPasswordError(pwErr);

    setEmailWarning(fuzzyDomainWarning(email));

    setLoadingEmail(true);
    try {
      const cred = isRegister
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      const token = await cred.user.getIdToken();

      try {
        await postRegisterHost(token, email.split("@")[0], null);
      } catch (err) {
        console.warn("register-host warning:", err);
      }

      await postLogin(token);
      toast.success(isRegister ? "Registered & logged in" : "Logged in");
      onAuthenticated?.();
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Authentication failed");
    } finally {
      setLoadingEmail(false);
    }
  }

  async function handleGoogle() {
    setLoadingGoogle(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const token = await cred.user.getIdToken();

      try {
        await postRegisterHost(
          token,
          cred.user.displayName || cred.user.email?.split("@")[0] || null,
          null
        );
      } catch (err) {}

      await postLogin(token);
      toast.success("Signed in with Google");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Google sign-in failed");
    } finally {
      setLoadingGoogle(false);
    }
  }

  async function sendOtp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      return toast.error("Please enter a valid 10-digit number");
    }

    const formatted = "+91" + digits;
    setSendingOtp(true);

    try {
      const win: any = window;
      const verifier = win.recaptchaVerifier;
      if (!verifier) throw new Error("Recaptcha missing");

      const confirmation = await signInWithPhoneNumber(auth, formatted, verifier);
      win.confirmationResult = confirmation;

      setOtpSent(true);
      setResendAvailableAt(Date.now() + 30000);
      toast.success("OTP sent");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  }

  async function resendOtp() {
    if (resendCountdown > 0) return;
    await sendOtp();
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setVerifyingOtp(true);

    try {
      const win: any = window;
      const confirmation = win.confirmationResult;
      if (!confirmation) throw new Error("No OTP request found");

      const cred = await confirmation.confirm(otp);
      const token = await cred.user.getIdToken();

      try {
        await postRegisterHost(token, cred.user.displayName || "PhoneUser", "+91" + phone);
      } catch {}

      await postLogin(token);
      toast.success("Phone sign-in success");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "OTP failed");
    } finally {
      setVerifyingOtp(false);
    }
  }

  /* ===================== THEMED UI ====================== */

  return (
    <div className="w-full max-w-md text-white">

      {mode === "main" && (
        <div className="space-y-4">
          <Button
            className="w-full bg-blue-700 hover:bg-blue-600 text-white shadow-lg"
            onClick={() => {
              setMode("email");
              setIsRegister(false);
            }}
          >
            Continue with Email
          </Button>

          <Button
            variant="outline"
            className="w-full border-white/40 text-blue-900 hover:bg-yellow-100"
            onClick={handleGoogle}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? "Signing in..." : "Continue with Google"}
          </Button>

          <Button
            className="w-full bg-blue-700 hover:bg-blue-600 text-white shadow-lg"
            onClick={() => setMode("phone")}
          >
            Continue with Phone
          </Button>
        </div>
      )}

      {mode === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {isRegister ? "Register with Email" : "Login with Email"}
            </h2>

            <button
              type="button"
              className="text-sm text-blue-300 hover:text-blue-400"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Already a user?" : "New user? Join"}
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1 text-blue-200">Email</label>
            <Input
              type="email"
              className="bg-[#0F1A39] border-blue-900 text-white placeholder:text-slate-400"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
                setEmailWarning(null);
              }}
              onBlur={() => {
                const err = validateEmailStructure(email);
                setEmailError(err);
                setEmailWarning(err ? null : fuzzyDomainWarning(email));
              }}
            />
            {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
            {!emailError && emailWarning && (
              <p className="text-yellow-400 text-sm">{emailWarning}</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1 text-blue-200">Password</label>
            <Input
              type="password"
              className="bg-[#0F1A39] border-blue-900 text-white placeholder:text-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordError(validatePassword(password))}
            />
            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white"
              disabled={loadingEmail}
            >
              {loadingEmail ? (isRegister ? "Registering..." : "Signing in...") : isRegister ? "Register" : "Login"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-white hover:text-blue-800"
              onClick={() => setMode("main")}
            >
              Back
            </Button>
          </div>
        </form>
      )}

      {mode === "phone" && (
        <div className="space-y-4">

          {!otpSent && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Phone Sign-in</h2>
                <button
                  className="text-sm text-white hover:text-red-300"
                  onClick={() => setMode("main")}
                >
                  Back
                </button>
              </div>

              <div>
                <label className="block text-sm mb-1 text-blue-200">Phone Number</label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 font-medium">+91</span>

                  <Input
                    className="pl-12 bg-[#0F1A39] border-blue-900 text-white"
                    value={phone.replace(/\D/g, "").slice(0, 10)}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="9876543210"
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-blue-300 mt-1">Enter 10-digit mobile number</p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-blue-700 hover:bg-blue-600 text-white"
                  onClick={sendOtp}
                  disabled={sendingOtp || phone.length !== 10}
                >
                  {sendingOtp ? "Sending..." : "Send OTP"}
                </Button>

                <Button
                  variant="ghost"
                  className="text-white hover:text-blue-800"
                  onClick={() => setMode("main")}
                >
                  Cancel
                </Button>
              </div>

              <div ref={recaptchaRef} />
            </>
          )}

          {otpSent && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Enter OTP</h2>
                <button
                  className="text-sm text-blue-300 hover:text-blue-400"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                >
                  Cancel
                </button>
              </div>

              <div className="bg-[#0F1A39] border border-blue-900 p-3 rounded-lg">
                <p className="text-blue-300 text-sm">OTP sent to</p>
                <p className="text-white text-sm font-semibold">
                  +91 {phone.padStart(10, "•")}
                </p>
              </div>

              <div>
                <label className="block text-sm mb-1 text-blue-200">OTP</label>
                <Input
                  className="bg-[#0F1A39] border-blue-900 text-white"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={verifyOtp}
                  disabled={verifyingOtp}
                  className="bg-blue-700 hover:bg-blue-600 text-white"
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </Button>

                <Button
                  variant="outline"
                  className="border-blue-800 text-blue-200 hover:bg-blue-900/40"
                  onClick={resendOtp}
                  disabled={resendCountdown > 0 || sendingOtp}
                >
                  {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
