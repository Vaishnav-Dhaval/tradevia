import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatErrorMessage(error: any, fallbackStr: string = 'An error occurred'): string {
  try {
    const rawError = error?.response?.data?.error || error?.response?.data?.message || fallbackStr;
    if (typeof rawError !== "string") {
      if (Array.isArray(rawError) && rawError.length > 0 && rawError[0].message) {
        const err = rawError[0];
        const path = err.path ? err.path.join('.') : '';
        return path ? `${path.charAt(0).toUpperCase() + path.slice(1)}: ${err.message}` : err.message;
      }
      return rawError?.toString() || fallbackStr;
    }
    const parsed = JSON.parse(rawError);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
      const err = parsed[0];
      const path = err.path ? err.path.join('.') : '';
      return path ? `${path.charAt(0).toUpperCase() + path.slice(1)}: ${err.message}` : err.message;
    }
    return rawError;
  } catch (e) {
    return error?.response?.data?.error || error?.response?.data?.message || fallbackStr;
  }
}
