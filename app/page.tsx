import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* TopNavBar */}
      <nav className="w-full top-0 sticky z-50 bg-white/95 backdrop-blur-md border-b border-outline-variant/20 shadow-sm">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-7xl mx-auto">
          {/* Brand Logo */}
          <Link
            href="#"
            className="font-quicksand text-[22px] font-bold text-primary flex items-center gap-2.5 tracking-tight"
          >
            <svg
              className="w-7 h-7 text-primary fill-current"
              viewBox="0 0 24 24"
            >
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
            <span>Happy Toddles</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            <Link
              href="#"
              className="font-inter font-semibold text-[15px] text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Find a Tutor
            </Link>
            <Link
              href="#pricing"
              className="font-inter font-semibold text-[15px] text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Pricing
            </Link>
            <Link
              href="#resources"
              className="font-inter font-semibold text-[15px] text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              Resources
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-6">
            <button className="hidden md:block font-quicksand font-bold text-[15px] text-primary hover:opacity-80 transition-opacity">
              Log In
            </button>
            <button className="font-quicksand font-bold text-[15px] text-white bg-primary px-6 py-2.5 rounded-full hover:bg-primary-container transition-all duration-200 shadow-sm active:scale-95">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden mx-auto">
          <div className="grid lg:grid-cols-2 items-stretch min-h-[600px]">
            <div className="flex flex-col justify-center py-24 px-margin-mobile md:px-margin-desktop">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-fixed text-on-primary-fixed-variant mb-6 text-sm font-semibold w-fit">
                <span className="material-symbols-outlined text-sm">stars</span>
                <span>Award-winning tutoring platform</span>
              </div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-6">
                Personalized Tutoring for Every Student
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 ">
                Empower your child's learning journey with expert tutors and interactive tools designed to inspire confidence and curiosity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-primary text-on-primary font-button-text text-button-text px-[32px] py-[16px] rounded-full shadow-[0_8px_24px_rgba(26,115,232,0.2)] hover:shadow-[0_12px_28px_rgba(26,115,232,0.3)] hover:-translate-y-1 transition-all duration-300">
                  Find Your Tutor
                </button>
                <button className="inline-flex items-center justify-center gap-2 border-2 border-red-600 text-red-600 font-button-text text-button-text px-[32px] py-[16px] rounded-full hover:bg-red-50 hover:shadow-md transition-all duration-300 active:scale-95">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    play_circle
                  </span>
                  <span>See How It Works</span>
                </button>
              </div>
              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-3">
                  <img
                    className="w-10 h-10 rounded-full border-2 border-surface object-cover"
                    alt="Female tutor"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCI7zz2kKNbU6Uyp-eiyiTFDFW5IhVdXjcIxxWDKqoYqR7WIfjWA-3LbBvQ15G9G1mQt_F6cNr-sbFXlFVRf4Pa21O0bG3YvXxPLBxaJhNcd10O4P7kYf4_R2871cEAqq9R4gNjeRzb1kLAAKtyqbPd7c5u5BYOmOva2oXGBQ26oeZPTHOfFUUPtxei7Kh7sAZAwybhpcCPu7OL71G14m3UI3Sm7VEdhj9md6rMDHyocs5jAMbz3Z1JDA"
                  />
                  <img
                    className="w-10 h-10 rounded-full border-2 border-surface object-cover"
                    alt="Male tutor"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnPP4beOhkEHUdtnwtyiMuHICcl1TchNV_sBpWGJqzZ0mNykkXfs7AH8Auw0JrLc8SPzd2HF-MBs9ArYFcGEdEI9nkTIkoW-v3poRG9N3gJrh5Z7WNidYGcrH1szudWHtfoBCsif6S2OpttpWxNmhW20y2LNof8MXSsaKKHN5WxYPM-axnZPDdrwZixqrTZVIqBqOBm8osQDQfGvPQDp4zfQA3NUlfiDHYvr67HiagNXaYvOXc6kmXYg"
                  />
                  <img
                    className="w-10 h-10 rounded-full border-2 border-surface object-cover"
                    alt="Young female tutor"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuASaCTt2OIlHZA7grWWwp4hpxr1r20XEDybL-pHQPMvGbb64QJJBOFKBYV7SScZ9kkNDFT0zhTA1to42VD-c6Eeb-DCN3Pjg4_W9Ac0ePrGI13BtIaoR4L0EGjqfk76spvbSAsVKLx046iW1Oryt5SjJ2zI4NEJbb0U2YDPutPRa0-IJucMjMB9RHQAFvu703CzxsvI1Y6xZzscyfomm1TNkBp1i2xh3QiewBC0oIKsGKGsPO9w5qlzXQ"
                  />
                  <div className="w-10 h-10 rounded-full bg-primary-fixed border-2 border-surface flex items-center justify-center text-primary font-bold text-xs">
                    5k+
                  </div>
                </div>
                <p className="text-sm font-medium text-on-surface-variant">
                  Trusted by over 5,000 parents
                </p>
              </div>
            </div>
            <div className="relative h-full w-full flex items-center justify-center">
              <div className="relative w-full h-full overflow-hidden border-outline-variant/20">
                <img
                  alt="Happy Toddles Tutoring"
                  className="w-full h-full object-cover block"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_ojWqWwzx7Kl5VdTs7ipG0jGEIGwxL4U-qGzhhYQrU8p_uwm6yi8ssMVFAqwDnRI-2wrs3kXB2LepYI-JQW0yh4uHQ2W01OVkup743sU4ZCV6Tq26xt2BJIAjr2RyNH2zE65hA9feg4oBGtXoQoArJvjvcY9kaNBQrWDMjuzD8p-YIBh64gJeEFJBSb-syqddHjvuzvvB0NLGJHNyBiuRYeS0kCmbCOUFSSew5XJGJ1_W8qBCQTSBTA"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-surface-container-low px-margin-mobile md:px-margin-desktop">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Why Choose Happy Toddles?
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                We provide a nurturing environment where your child can thrive academically and personally.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-surface p-8 rounded-2xl shadow-[0_4px_12px_rgba(26,115,232,0.05)] border border-outline-variant/20 hover:shadow-[0_8px_24px_rgba(26,115,232,0.1)] transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    school
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Expert Tutors
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Our rigorously vetted tutors are passionate educators dedicated to bringing out the best in every student through personalized attention.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl shadow-[0_4px_12px_rgba(26,115,232,0.05)] border border-outline-variant/20 hover:shadow-[0_8px_24px_rgba(26,115,232,0.1)] transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    calendar_month
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Flexible Scheduling
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Learn on your terms. We offer adaptable session times that fit seamlessly into your family's busy lifestyle, ensuring consistent progress.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl shadow-[0_4px_12px_rgba(26,115,232,0.05)] border border-outline-variant/20 hover:shadow-[0_8px_24px_rgba(26,115,232,0.1)] transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    emoji_events
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Proven Results
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Our engaging methodologies not only improve grades but also foster a lifelong love of learning and increased self-confidence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-24 bg-primary-fixed/30 px-margin-mobile md:px-margin-desktop relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50 transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-fixed rounded-full mix-blend-multiply filter blur-3xl opacity-50 transform -translate-x-1/2 translate-y-1/2"></div>
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <span
              className="material-symbols-outlined text-6xl text-primary opacity-20 mb-6 block"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              format_quote
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-8 leading-relaxed">
              "Happy Toddles completely transformed my daughter's approach to math. Her tutor was incredibly patient and made learning feel like an adventure. We've seen a huge boost in her confidence!"
            </h2>
            <div className="flex items-center justify-center gap-4">
              <img
                className="w-16 h-16 rounded-full border-4 border-surface object-cover shadow-sm"
                alt="Sarah Jenkins"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuASED0ue13kAyYomUEEo-8xlIjBIkk6tAtFTOggmbXqBnTSH4MZGEOw2vSw2XObDaU3FFRlOQWcFv_L4Msxk0wOSc7GdTzP9-vXFO3H5S_h2xBP87I5GzCE52IPZf_9i1r187Ku-q9tTKoo6S7V6nL0GgB9yQhh21t8c6NJpYP4Zb8lF3GXbyeMPQqmHwkxSOiNHLTXR4LlKn-6zHnV63Bj_aDl22FmnIIbWQOGbE63spD_VUkMtb0lBA"
              />
              <div className="text-left">
                <p className="font-bold text-on-surface">Sarah Jenkins</p>
                <p className="text-sm text-on-surface-variant">Parent of a 3rd Grader</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-primary px-margin-mobile md:px-margin-desktop text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-headline-lg text-headline-lg text-on-primary mb-8">
              Ready to transform your child's learning journey?
            </h2>
            <button className="bg-surface text-primary font-button-text text-button-text px-10 py-4 rounded-full shadow-lg hover:bg-primary-fixed hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              Find Your Tutor
            </button>
          </div>
        </section>

        {/* Educational Resources Section */}
        <section className="py-24 bg-surface-container-low px-margin-mobile md:px-margin-desktop" id="resources">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Educational Resources
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Empowering your child's learning journey with curated materials and expert guides.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Resource 1 */}
              <div className="bg-surface p-8 rounded-xl border border-outline-variant/20 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-primary-fixed/30 text-primary flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl">menu_book</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Parenting Guides
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Expert advice on supporting your child's academic growth and emotional well-being at home.
                </p>
                <Link
                  className="text-primary font-button-text text-button-text inline-flex items-center gap-1 hover:gap-2 transition-all"
                  href="#"
                >
                  Learn More <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

              {/* Resource 2 */}
              <div className="bg-surface p-8 rounded-xl border border-outline-variant/20 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-primary-fixed/30 text-primary flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl">calculate</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Math Worksheets
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Curated practice sets for all grade levels, designed to make math concepts intuitive and fun.
                </p>
                <Link
                  className="text-primary font-button-text text-button-text inline-flex items-center gap-1 hover:gap-2 transition-all"
                  href="#"
                >
                  Download <span className="material-symbols-outlined text-sm">download</span>
                </Link>
              </div>

              {/* Resource 3 */}
              <div className="bg-surface p-8 rounded-xl border border-outline-variant/20 hover:shadow-md transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-primary-fixed/30 text-primary flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-2xl">video_library</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Reading Lists
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                  Age-appropriate book recommendations to foster a lifelong love for reading and literature.
                </p>
                <Link
                  className="text-primary font-button-text text-button-text inline-flex items-center gap-1 hover:gap-2 transition-all"
                  href="#"
                >
                  Learn More <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-surface px-margin-mobile md:px-margin-desktop" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Choose the perfect plan for your child's educational journey.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
              {/* Starter Tier */}
              <div className="bg-surface p-8 rounded-2xl border border-outline-variant/20 shadow-sm text-center">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                  Starter
                </h3>
                <div className="mb-6">
                  <span className="font-headline-lg text-headline-lg text-primary">$120</span>
                  <span className="text-on-surface-variant">/mo</span>
                </div>
                <ul className="text-left font-body-md text-body-md text-on-surface-variant space-y-4 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    4 sessions per month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Basic progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Email support
                  </li>
                </ul>
                <button className="w-full border-2 border-primary text-primary font-button-text text-button-text py-3 rounded-full hover:bg-primary-fixed/30 transition-colors">
                  Get Started
                </button>
              </div>

              {/* Pro Tier */}
              <div className="bg-primary-fixed/20 p-8 rounded-3xl border-2 border-primary shadow-lg text-center relative transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                  Pro
                </h3>
                <div className="mb-6">
                  <span className="font-headline-lg text-headline-lg text-primary">$299</span>
                  <span className="text-on-surface-variant">/mo</span>
                </div>
                <ul className="text-left font-body-md text-body-md text-on-surface-variant space-y-4 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    8 sessions per month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Detailed progress reports
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Access to resource library
                  </li>
                </ul>
                <button className="w-full bg-primary text-on-primary font-button-text text-button-text py-3 rounded-full hover:bg-primary-container shadow-md transition-colors">
                  Get Started
                </button>
              </div>

              {/* Elite Tier */}
              <div className="bg-surface p-8 rounded-2xl border border-outline-variant/20 shadow-sm text-center">
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
                  Elite
                </h3>
                <div className="mb-6">
                  <span className="font-headline-lg text-headline-lg text-primary">$450</span>
                  <span className="text-on-surface-variant">/mo</span>
                </div>
                <ul className="text-left font-body-md text-body-md text-on-surface-variant space-y-4 mb-8">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    12 sessions per month
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Customized learning plans
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    24/7 dedicated support
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                    Weekly parent check-ins
                  </li>
                </ul>
                <button className="w-full border-2 border-primary text-primary font-button-text text-button-text py-3 rounded-full hover:bg-primary-fixed/30 transition-colors">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-24 bg-surface-container-low px-margin-mobile md:px-margin-desktop">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="space-y-4">
              <div className="border border-outline-variant/30 rounded-xl bg-surface overflow-hidden">
                <button className="w-full px-6 py-4 flex justify-between items-center text-left focus:outline-none">
                  <span className="font-headline-sm text-headline-sm text-on-surface text-lg">
                    How do you vet your tutors?
                  </span>
                  <span className="material-symbols-outlined text-primary">expand_more</span>
                </button>
              </div>

              <div className="border border-outline-variant/30 rounded-xl bg-surface overflow-hidden">
                <button className="w-full px-6 py-4 flex justify-between items-center text-left focus:outline-none">
                  <span className="font-headline-sm text-headline-sm text-on-surface text-lg">
                    Can I change my session times?
                  </span>
                  <span className="material-symbols-outlined text-primary transform rotate-180">
                    expand_more
                  </span>
                </button>
                <div className="px-6 pb-4 pt-2 border-t border-outline-variant/20">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Yes! We understand that schedules can change. You can easily reschedule or adjust your session times through our parent portal up to 24 hours in advance.
                  </p>
                </div>
              </div>

              <div className="border border-outline-variant/30 rounded-xl bg-surface overflow-hidden">
                <button className="w-full px-6 py-4 flex justify-between items-center text-left focus:outline-none">
                  <span className="font-headline-sm text-headline-sm text-on-surface text-lg">
                    Do you offer a trial lesson?
                  </span>
                  <span className="material-symbols-outlined text-primary">expand_more</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-lg bg-inverse-surface dark:bg-surface-container-lowest flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop gap-md mt-auto">
        <div className="font-headline-sm text-headline-sm text-inverse-on-surface dark:text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined">school</span>
          Happy Toddles
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <Link
            className="font-body-sm text-body-sm text-surface-variant dark:text-on-surface-variant hover:text-on-primary-container dark:hover:text-primary transition-colors"
            href="#"
          >
            Privacy Policy
          </Link>
          <Link
            className="font-body-sm text-body-sm text-surface-variant dark:text-on-surface-variant hover:text-on-primary-container dark:hover:text-primary transition-colors"
            href="#"
          >
            Terms of Service
          </Link>
          <Link
            className="font-body-sm text-body-sm text-surface-variant dark:text-on-surface-variant hover:text-on-primary-container dark:hover:text-primary transition-colors"
            href="#"
          >
            Contact Us
          </Link>
          <Link
            className="font-body-sm text-body-sm text-surface-variant dark:text-on-surface-variant hover:text-on-primary-container dark:hover:text-primary transition-colors"
            href="#"
          >
            Careers
          </Link>
        </div>
        <div className="font-body-sm text-body-sm text-surface-variant dark:text-on-surface-variant">
          © 2024 Happy Toddles. All rights reserved.
        </div>
      </footer>
    </div>
  );
}