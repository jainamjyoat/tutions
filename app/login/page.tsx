"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginFormContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "AccessDenied") {
      setErrorMessage(
        "Access Denied: Only the authorized teacher account can access the teacher's dashboard."
      );
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle standard email/password login submission logic
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/teacher-dashboard" });
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Error Alert for Unauthorized Logins */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-inter rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-red-600">
            error
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header: Logo & Back to Home */}
      <div className="flex items-center justify-between w-full mb-4">
        <Link href="/" className="inline-flex items-center gap-2 text-[#005bbf]">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
          </svg>
          <span className="font-quicksand font-bold text-xl tracking-tight text-[#1b1c1c]">
            Happy Toddlers
          </span>
        </Link>

        {/* Transparent Back to Home Link */}
        <Link
          href="/"
          className="bg-transparent text-[#727785] hover:text-[#005bbf] hover:bg-[#f0eded] font-inter font-semibold text-xs px-3 py-1.5 rounded-full transition-all duration-200 inline-flex items-center gap-1 group"
        >
          <span>Home</span>
          <span className="material-symbols-outlined text-base leading-none group-hover:translate-x-0.5 transition-transform duration-200">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Form Header */}
      <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c] mb-1">
        Welcome Back
      </h2>
      <p className="font-inter text-[#414754] text-xs sm:text-sm mb-5">
        Please enter your details to continue learning.
      </p>

      {/* Google Single Sign-On Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full h-11 bg-white border border-[#c1c6d6] text-[#1b1c1c] font-quicksand font-bold text-xs sm:text-sm rounded-full hover:bg-[#f0eded] transition-colors shadow-sm flex items-center justify-center gap-2.5 mb-4 active:scale-95"
      >
        <Image
          src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
          width={16}
          height={16}
          alt="Google"
          unoptimized
        />
        <span>Continue with Google</span>
      </button>

      {/* Divider */}
      <div className="flex items-center my-4 w-full">
        <div className="flex-1 border-t border-[#c1c6d6]/50" />
        <span className="px-3 text-xs font-inter uppercase text-[#727785] tracking-wider">
          or
        </span>
        <div className="flex-1 border-t border-[#c1c6d6]/50" />
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="w-full space-y-3.5">
        {/* Email Address */}
        <div className="w-full">
          <label
            htmlFor="email"
            className="block font-inter font-bold text-xs text-[#1b1c1c] mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="name@example.com"
            className="w-full h-11 px-3.5 bg-[#f0eded] border border-[#c1c6d6]/50 rounded-xl text-sm font-inter text-[#1b1c1c] placeholder-[#727785] focus:outline-none focus:bg-white focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 transition-all"
          />
        </div>

        {/* Password */}
        <div className="w-full">
          <label
            htmlFor="password"
            className="block font-inter font-bold text-xs text-[#1b1c1c] mb-1"
          >
            Password
          </label>
          <div className="relative w-full">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              className="w-full h-11 pl-3.5 pr-10 bg-[#f0eded] border border-[#c1c6d6]/50 rounded-xl text-sm font-inter text-[#1b1c1c] placeholder-[#727785] focus:outline-none focus:bg-white focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#727785] hover:text-[#005bbf] transition-colors p-1"
            >
              <span className="material-symbols-outlined text-base leading-none">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* Form Actions: Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-0.5 w-full text-xs">
          <label
            htmlFor="remember"
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              id="remember"
              name="remember"
              type="checkbox"
              className="w-3.5 h-3.5 accent-[#005bbf] rounded border-[#c1c6d6] cursor-pointer"
            />
            <span className="font-inter text-[#414754] group-hover:text-[#1b1c1c] transition-colors">
              Remember me
            </span>
          </label>
          <Link
            href="#"
            className="font-inter font-semibold text-[#005bbf] hover:text-[#004493] transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full h-11 bg-[#005bbf] hover:bg-[#004493] text-white font-quicksand font-bold text-sm rounded-full shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
        >
          <span>Log In</span>
          <span className="material-symbols-outlined text-base leading-none">
            arrow_forward
          </span>
        </button>
      </form>

      {/* Footer Link to Sign Up */}
      <div className="mt-5 text-center w-full">
        <p className="text-xs font-inter text-[#414754]">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-[#005bbf] font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <div className="w-full h-screen overflow-hidden bg-[#fbf9f8] text-[#1b1c1c]">
      <div className="w-full h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left Column: Local Image Illustration Banner */}
        <div className="hidden lg:relative lg:flex flex-col justify-end p-8 lg:p-12 xl:p-14 h-screen w-full overflow-hidden bg-slate-900">
          <Image
            src="/login.webp"
            alt="Friendly tutor and student learning together"
            fill
            priority
            unoptimized
            className="object-cover"
          />
          {/* Ambient Dark Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />

          {/* Banner Text Overlay */}
          <div className="relative z-20 text-white space-y-1.5">
            <h1 className="font-quicksand font-bold text-2xl xl:text-3xl leading-snug tracking-tight text-white">
              Welcome Back to
              <br />
              Happy Toddlers
            </h1>
            <p className="font-inter text-xs xl:text-sm font-medium text-white/90 leading-relaxed">
              Continue your child's personalized learning journey.
            </p>
          </div>
        </div>

        {/* Right Column: Compact Form Container */}
        <div className="w-full h-screen flex flex-col justify-center items-center px-6 sm:px-10 lg:px-14 py-6 bg-white overflow-hidden">
          <Suspense fallback={<div className="text-xs text-[#727785]">Loading...</div>}>
            <LoginFormContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}