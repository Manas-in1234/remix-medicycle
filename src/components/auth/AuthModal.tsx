import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  X,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Info,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup';
  initialUsername?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'signin',
  initialUsername = '',
  onSuccess,
}) => {
  const {
    loginWithGoogle,
    loginWithUsernameOrEmail,
    signupWithEmail,
    loginWithUsername,
    resetPassword,
    isSigningIn,
    authError,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>(initialTab);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign In form fields
  const [loginIdentifier, setLoginIdentifier] = useState(initialUsername);
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up form fields
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Forgot Password fields
  const [resetEmail, setResetEmail] = useState('');

  // Sync initial tab and username when opened
  useEffect(() => {
    if (isOpen) {
      setMode(initialTab);
      if (initialUsername) {
        setLoginIdentifier(initialUsername);
      }
      setLocalError(null);
      setResetSent(false);
      clearAuthError();
    }
  }, [isOpen, initialTab, initialUsername]);

  if (!isOpen) return null;

  // Password Strength Calculation
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(signupPassword);

  // Handle Google Sign In / Sign Up
  const handleGoogleAuth = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLocalError(null);
    clearAuthError();
    const success = await loginWithGoogle();
    if (success) {
      onClose();
      onSuccess?.();
    }
  };

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (!loginIdentifier.trim()) {
      setLocalError('Please enter your username or email.');
      return;
    }
    if (!loginPassword) {
      setLocalError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithUsernameOrEmail(loginIdentifier, loginPassword);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
      onSuccess?.();
    } else {
      setLocalError(res.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const name = signupName.trim();
    const username = signupUsername.trim().toLowerCase();
    const email = signupEmail.trim().toLowerCase();
    const password = signupPassword;
    const confirmPassword = signupConfirmPassword;

    if (!name || name.length < 2) {
      setLocalError('Please enter your name.');
      return;
    }

    if (!username || username.length < 3) {
      setLocalError('Username must be at least 3 characters.');
      return;
    }

    if (username.length > 30) {
      setLocalError('Username cannot exceed 30 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setLocalError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await signupWithEmail(name, username, email, password);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
      onSuccess?.();
    } else {
      setLocalError(res.error || 'Registration failed. Please check the form.');
    }
  };

  // Handle Password Reset Request
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const email = resetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(email);
    setIsSubmitting(false);

    if (res.success) {
      setResetSent(true);
    } else {
      setLocalError(res.error || 'Unable to send password reset email.');
    }
  };

  // Handle Prototype Demo Accounts 1-Click login
  const handleDemoClick = async (demoUsername: string) => {
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    const res = await loginWithUsername(demoUsername);
    setIsSubmitting(false);
    if (res.success) {
      onClose();
      onSuccess?.();
    } else {
      setLocalError(res.error || 'Demo login failed.');
    }
  };

  const errorMessage = localError || authError;

  return (
    <div
      id="medicycle-auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div
        id="medicycle-auth-modal-card"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 relative border border-slate-200 my-8"
      >
        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          onClick={() => {
            clearAuthError();
            setLocalError(null);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Centered Logo & Brand */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-2.5">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            MEDI<span className="text-emerald-600">CYCLE</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'signin' && 'Welcome back'}
            {mode === 'signup' && 'Create your Medicycle account'}
            {mode === 'forgot-password' && 'Reset your password'}
          </p>
        </div>

        {/* Tab Toggle (Sign In / Sign Up) - Hidden during Forgot Password */}
        {mode !== 'forgot-password' && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200/80">
            <button
              id="tab-toggle-signin"
              type="button"
              onClick={() => {
                setMode('signin');
                setLocalError(null);
                clearAuthError();
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-toggle-signup"
              type="button"
              onClick={() => {
                setMode('signup');
                setLocalError(null);
                clearAuthError();
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2 animate-in fade-in"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: SIGN IN                                              */}
        {/* ============================================================ */}
        {mode === 'signin' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Google Sign In Button */}
            <button
              id="google-signin-btn"
              onClick={handleGoogleAuth}
              disabled={isSigningIn || isSubmitting}
              type="button"
              className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-98 font-bold text-sm text-slate-700 flex items-center justify-center gap-3 transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                OR
              </span>
            </div>

            {/* Username/Email + Password Form */}
            <form onSubmit={handleSignInSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="signin-identifier-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="signin-identifier-input"
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter username or email"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="signin-password-input"
                    className="block text-xs font-bold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-password');
                      setLocalError(null);
                      clearAuthError();
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    id="signin-password-input"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={isSigningIn || isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer mt-1"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Toggle to Sign Up */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Don't have an account? </span>
              <button
                id="switch-to-signup-btn"
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                  clearAuthError();
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </div>

            {/* Prototype Demo Accounts */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Demo Accounts: Quick 1-click test roles for demonstration.</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1.5">
                <span className="font-semibold text-slate-700 block">Try demo accounts:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoClick('hospital01')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-mono text-[11px] font-bold cursor-pointer transition shadow-2xs"
                  >
                    hospital01
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('driver01')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-700 hover:text-cyan-700 font-mono text-[11px] font-bold cursor-pointer transition shadow-2xs"
                  >
                    driver01
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('plant01')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-700 font-mono text-[11px] font-bold cursor-pointer transition shadow-2xs"
                  >
                    plant01
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoClick('admin01')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 font-mono text-[11px] font-bold cursor-pointer transition shadow-2xs"
                  >
                    admin01
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: SIGN UP                                              */}
        {/* ============================================================ */}
        {mode === 'signup' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Google Sign Up Button */}
            <button
              id="google-signup-btn"
              onClick={handleGoogleAuth}
              disabled={isSigningIn || isSubmitting}
              type="button"
              className="w-full py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-98 font-bold text-sm text-slate-700 flex items-center justify-center gap-3 transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign up with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute">
                OR
              </span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="signup-name-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="signup-username-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <span className="text-slate-400 text-xs font-mono font-bold absolute left-3 top-2.5">
                    @
                  </span>
                  <input
                    id="signup-username-input"
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="Choose a username (e.g. manas01)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Letters, numbers, and underscores only (3-30 chars).
                </span>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="signup-email-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="signup-password-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="signup-password-input"
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a password (min 6 chars)"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {signupPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                      <div
                        className={`h-full flex-1 rounded-full transition-all ${
                          strength.score >= 1 ? strength.color : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-all ${
                          strength.score >= 2 ? strength.color : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full flex-1 rounded-full transition-all ${
                          strength.score >= 3 ? strength.color : 'bg-slate-200'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="signup-confirm-password-input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="signup-confirm-password-input"
                    type={showSignupConfirmPassword ? 'text' : 'password'}
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    tabIndex={-1}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showSignupConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isSigningIn || isSubmitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer mt-2"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Toggle to Sign In */}
            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Already have an account? </span>
              <button
                id="switch-to-signin-btn"
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                  clearAuthError();
                }}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: FORGOT PASSWORD                                      */}
        {/* ============================================================ */}
        {mode === 'forgot-password' && (
          <div className="space-y-4 animate-in fade-in">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setResetSent(false);
                setLocalError(null);
                clearAuthError();
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>

            {resetSent ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Password Reset Email Sent
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                  Password reset email sent. Check your inbox (and spam folder) for instructions to reset your password.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setResetSent(false);
                  }}
                  className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your account email address below, and we'll send you a password reset link.
                </p>

                <div>
                  <label
                    htmlFor="reset-email-input"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      id="reset-email-input"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  id="send-reset-link-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
