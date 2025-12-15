'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import SmoothScroll from '@/components/SmoothScroll';
import { InviteHandler } from '@/components/invite-handler';

// Dynamically import 3D scene to avoid SSR issues
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), {
  ssr: false,
  loading: () => null,
});

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

// Premium Glassmorphism Card
function CountdownCard({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      className="relative w-full md:w-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="glass-card px-6 py-6 md:px-10 md:py-8 min-w-full md:min-w-[140px] text-center">
        <div
          className="text-5xl md:text-6xl font-bold tabular-nums"
          style={{
            color: '#111827',
            letterSpacing: '-0.04em',
            fontFeatureSettings: '"tnum"',
          }}
        >
          {value.toString().padStart(2, '0')}
        </div>
        <div
          className="text-xs md:text-sm uppercase tracking-widest mt-2 font-medium"
          style={{ color: '#6b7280' }}
        >
          {label}
        </div>
      </div>
    </motion.div>
  );
}

export default function ComingSoonPage() {
  const [time, setTime] = useState(getTimeRemaining());
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (email.trim()) {
        setSubmitted(true);
      }
    },
    [email]
  );

  return (
    <SmoothScroll>
      <InviteHandler />
      <div
        className="min-h-screen relative overflow-hidden"
        style={{ backgroundColor: '#FDFBF9' }}
      >
        {/* Geometric Dot Grid Pattern - 40px spacing, 5% opacity */}
        <div
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.05) 1.5px, transparent 1.5px)`,
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        {/* Soft radial gradient overlay */}
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 120% 100% at 50% 30%, transparent 0%, rgba(253, 251, 249, 0.4) 40%, rgba(253, 251, 249, 0.85) 100%)',
          }}
          aria-hidden="true"
        />

        {/* R3F 3D Scene */}
        {mounted && <HeroScene />}

        {/* Header - Neutral Dark Logo */}
        <header className="relative z-10 pt-8 md:pt-10 px-4 md:px-8">
          <motion.div
            className="max-w-5xl mx-auto flex items-center justify-center md:justify-start gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <svg
              className="w-6 h-6 md:w-7 md:h-7"
              style={{ color: '#374151' }}
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
            <span
              className="text-xl md:text-2xl font-semibold"
              style={{ letterSpacing: '-0.02em' }}
            >
              <span style={{ color: '#1f2937' }}>Seller</span>
              <span style={{ color: '#4b5563' }}>Centry</span>
            </span>
          </motion.div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex items-center justify-center px-4 md:px-8 py-16 md:py-24 min-h-[calc(100vh-140px)]">
          <div className="max-w-2xl mx-auto text-center w-full">
            {/* Launch Badge */}
            <motion.div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 mb-10 md:mb-12 glass-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#FF7F32' }}></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: '#FF7F32' }}></span>
              </span>
              <span
                className="text-xs md:text-sm font-semibold uppercase tracking-widest"
                style={{ color: '#374151' }}
              >
                Launch Imminent
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-[2.75rem] leading-[1.05] md:text-6xl lg:text-7xl font-bold mb-6 md:mb-8"
              style={{ letterSpacing: '-0.04em', color: '#111827' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <span className="block">The Future of</span>
              <span className="block" style={{ color: '#FF7F32' }}>
                Amazon Protection
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-lg md:text-xl lg:text-2xl mb-14 md:mb-16 max-w-xl mx-auto px-2 leading-relaxed"
              style={{ color: '#6b7280' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              A sophisticated shield for your seller account. Smarter, faster,
              and designed for growth.
            </motion.p>

            {/* Countdown Timer */}
            <motion.div
              className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-5 mb-14 md:mb-16 px-4 md:px-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <CountdownCard value={time.hours} label="Hours" />
              <CountdownCard value={time.minutes} label="Minutes" />
              <CountdownCard value={time.seconds} label="Seconds" />
            </motion.div>

            {/* Email Signup */}
            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="max-w-lg mx-auto px-4 md:px-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter work email..."
                      className="glass-input flex-1 px-6 py-4 min-h-[56px] rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-orange-400/30 transition-all"
                      style={{ color: '#111827' }}
                      required
                    />
                    <button
                      type="submit"
                      className="cta-button inline-flex items-center justify-center gap-2.5 px-8 py-4 min-h-[56px] font-semibold rounded-2xl transition-all duration-300 text-base"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Notify Me
                    </button>
                  </div>

                  {/* Trust indicators */}
                  <div
                    className="flex items-center justify-center gap-8 mt-5 text-sm"
                    style={{ color: '#9ca3af' }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        style={{ color: '#22c55e' }}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      No spam
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Secure data
                    </span>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  className="max-w-md mx-auto glass-card px-10 py-12"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
                    style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                  >
                    <svg
                      className="w-8 h-8"
                      style={{ color: '#22c55e' }}
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
                  <h3
                    className="text-2xl font-bold mb-2"
                    style={{ color: '#111827', letterSpacing: '-0.02em' }}
                  >
                    You&apos;re on the list!
                  </h3>
                  <p style={{ color: '#6b7280' }}>
                    We&apos;ll notify you when we launch.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer
          className="relative z-10 py-6 md:py-8 text-center text-sm"
          style={{ color: '#9ca3af' }}
        >
          <p>
            &copy; {new Date().getFullYear()} SellerCentry. All rights reserved.
          </p>
        </footer>

        {/* Premium Glassmorphism Styles */}
        <style jsx global>{`
          .glass-card {
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow:
              0 4px 30px rgba(0, 0, 0, 0.04),
              0 10px 40px rgba(255, 127, 50, 0.08),
              inset 0 0 20px rgba(255, 255, 255, 0.4);
            border-radius: 24px;
          }

          .glass-badge {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          }

          .glass-input {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border: 1px solid rgba(0, 0, 0, 0.06);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
          }

          .glass-input::placeholder {
            color: #9ca3af;
          }

          .glass-input:focus {
            border-color: rgba(255, 127, 50, 0.4);
            box-shadow:
              inset 0 2px 4px rgba(0, 0, 0, 0.02),
              0 0 0 3px rgba(255, 127, 50, 0.1);
          }

          .cta-button {
            background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
            color: #ffffff;
            box-shadow:
              0 4px 14px rgba(0, 0, 0, 0.25),
              0 8px 24px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            transform: translateY(0);
          }

          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow:
              0 6px 20px rgba(0, 0, 0, 0.3),
              0 12px 32px rgba(0, 0, 0, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
          }

          .cta-button:active {
            transform: translateY(0);
          }

          /* Mobile optimizations */
          @media (max-width: 768px) {
            .glass-card {
              backdrop-filter: blur(20px) saturate(160%);
              -webkit-backdrop-filter: blur(20px) saturate(160%);
            }
          }
        `}</style>
      </div>
    </SmoothScroll>
  );
}
