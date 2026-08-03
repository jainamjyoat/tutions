"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <div className="w-full min-h-screen bg-[#fbf9f8] text-[#1b1c1c]">
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Column: Image Banner & Fixed Bottom Text */}
        <div className="hidden lg:relative lg:flex flex-col justify-end p-10 lg:p-14 xl:p-16 min-h-screen w-full overflow-hidden bg-slate-900">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMjYmNLpSjBoQOxTVoQdSy13wnJau_B5yFRLqk1BxV1880H6E5n91lWUxUelEXhH8LBmaE3q3LYN6LPhlDNkJOVjt3FUpoKsqMJOO3sa6JCsENQRql6APyL_OU2jjFJ0az13sBaqmJCmB9szxqz9uBMRsNBw8bsyvk0i5gFLmlB5Pt1M4v7UjuF6-IxaNJi6-83esvbR2ildmZIdCXabp7n18Uv3zLeBHXbUQeGtpEZ7uosANwSK58mg"
            alt="Happy Toddles Tutoring"
            fill
            priority
            unoptimized
            className="object-cover"
          />
          {/* Subtle Dark Gradient to make white text crisp */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

          {/* Banner Text Block */}
          <div className="relative z-20 text-white space-y-2">
            <h1 className="font-quicksand font-bold text-3xl xl:text-[38px] leading-[1.2] tracking-tight text-white">
              Nurturing Curiosity,<br />Building Excellence
            </h1>
            <p className="font-inter text-sm xl:text-base font-medium text-white/90 leading-relaxed">
              Join a community dedicated to your child's success.
            </p>
          </div>
        </div>

        {/* Right Column: Registration Form Container */}
        <div className="w-full min-h-screen flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 py-12 bg-white">
          <div className="w-full max-w-[440px] mx-auto" style={{ width: '100%', maxWidth: '440px' }}>
            
            {/* Logo & Transparent Back Button Header */}
            <div className="flex items-center justify-between w-full mb-8">
              <Link href="/" className="inline-flex items-center gap-2.5 text-[#005bbf]">
                <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
                </svg>
                <span className="font-quicksand font-bold text-2xl tracking-tight text-[#1b1c1c]">
                  Happy Toddles
                </span>
              </Link>

              {/* Transparent Back to Home Button */}
              <Link
                href="/"
                className="bg-transparent text-[#727785] hover:text-[#005bbf] hover:bg-[#f0eded] font-inter font-semibold text-xs px-3.5 py-2 rounded-full transition-all duration-200 inline-flex items-center gap-1 group"
              >
                <span>Home </span>
                <span className="material-symbols-outlined text-base leading-none group-hover:translate-x-0.5 transition-transform duration-200">
                  arrow_forward
                </span>
              </Link>
            </div>

            {/* Form Header */}
            <h2 className="font-quicksand font-bold text-3xl text-[#1b1c1c] mb-2">
              Create an Account
            </h2>
            <p className="font-inter text-[#414754] text-sm mb-8">
              Start your child's journey with us today.
            </p>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              {/* Full Name */}
              <div className="w-full">
                <label
                  htmlFor="full-name"
                  className="block font-inter font-bold text-xs text-[#1b1c1c] mb-2"
                >
                  Full Name
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  placeholder="Your Name"
                  className="w-full h-12 px-4 bg-[#f0eded] border border-[#c1c6d6]/50 rounded-xl text-sm font-inter text-[#1b1c1c] placeholder-[#727785] focus:outline-none focus:bg-white focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 transition-all"
                />
              </div>

              {/* Email Address */}
              <div className="w-full">
                <label
                  htmlFor="email"
                  className="block font-inter font-bold text-xs text-[#1b1c1c] mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="your@example.com"
                  className="w-full h-12 px-4 bg-[#f0eded] border border-[#c1c6d6]/50 rounded-xl text-sm font-inter text-[#1b1c1c] placeholder-[#727785] focus:outline-none focus:bg-white focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 transition-all"
                />
              </div>

              {/* Password */}
              <div className="w-full">
                <label
                  htmlFor="password"
                  className="block font-inter font-bold text-xs text-[#1b1c1c] mb-2"
                >
                  Password
                </label>
                <div className="relative w-full">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full h-12 pl-4 pr-10 bg-[#f0eded] border border-[#c1c6d6]/50 rounded-xl text-sm font-inter text-[#1b1c1c] placeholder-[#727785] focus:outline-none focus:bg-white focus:border-[#005bbf] focus:ring-2 focus:ring-[#005bbf]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#727785] hover:text-[#005bbf] transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-lg leading-none">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#414754] font-inter">
                  Must be at least 8 characters long.
                </p>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2.5 pt-1 w-full">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="w-4 h-4 mt-0.5 accent-[#005bbf] rounded border-[#c1c6d6] cursor-pointer shrink-0"
                />
                <label htmlFor="terms" className="text-xs text-[#414754] font-inter leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <Link href="#" className="text-[#005bbf] font-semibold hover:underline">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-[#005bbf] font-semibold hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-12 bg-[#005bbf] hover:bg-[#004493] text-white font-quicksand font-bold text-base rounded-full shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>Sign Up</span>
                <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
              </button>

              {/* Divider */}
              <div className="flex items-center my-6 w-full">
                <div className="flex-1 border-t border-[#c1c6d6]/50" />
                <span className="px-4 text-xs font-inter text-[#727785]">or</span>
                <div className="flex-1 border-t border-[#c1c6d6]/50" />
              </div>

              {/* Google Sign Up Button */}
              <button
                type="button"
                className="w-full h-12 bg-white border border-[#c1c6d6] text-[#1b1c1c] font-quicksand font-bold text-sm rounded-full hover:bg-[#f0eded] transition-colors shadow-sm flex items-center justify-center gap-2.5"
              >
                <Image
                  src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
                  width={18}
                  height={18}
                  alt="Google"
                  unoptimized
                />
                <span>Sign up with Google</span>
              </button>
            </form>

            {/* Footer Link */}
            <div className="mt-8 text-center w-full">
              <p className="text-xs sm:text-sm font-inter text-[#414754]">
                Already have an account?{" "}
                <Link href="/login" className="text-[#005bbf] font-semibold hover:underline">
                  Log In
                </Link>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}