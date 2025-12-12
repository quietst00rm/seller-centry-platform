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

// Create Abstract Shield Shape (protection icon)
function createShieldGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();

  // Shield outline - rounded top, pointed bottom
  shape.moveTo(0, 1.2);
  shape.bezierCurveTo(0.6, 1.2, 0.8, 1.0, 0.8, 0.6);
  shape.lineTo(0.8, 0.2);
  shape.bezierCurveTo(0.8, -0.2, 0.4, -0.8, 0, -1.0);
  shape.bezierCurveTo(-0.4, -0.8, -0.8, -0.2, -0.8, 0.2);
  shape.lineTo(-0.8, 0.6);
  shape.bezierCurveTo(-0.8, 1.0, -0.6, 1.2, 0, 1.2);

  const extrudeSettings = {
    depth: 0.15,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 8,
  };

  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

// 3D Scene Component with Premium Materials
function ParallaxScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const shieldRef = useRef<THREE.Mesh | null>(null);
  const chartRef = useRef<THREE.Group | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Premium Lighting Setup
    // Ambient fill light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Key light (top-left for rim lighting)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(-3, 4, 3);
    scene.add(keyLight);

    // Rim light (back-right for edge highlights)
    const rimLight = new THREE.DirectionalLight(0xfff5e6, 0.8);
    rimLight.position.set(3, 2, -2);
    scene.add(rimLight);

    // Orange accent light for subsurface effect
    const accentLight = new THREE.PointLight(0xf97316, 0.6, 8);
    accentLight.position.set(-2, 0, 1);
    scene.add(accentLight);

    // SHIELD - High-Gloss Frosted Glass with Orange Subsurface
    const shieldGeometry = createShieldGeometry();
    const shieldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.12,
      transmission: 0.92,
      thickness: 1.5,
      ior: 1.5, // Refractive index for glass
      transparent: true,
      opacity: 0.95,
      attenuationColor: new THREE.Color(0xf97316), // Orange subsurface scattering
      attenuationDistance: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.0,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xffa366),
    });

    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(-2.8, 0.2, 0);
    shield.rotation.y = 0.3;
    shield.scale.set(0.9, 0.9, 0.9);
    scene.add(shield);
    shieldRef.current = shield;

    // CHART - Polished White Ceramic / Clear Acrylic Bars
    const chartGroup = new THREE.Group();
    const barHeights = [0.5, 0.8, 0.6, 1.1, 0.7, 0.95, 1.3];

    const barMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfefefe,
      metalness: 0.0,
      roughness: 0.05,
      transmission: 0.3,
      thickness: 0.8,
      ior: 1.45,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
      envMapIntensity: 0.8,
    });

    barHeights.forEach((height, i) => {
      const barGeometry = new THREE.BoxGeometry(0.18, height, 0.18);
      // Round the edges slightly
      barGeometry.translate(0, height / 2, 0);
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.set(i * 0.26 - 0.78, -0.6, 0);
      chartGroup.add(bar);
    });

    // Base platform for chart
    const baseGeometry = new THREE.BoxGeometry(2.2, 0.06, 0.4);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8f8f8,
      metalness: 0.1,
      roughness: 0.15,
      clearcoat: 0.8,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0.1, -0.63, 0);
    chartGroup.add(base);

    chartGroup.position.set(2.6, 0, 0);
    chartGroup.rotation.y = -0.25;
    scene.add(chartGroup);
    chartRef.current = chartGroup;

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      // Smooth interpolation for parallax
      targetRef.current.x += (mouseRef.current.x - targetRef.current.x) * 0.04;
      targetRef.current.y += (mouseRef.current.y - targetRef.current.y) * 0.04;

      // Inverse parallax movement with subtle rotation
      if (shieldRef.current) {
        shieldRef.current.rotation.y = 0.3 + targetRef.current.x * 0.4;
        shieldRef.current.rotation.x = -targetRef.current.y * 0.25;
        shieldRef.current.rotation.z = targetRef.current.x * 0.1;
        shieldRef.current.position.x = -2.8 - targetRef.current.x * 0.25;
        shieldRef.current.position.y = 0.2 - targetRef.current.y * 0.15;
      }

      if (chartRef.current) {
        chartRef.current.rotation.y = -0.25 - targetRef.current.x * 0.35;
        chartRef.current.rotation.x = targetRef.current.y * 0.15;
        chartRef.current.position.x = 2.6 + targetRef.current.x * 0.25;
        chartRef.current.position.y = targetRef.current.y * 0.15;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameRef.current);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
      shieldGeometry.dispose();
      shieldMaterial.dispose();
      barMaterial.dispose();
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

  // Gyroscope handler (mobile) - Device Orientation API
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // Clamp values for smoother experience
        const gamma = Math.max(-30, Math.min(30, e.gamma));
        const beta = Math.max(20, Math.min(70, e.beta));
        mouseRef.current.x = (gamma / 30) * 0.6;
        mouseRef.current.y = ((beta - 45) / 25) * 0.6;
      }
    };

    // Request permission on iOS 13+
    const requestGyroPermission = async () => {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch {
          // Permission denied or error
        }
      } else {
        // Non-iOS or older iOS
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    // Trigger on first user interaction for iOS
    document.addEventListener('touchstart', requestGyroPermission, { once: true });
    document.addEventListener('click', requestGyroPermission, { once: true });

    // Try immediately for non-iOS
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 md:opacity-90 opacity-50"
      aria-hidden="true"
    />
  );
}

