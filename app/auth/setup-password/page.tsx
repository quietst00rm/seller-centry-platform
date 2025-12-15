'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

function SetupPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const initRef = useRef(false);
  const tokensRef = useRef<{ access: string | null; refresh: string | null }>({ access: null, refresh: null });

  // Capture tokens immediately on first render, before any async operations
  if (!initRef.current && typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.substring(1));
      tokensRef.current = {
        access: hashParams.get('access_token'),
        refresh: hashParams.get('refresh_token'),
      };
    }
  }

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initRef.current) return;
    initRef.current = true;

    const supabase = createClient();
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const accessToken = tokensRef.current.access;
    const refreshToken = tokensRef.current.refresh;

    const setValidSession = () => {
      if (mounted && isValidSession !== true) {
        // Clear hash from URL
        if (window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        setIsValidSession(true);
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    const setInvalidSession = () => {
      if (mounted && isValidSession === null) {
        setIsValidSession(false);
      }
    };

    // Listen for auth state changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session) {
        setValidSession();
      }
    });

    const initializeSession = async () => {
      // Check for existing session first
      const { data: { session: existingSession } } = await supabase.auth.getSession();

      if (existingSession) {
        setValidSession();
        return;
      }

      // Try to set session from tokens if we have them
      if (accessToken && refreshToken) {
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!sessionError && data.session) {
            setValidSession();
            return;
          }
          // If setSession fails, continue to timeout
        } catch (e) {
          // Continue to timeout
        }
      }

      // Set a timeout to eventually fail if no session is established
      timeoutId = setTimeout(() => {
        setInvalidSession();
      }, 3000);
    };

    // Small delay to allow Supabase to potentially auto-process URL
    setTimeout(() => {
      initializeSession();
    }, 100);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isValidSession]);

  const validatePassword = (): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Sign out after setting password so they can log in fresh
      await supabase.auth.signOut();
      setSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Still checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // No valid session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Image
            src="/logos/seller-centry-logo.png"
            alt="Seller Centry"
            width={220}
            height={55}
            className="mx-auto h-12 sm:h-14 w-auto object-contain mb-4"
            priority
          />
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
            Invalid or expired invitation link. Please request a new invite from your account manager.
          </div>
          <Button
            onClick={() => router.push('/login')}
            variant="outline"
            className="w-full touch-target"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Image
            src="/logos/seller-centry-logo.png"
            alt="Seller Centry"
            width={220}
            height={55}
            className="mx-auto h-12 sm:h-14 w-auto object-contain mb-4"
            priority
          />
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Password Set Successfully!</h1>
            <p className="text-muted-foreground">
              You can now log in to your dashboard.
            </p>
          </div>
          <Button
            onClick={() => router.push('/login')}
            className="w-full touch-target"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Password setup form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Image
            src="/logos/seller-centry-logo.png"
            alt="Seller Centry"
            width={220}
            height={55}
            className="mx-auto h-12 sm:h-14 w-auto object-contain mb-4"
            priority
          />
          <h1 className="text-xl font-semibold text-white mb-2">Set Your Password</h1>
          <p className="text-sm text-muted-foreground">
            Create a password to access your dashboard
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="touch-target pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="touch-target pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full touch-target"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting password...
              </>
            ) : (
              'Set Password'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Having trouble? Contact your account manager for help.
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SetupPasswordContent />
    </Suspense>
  );
}
