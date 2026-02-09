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

    // Block IPv6 private ranges
    if (hostname.startsWith("[")) {
      const ipv6 = hostname.slice(1, -1).toLowerCase()
      if (
        ipv6 === "::1" ||
        ipv6.startsWith("fc") ||
        ipv6.startsWith("fd") ||
        ipv6.startsWith("fe80") ||
        ipv6.startsWith("::ffff:127") ||
        ipv6.startsWith("::ffff:10.") ||
        ipv6.startsWith("::ffff:192.168")
      ) {
        return { valid: false, error: "Private IPv6 address blocked" }
      }
    }

    // Block cloud metadata endpoints
    if (
      hostname === "169.254.169.254" ||
      hostname === "metadata.google.internal" ||
      hostname === "metadata.google.com"
    ) {
      return { valid: false, error: "Cloud metadata endpoint blocked" }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: "Invalid URL format" }
  }
}
