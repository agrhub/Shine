/**
 * Parses raw Cookie header string, Set-Cookie header, or key=value pair
 * and extracts the clean session token for Google Flow / Veo / NextAuth.
 */
export function extractFlowCookieToken(rawInput: string): string {
  if (!rawInput) return '';
  let str = rawInput.trim();

  // Strip leading "Cookie:" or "Set-Cookie:" header labels
  str = str.replace(/^(Set-Cookie|Cookie):\s*/i, '');

  // Priority cookie keys for Google Flow / Next-Auth / Veo
  const priorityKeys = [
    '__Secure-next-auth.session-token',
    '__Host-next-auth.session-token',
    'next-auth.session-token',
    '__Secure-1PSID',
    '__Secure-3PSID',
    'sessionToken',
    'session_token',
    'session-token',
    'token',
    'session',
  ];

  // Try extracting priority key first
  for (const key of priorityKeys) {
    const escapedKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = str.match(new RegExp(`(?:^|[;\\s,])${escapedKey}=([^;\\r\\n,]+)`, 'i'));
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim());
    }
  }

  // If starts with key=val (e.g. any_name=eyJ...; Path=/; HttpOnly)
  const firstPairMatch = str.match(/^([a-zA-Z0-9_\-\.]+)=([^;\\r\\n,]+)/);
  if (firstPairMatch && firstPairMatch[2]) {
    return decodeURIComponent(firstPairMatch[2].trim());
  }

  // If it contains semicolons, find first non-attribute chunk
  if (str.includes(';')) {
    const parts = str.split(';').map(p => p.trim());
    for (const part of parts) {
      if (part && !/^(Path|Domain|Expires|Max-Age|HttpOnly|Secure|SameSite)=?/i.test(part)) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          return decodeURIComponent(part.substring(eqIdx + 1).trim());
        }
        return decodeURIComponent(part);
      }
    }
  }

  return str;
}
