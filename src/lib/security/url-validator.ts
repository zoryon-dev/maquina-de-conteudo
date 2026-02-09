/**
 * SSRF URL Validation Helper
 *
 * Validates that URLs are safe for server-side fetching by blocking:
 * - Private/internal IP ranges (RFC 1918, link-local, loopback)
 * - Cloud metadata endpoints (AWS, GCP)
 * - Non-HTTP(S) protocols
 */

/**
 * Validates a URL is safe for server-side fetching (no SSRF).
 * Blocks private IPs, localhost, cloud metadata endpoints, and internal services.
 */
export function validateExternalUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url)

    // Only allow http and https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "Only http and https protocols are allowed" }
    }

    const hostname = parsed.hostname.toLowerCase()

    // Block localhost
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") {
      return { valid: false, error: "Localhost URLs are not allowed" }
    }

    // Block cloud metadata endpoints (checked before generic IPv4 ranges
    // so 169.254.169.254 gets the more specific error message)
    if (
      hostname === "169.254.169.254" ||
      hostname === "metadata.google.internal" ||
      hostname === "metadata.google.com"
    ) {
      return { valid: false, error: "Cloud metadata endpoint blocked" }
    }

    // Block decimal/hex/octal IP representations (e.g. 2130706433, 0x7f000001, 0177.0.0.1)
    // These can bypass standard dotted-decimal checks
    if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d{5,}$/.test(hostname) || /^0\d/.test(hostname)) {
      return { valid: false, error: "Non-standard IP encoding blocked" }
    }

    // Block shortened loopback (e.g. 127.1)
    if (/^127\.\d+$/.test(hostname)) {
      return { valid: false, error: "Loopback address blocked" }
    }

    // Block private IPv4 ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number)
      if (a === 10) return { valid: false, error: "Private IP range (10.x)" }
      if (a === 172 && b >= 16 && b <= 31) return { valid: false, error: "Private IP range (172.16-31.x)" }
      if (a === 192 && b === 168) return { valid: false, error: "Private IP range (192.168.x)" }
      if (a === 169 && b === 254) return { valid: false, error: "Link-local address blocked" }
      if (a === 127) return { valid: false, error: "Loopback address blocked" }
      if (a === 0) return { valid: false, error: "Invalid IP range" }
    }

    // Block IPv6 private ranges (including IPv4-mapped addresses)
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase()
      if (
        ipv6 === "::1" ||
        ipv6.startsWith("fc") ||
        ipv6.startsWith("fd") ||
        ipv6.startsWith("fe80") ||
        ipv6.startsWith("::ffff:127") ||
        ipv6.startsWith("::ffff:10.") ||
        ipv6.startsWith("::ffff:192.168") ||
        ipv6.startsWith("::ffff:172.")
      ) {
        // For ::ffff:172.x, also check if it's in the 172.16-31 private range
        if (ipv6.startsWith("::ffff:172.")) {
          const mapped = ipv6.replace("::ffff:", "")
          const secondOctet = parseInt(mapped.split(".")[1] || "0", 10)
          if (secondOctet >= 16 && secondOctet <= 31) {
            return { valid: false, error: "Private IPv6-mapped address blocked" }
          }
        } else {
          return { valid: false, error: "Private IPv6 address blocked" }
        }
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }
}

/**
 * Validates an array of URLs. Returns the first failure, or { valid: true }.
 */
export function validateExternalUrls(
  urls: string[],
  label = "URL",
): { valid: boolean; error?: string } {
  for (const url of urls) {
    const check = validateExternalUrl(url)
    if (!check.valid) {
      return { valid: false, error: `Invalid ${label}: ${check.error}` }
    }
  }
  return { valid: true }
}
