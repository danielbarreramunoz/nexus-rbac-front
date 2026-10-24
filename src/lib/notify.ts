'use client';

import { toast } from 'sonner';
import { ApiError } from '@/services/api-client';

export function notifySuccess(message: string): void {
  toast.success(message);
}

export function notifyApiError(err: unknown, fallback: string): string {
  const message = err instanceof ApiError ? err.message : fallback;
  if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
    toast.error(`Sin permiso: ${message}`);
  } else {
    toast.error(message);
  }
  return message;
}
