'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, verifyOtp } from '../lib/auth';
import { ApiError, NetworkError, getApiBase, setApiBase } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

type Step = 'credentials' | '2fa';

export default function LoginPage() {
  const router = useRouter();
  const { checkSession } = useAuth();

  const [step, setStep] = useState<Step>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => getApiBase());
  const isDev = process.env.NODE_ENV === 'development';

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(username, password);
      if (res.status === '2fa_required') {
        setStep('2fa');
      } else {
        await checkSession();
        router.push('/');
      }
    } catch (err) {
      if (err instanceof NetworkError) setError('Network error — check connection and server URL');
      else if (err instanceof ApiError) setError(err.message);
      else setError('Connection failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(otpToken);
      await checkSession();
      router.push('/');
    } catch (err) {
      if (err instanceof NetworkError) setError('Network error — check connection');
      else if (err instanceof ApiError) setError(err.message);
      else setError('Verification failed');
      setOtpToken('');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep('credentials');
    setOtpToken('');
    setError('');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">
          {step === 'credentials' ? 'Sign In' : 'Two-Factor Auth'}
        </h1>
        <p className="login-subtitle">
          {step === 'credentials'
            ? 'Log in to your account'
            : 'Enter the code from your authenticator app'}
        </p>

        {error && <div className="login-error">{error}</div>}

        {step === 'credentials' ? (
          <form className="login-form" onSubmit={handleCredentials}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            {isDev && (
              <div className="login-field">
                <label htmlFor="serverUrl">Server URL</label>
                <input
                  id="serverUrl"
                  type="url"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrl(e.target.value);
                    setApiBase(e.target.value);
                  }}
                  placeholder="http://localhost:8000"
                />
              </div>
            )}
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Signing in\u2026' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleOtp}>
            <div className="login-field">
              <label htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="login-otp-input"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                required
              />
            </div>
            <button type="submit" className="login-button" disabled={loading || otpToken.length < 6}>
              {loading ? 'Verifying\u2026' : 'Verify'}
            </button>
            <button type="button" className="login-back" onClick={handleBack}>
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
