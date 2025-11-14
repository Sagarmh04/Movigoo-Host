"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <main className="min-h-screen w-full bg-[#0A1128] flex items-center justify-center p-4">



      {/* ---------- MOBILE VIEW ---------- */}
      {isMobile && (
        <div className="relative w-full min-h-screen flex items-start justify-center pt-14">

          {/* Background Video (mobile full-screen) */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">

            {/* Fallback image until video loads */}
            {!videoLoaded && (
              <Image
                src="/loginpageimage.jpeg"
                alt="Background"
                fill
                priority
                className="object-cover transition-opacity duration-700 opacity-100"
              />
            )}

            {/* Mobile Video */}
            <video
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                videoLoaded ? "opacity-50" : "opacity-0"
              }`}
              autoPlay
              playsInline
              loop
              muted
              preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
            >
              <source src="/login.mp4" type="video/mp4" />
            </video>

            {/* Dark navy overlay for contrast */}
            <div className="absolute inset-0 bg-[#0A1128]/70" />
          </div>

          {/* Floating Auth Card (MOVED UPWARD) */}
          <div className="relative w-full max-w-md p-6 rounded-2xl shadow-2xl mx-4 mt-10">
            <AuthForm />
          </div>
        </div>
      )}

      {/* ---------- DESKTOP FLOATING LAYOUT ---------- */}
      {!isMobile && (
        <div className="relative flex w-full max-w-5xl h-[520px] bg-[#101C3C] rounded-3xl overflow-hidden shadow-2xl border border-blue-900/40">
          
          {/* LEFT SIDE — Image or Video */}
          <div className="relative w-1/2 h-full overflow-hidden">

            {/* Fallback Image */}
            <Image
              src="/loginpageimage.jpeg"
              alt="Login Illustration"
              fill
              priority
              className={`object-cover transition-opacity duration-700 z-30 ${
                videoLoaded ? "opacity-0" : "opacity-100"
              }`}
            />

            {/* Background Video */}
            <video
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-40 ${
                videoLoaded ? "opacity-100" : "opacity-0"
              }`}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onLoadedData={() => setVideoLoaded(true)}
            >
              <source src="/login.mp4" type="video/mp4" />
            </video>

            {/* Navy gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0A1128]/70 to-transparent z-50" />

          </div>

          {/* RIGHT SIDE — Login Card */}
          <div className="w-1/2 h-full bg-[#0F1A39] flex items-center justify-center p-10">
            <div className="w-full max-w-sm">

              <h2 className="text-center text-2xl text-white font-semibold mb-6 tracking-wide">
                Welcome Back
              </h2>

              <AuthForm />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
