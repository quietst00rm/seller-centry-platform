// Subdomain utilities for Seller Centry
// Tenant data is now fetched from Google Sheets instead of Redis

export function sanitizeSubdomain(subdomain: string): string {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function isValidSubdomain(subdomain: string): boolean {
  const sanitized = sanitizeSubdomain(subdomain);
  return sanitized.length > 0 && sanitized.length <= 63 && sanitized === subdomain;
}
