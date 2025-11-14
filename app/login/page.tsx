"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from "firebase/auth";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement | null>(null);

  // Initialize Recaptcha once
  useEffect(() => {
    if (!recaptchaRef.current) return;

    try {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        recaptchaRef.current,
        {
          size: "invisible",
        }
      );
    } catch {
      // ignore if already created
    }
  }, []);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      if (mode === "login") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        toast.success("Logged in");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const idToken = await cred.user.getIdToken();
        await fetch("/api/register-host", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            name: email.split("@")[0],
            phone: null,
          }),
        });
        await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        toast.success("Registered and logged in");
      }
    } catch (error: any) {
      toast.error(error.message || "Error");
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();

      if (mode === "register") {
        await fetch("/api/register-host", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            name: cred.user.displayName || "User",
            phone: null,
          }),
        });
      }

      await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      toast.success("Signed in with Google");
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed");
    }
  };

  const handleSendOtp = async () => {
    if (!phone.startsWith("+")) {
      toast.error("Phone must include country code. Example: +91xxxxxxxxxx");
      return;
    }

    try {
      const verifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      (window as any).confirmationResult = confirmation;
      setOtpSent(true);
      toast.success("OTP sent");
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const confirmation = (window as any).confirmationResult;
      const cred = await confirmation.confirm(otp);
      const idToken = await cred.user.getIdToken();

      if (mode === "register") {
        await fetch("/api/register-host", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            name: "PhoneUser",
            phone,
          }),
        });
      }

      await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      toast.success("Phone login successful");
    } catch (error: any) {
      toast.error(error.message || "OTP incorrect");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white shadow p-8 rounded-lg space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          {mode === "login" ? "Login" : "Register"}
        </h1>

        {/* Email/password */}
        <div className="space-y-2">
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button className="w-full" onClick={handleEmailAuth}>
            {mode === "login" ? "Login with Email" : "Register with Email"}
          </Button>
        </div>

        {/* Google */}
        <div className="space-y-2">
          <Button className="w-full" variant="outline" onClick={handleGoogleAuth}>
            Continue with Google
          </Button>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Input
            placeholder="+91xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {!otpSent ? (
            <Button className="w-full" onClick={handleSendOtp}>
              Send OTP
            </Button>
          ) : (
            <>
              <Input
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <Button className="w-full" onClick={handleVerifyOtp}>
                Verify OTP
              </Button>
            </>
          )}
        </div>

        {/* Mode Switch */}
        <div className="text-center text-sm">
          {mode === "login" ? (
            <>
              New user?{" "}
              <button
                className="text-blue-600 underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already a user?{" "}
              <button
                className="text-blue-600 underline"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </>
          )}
        </div>

        <div ref={recaptchaRef}></div>
      </div>
    </main>
  );
}