// Premium Glassmorphism Countdown Card
function CountdownCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="relative w-full md:w-auto">
      <div
        className="
          rounded-2xl px-6 py-5 md:px-8 md:py-6
          min-w-full md:min-w-[130px]
          text-center
        "
        style={{
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        }}
      >
        <div
          className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight"
          style={{ color: '#111111' }}
        >
          {value.toString().padStart(2, '0')}
        </div>
        <div className="text-xs md:text-sm text-gray-500 uppercase tracking-wider mt-1 font-medium">
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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#FDFBF9' }}
    >
      {/* Geometric Dot Grid Pattern - 2px dots, 40px spacing, 5% opacity */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0, 0, 0, 0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Soft White Vignette - Airy Lab Feel */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 100% 80% at 50% 45%, transparent 0%, rgba(253, 251, 249, 0.3) 50%, rgba(253, 251, 249, 0.7) 100%)',
        }}
        aria-hidden="true"
      />

      {/* 3D Parallax Scene - Reduced opacity on mobile */}
      {mounted && <ParallaxScene />}

      {/* Header - Neutral Dark Logo */}
      <header className="relative z-10 pt-6 md:pt-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center md:justify-start gap-2">
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
          <span className="text-xl md:text-2xl font-semibold">
            <span style={{ color: '#1f2937' }}>Seller</span>
            <span style={{ color: '#374151' }}>Centry</span>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-6 py-8 md:py-12 min-h-[calc(100vh-120px)]">
        <div className="max-w-2xl mx-auto text-center w-full">
          {/* Launch Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 md:mb-8"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
            <span className="text-xs md:text-sm font-semibold uppercase tracking-wider" style={{ color: '#374151' }}>
              Launch Imminent
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-[2.5rem] leading-[1.1] md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6"
            style={{ letterSpacing: '-0.02em', color: '#111111' }}
          >
            <span className="block">The Future of</span>
            <span className="block" style={{ color: '#F97316' }}>Amazon Protection</span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-base md:text-lg lg:text-xl mb-8 md:mb-12 max-w-lg mx-auto px-2"
            style={{ color: '#6b7280' }}
          >
            A sophisticated shield for your seller account. Smarter, faster, and designed for growth.
          </p>

          {/* Countdown Timer */}
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
                    rounded-xl text-base
                    focus:outline-none focus:ring-2 focus:ring-orange-500/30
                    transition-all
                  "
                  style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    color: '#111111',
                  }}
                  required
                />
                <button
                  type="submit"
                  className="
                    inline-flex items-center justify-center gap-2
                    px-6 py-4 min-h-[52px]
                    font-semibold rounded-xl
                    hover:-translate-y-0.5
                    active:translate-y-0
                    transition-all duration-200
                    text-base
                  "
                  style={{
                    background: '#111111',
                    color: '#ffffff',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  }}
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
              <div className="flex items-center justify-center gap-6 mt-4 text-sm" style={{ color: '#9ca3af' }}>
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    style={{ color: '#22c55e' }}
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
                    className="w-4 h-4"
                    style={{ color: '#9ca3af' }}
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
            <div
              className="max-w-md mx-auto rounded-2xl px-8 py-10"
              style={{
                background: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
              }}
            >
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
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
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#111111' }}>
                You&apos;re on the list!
              </h3>
              <p style={{ color: '#6b7280' }}>
                We&apos;ll notify you when we launch.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 md:py-6 text-center text-sm" style={{ color: '#9ca3af' }}>
        <p>&copy; {new Date().getFullYear()} SellerCentry. All rights reserved.</p>
      </footer>
    </div>
  );
}
