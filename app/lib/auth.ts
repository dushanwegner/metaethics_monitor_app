import { apiPost } from './api';

type LoginResponse = { status: 'ok'; is_staff?: boolean } | { status: '2fa_required' };
type VerifyResponse = { status: 'ok'; is_staff?: boolean };

const STAFF_KEY = 'auth:is_staff';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await apiPost<LoginResponse>('/api/login/', { username, password });
  if (res.status === 'ok' && 'is_staff' in res) {
    saveStaffFlag(res.is_staff ?? false);
  }
  return res;
}

export async function verifyOtp(otp_token: string): Promise<VerifyResponse> {
  const res = await apiPost<VerifyResponse>('/api/login/verify/', { otp_token });
  if (res.status === 'ok' && 'is_staff' in res) {
    saveStaffFlag(res.is_staff ?? false);
  }
  return res;
}

function saveStaffFlag(isStaff: boolean) {
  try { localStorage.setItem(STAFF_KEY, isStaff ? '1' : '0'); } catch {}
}

export function isStaff(): boolean {
  try { return localStorage.getItem(STAFF_KEY) === '1'; } catch { return false; }
}
