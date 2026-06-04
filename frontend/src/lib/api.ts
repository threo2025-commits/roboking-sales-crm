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
  return res.json();
}
