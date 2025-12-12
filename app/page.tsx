'use client';

import { useState, useEffect } from 'react';

// Target: Saturday Dec 14 2025 midnight EST (UTC-5)
const LAUNCH_DATE = new Date('2025-12-14T05:00:00.000Z');

function getTimeRemaining() {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { hours, minutes, seconds };
}

function CountdownCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-orange-100/50 px-6 py-5 sm:px-8 sm:py-6 min-w-[100px] sm:min-w-[120px]">
      <div className="text-4xl sm:text-5xl font-bold text-orange-500 tabular-nums">
        {value.toString().padStart(2, '0')}
      </div>
      <div className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  const [time, setTime] = useState(getTimeRemaining());
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100 flex flex-col">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center sm:justify-start gap-2">
          <svg
            className="w-7 h-7 text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span className="text-2xl font-semibold">
            <span className="text-gray-900">Seller</span>
            <span className="text-orange-500">Centry</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-2xl mx-auto text-center">
          {/* Launch Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-600 uppercase tracking-wider">
              Launch Imminent
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            The Future of
            <br />
            <span className="text-orange-500">Amazon Protection</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-500 mb-12 max-w-lg mx-auto">
            A sophisticated shield for your seller account. Smarter, faster, and designed for growth.
          </p>

          {/* Countdown Timer */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-12">
            <CountdownCard value={time.hours} label="Hours" />
            <CountdownCard value={time.minutes} label="Minutes" />
            <CountdownCard value={time.seconds} label="Seconds" />
          </div>

          {/* Email Signup */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter work email..."
                  className="flex-1 px-5 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Notify Me
                </button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-400">
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-green-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  No spam
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Secure data
                </span>
              </div>
            </form>
          ) : (
            <div className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-2xl px-8 py-10 shadow-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                You&apos;re on the list!
              </h3>
              <p className="text-gray-500">
                We&apos;ll notify you when we launch.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} SellerCentry. All rights reserved.</p>
      </footer>
    </div>
  );
}
