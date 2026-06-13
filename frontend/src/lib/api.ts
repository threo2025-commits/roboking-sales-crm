import { showToast } from '@/components/ToastHost';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://api-mint.roboking.in/api' : 'http://localhost:5000/api');

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response) {
  const text = await res.text();
  if (!text) return res.statusText || 'Request failed';
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  } catch {}
  return text;
}

const quietMutationPaths = [
  '/auth/login',
  '/auth/logout',
  '/chat/messages',
  '/whatsapp/open-url',
  '/imports/preview'
];

function shouldShowSuccess(path: string, method: string) {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return false;
  if (quietMutationPaths.some((quietPath) => path === quietPath)) return false;
  if (/\/chat\/conversations\/[^/]+\/read$/.test(path)) return false;
  if (/\/notifications\/[^/]+\/read$/.test(path)) return false;
  return true;
}

function successMessage(path: string, method: string, data: unknown) {
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  if (path === '/users') return 'Login ID created successfully.';
  if (path.includes('/reset-password')) return 'Password updated successfully.';
  if (path.includes('/force-logout')) return 'User logged out successfully.';
  if (path.endsWith('/disable')) return 'User disabled successfully.';
  if (path.endsWith('/enable')) return 'User enabled successfully.';
  if (path === '/users/connect-email-account') return 'Email account settings saved successfully.';
  if (path.includes('/stage')) return 'Pipeline stage updated successfully.';
  if (path.includes('/notes')) return 'Note added successfully.';
  if (path.includes('/followups') && path.includes('/reschedule')) return 'Follow-up rescheduled successfully.';
  if (path.includes('/followups')) return 'Follow-up updated successfully.';
  if (path.includes('/imports/commit')) return 'Lead import completed successfully.';
  if (path.includes('/settings')) return 'Settings updated successfully.';
  if (path.includes('/calls/log')) return 'Call log saved successfully.';
  if (path.includes('/email/send')) return 'Email sent successfully.';
  if (path.includes('/chat/groups')) return 'Chat group created successfully.';
  if (path.includes('/chat/direct')) return 'Conversation created successfully.';
  if (method === 'DELETE') return 'Removed successfully.';
  if (method === 'PATCH' || method === 'PUT') return 'Updated successfully.';
  return 'Saved successfully.';
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rk_crm_token') : null;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    credentials: 'include'
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  const data = await res.json() as T;
  const method = (options.method || 'GET').toUpperCase();
  if (shouldShowSuccess(path, method)) {
    showToast(successMessage(path, method, data));
  }
  return data;
}

export async function downloadApiFile(path: string, fileName: string) {
  const token = localStorage.getItem('rk_crm_token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include'
  });
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
