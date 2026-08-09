const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

interface FetchOptions extends RequestInit {
  body?: any;
}

// Custom API error with the parsed response body attached
export class ApiError extends Error {
  status: number;
  responseBody: any;

  constructor(message: string, status: number, responseBody: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

export const apiFetch = async <T>(endpoint: string, options: FetchOptions = {}): Promise<T> => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only set Content-Type if there IS a body and it's not FormData
  if (options.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    // If the body is already a stringified JSON string from our callers, don't double-stringify
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.statusText || 'Response parsing failed', response.status, null);
  }

  if (!response.ok) {
    const message = data?.message || 'Request failed';
    throw new ApiError(message, response.status, data);
  }

  // Backend wraps responses in { success, message, data } — return inner data if present
  return (data.data !== undefined ? data.data : data) as T;
};
