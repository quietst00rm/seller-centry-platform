'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

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

// 3D Scene Component with Parallax
function ParallaxScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const shieldRef = useRef<THREE.Mesh | null>(null);
  const chartRef = useRef<THREE.Group | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const orangeLight = new THREE.PointLight(0xf97316, 0.5, 10);
    orangeLight.position.set(-2, 0, 2);
    scene.add(orangeLight);

    // Glass Shield (left side)
    const shieldGeometry = new THREE.IcosahedronGeometry(0.8, 0);
    const shieldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.6,
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(-2.5, 0, 0);
    scene.add(shield);
    shieldRef.current = shield;

    // Revenue Chart (right side) - 3D bars
    const chartGroup = new THREE.Group();
    const barHeights = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 1.0];
    const barMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf97316,
      metalness: 0.2,
      roughness: 0.3,
      transmission: 0.5,
      thickness: 0.3,
      transparent: true,
      opacity: 0.7,
    });

    barHeights.forEach((height, i) => {
      const barGeometry = new THREE.BoxGeometry(0.15, height, 0.15);
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set(i * 0.2 - 0.6, height / 2 - 0.5, 0);
      chartGroup.add(bar);
    });

    chartGroup.position.set(2.5, 0, 0);
    scene.add(chartGroup);
    chartRef.current = chartGroup;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth interpolation for parallax
      targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.05;
      targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.05;

      // Inverse parallax movement
      if (shieldRef.current) {
        shieldRef.current.rotation.y = targetRef.current.x * 0.5;
        shieldRef.current.rotation.x = -targetRef.current.y * 0.3;
        shieldRef.current.position.x = -2.5 - targetRef.current.x * 0.3;
        shieldRef.current.position.y = -targetRef.current.y * 0.2;
      }

      if (chartRef.current) {
        chartRef.current.rotation.y = -targetRef.current.x * 0.4;
        chartRef.current.rotation.x = targetRef.current.y * 0.2;
        chartRef.current.position.x = 2.5 + targetRef.current.x * 0.3;
        chartRef.current.position.y = targetRef.current.y * 0.2;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Mouse movement handler (desktop)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Gyroscope handler (mobile)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        mouseRef.current.x = (e.gamma / 45) * 0.5; // -45 to 45 degrees
        mouseRef.current.y = ((e.beta - 45) / 45) * 0.5; // Adjusted for holding phone
      }
    };

    // Request permission on iOS
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      // iOS 13+ requires permission
      const requestPermission = async () => {
        try {
          const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch {
          // Silently fail
        }
      };
      // We'll trigger this on user interaction later if needed
      document.addEventListener('click', requestPermission, { once: true });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}

// Glassmorphism Countdown Card
function CountdownCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="relative w-full md:w-auto">
      <div
        className="
          bg-white/20 backdrop-blur-[15px]
          rounded-2xl px-6 py-5 md:px-8 md:py-6
          min-w-full md:min-w-[120px]
          border border-white/30
          shadow-[0_8px_32px_rgba(249,115,22,0.15)]
        "
      >
        <div className="text-4xl md:text-5xl font-bold text-orange-500 tabular-nums tracking-tight">
          {value.toString().padStart(2, '0')}
        </div>
        <div className="text-xs md:text-sm text-gray-500 uppercase tracking-wider mt-1">
          {label}
        </div>
      </div>
    </div>
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

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  }, [email]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Geometric Dot Grid Pattern */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Radial Gradient Spotlight */}
      <div
        className="fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(255,255,255,1) 0%, rgba(255,253,250,0.95) 30%, rgba(252,246,237,0.9) 60%, rgba(245,235,220,0.85) 100%)',
        }}
      />

      {/* 3D Parallax Scene */}
      {mounted && <ParallaxScene />}

      {/* Header */}
      <header className="relative z-10 pt-6 md:pt-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center md:justify-start gap-2">
          <svg
            className="w-6 h-6 md:w-7 md:h-7 text-green-500"
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
          <span className="text-xl md:text-2xl font-semibold">
            <span className="text-gray-900">Seller</span>
            <span className="text-orange-500">Centry</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-6 py-8 md:py-12 min-h-[calc(100vh-120px)]">
        <div className="max-w-2xl mx-auto text-center w-full">
          {/* Launch Badge with Pulse Animation */}
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] mb-6 md:mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Launch Imminent
            </span>
          </div>

          {/* Headline with Tight Letter Spacing */}
          <h1
            className="text-[2.5rem] leading-[1.1] md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 md:mb-6"
            style={{ letterSpacing: '-0.02em' }}
          >
            <span className="block">The Future of</span>
            <span className="block text-orange-500">Amazon Protection</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-lg lg:text-xl text-gray-500 mb-8 md:mb-12 max-w-lg mx-auto px-2">
            A sophisticated shield for your seller account. Smarter, faster, and designed for growth.
          </p>

          {/* Countdown Timer - Vertical Stack on Mobile */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12 px-4 md:px-0">
            <CountdownCard value={time.hours} label="Hours" />
            <CountdownCard value={time.minutes} label="Minutes" />
            <CountdownCard value={time.seconds} label="Seconds" />
          </div>

          {/* Email Signup */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 md:px-0">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter work email..."
                  className="
                    flex-1 px-5 py-4 min-h-[52px]
                    rounded-xl border border-gray-200
                    bg-white/80 backdrop-blur-sm
                    text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500
                    transition-all text-base
                  "
                  required
                />
                <button
                  type="submit"
                  className="
                    inline-flex items-center justify-center gap-2
                    px-6 py-4 min-h-[52px]
                    bg-gray-900 text-white font-semibold rounded-xl
                    shadow-[0_4px_14px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.1)]
                    hover:bg-gray-800 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
                    hover:-translate-y-0.5
                    active:translate-y-0
                    transition-all duration-200
                    text-base
                  "
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
            <div className="max-w-md mx-auto bg-white/60 backdrop-blur-[15px] rounded-2xl px-8 py-10 shadow-[0_8px_32px_rgba(249,115,22,0.12)] border border-white/40">
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
      <footer className="relative z-10 py-4 md:py-6 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} SellerCentry. All rights reserved.</p>
      </footer>
    </div>
  );
}
