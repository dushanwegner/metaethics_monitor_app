'use client';

import { useState } from 'react';
import { TbKey, TbCopy, TbRefresh, TbCheck } from 'react-icons/tb';
import { apiPost } from '../lib/api';
import type { TokenResponse } from '../lib/types';

/**
 * Collapsible panel for managing the user's AI API access token.
 * Placed in the HomeTab footer section alongside the logout button.
 */
export default function ApiTokenPanel() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Fetch or create token on first open
  const handleToggle = async () => {
    if (!open && token === null) {
      setLoading(true);
      setError('');
      try {
        const data = await apiPost<TokenResponse>('/api/v1/token/generate/', {});
        setToken(data.token);
        setLastUsed(data.last_used_at);
      } catch {
        setError('Failed to load token');
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  const handleCopy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in the input
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset your API token? The old token will stop working immediately.')) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiPost<TokenResponse>('/api/v1/token/reset/', {});
      setToken(data.token);
      setLastUsed(null);
    } catch {
      setError('Failed to reset token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="api-token-panel">
      <button className="home-footer__btn" onClick={handleToggle}>
        <TbKey size={18} />
        <span>AI API Token</span>
      </button>

      {open && (
        <div className="api-token-panel__body">
          {loading && <p className="api-token-panel__status">Loading...</p>}
          {error && <p className="api-token-panel__error">{error}</p>}
          {token && !loading && (
            <>
              <div className="api-token-panel__token-row">
                <code className="api-token-panel__token">{token}</code>
                <button className="api-token-panel__action" onClick={handleCopy} title="Copy">
                  {copied ? <TbCheck size={16} /> : <TbCopy size={16} />}
                </button>
                <button className="api-token-panel__action" onClick={handleReset} title="Reset">
                  <TbRefresh size={16} />
                </button>
              </div>
              {lastUsed && (
                <p className="api-token-panel__meta">
                  Last used: {new Date(lastUsed).toLocaleDateString()}
                </p>
              )}
              <p className="api-token-panel__hint">
                Use <code>?token=...</code> or <code>Authorization: Bearer ...</code>
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
