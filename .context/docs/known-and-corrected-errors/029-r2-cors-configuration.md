# Error: Cloudflare R2 CORS Configuration Invalid

**Date:** January 17, 2026
**Status:** ✅ Resolved
**Phase:** R2 Storage Migration

## Error Description

When configuring CORS for Cloudflare R2 bucket, the configuration was rejected with "policy not valid" error.

## Root Cause

The CORS configuration was using AWS S3 format with an object wrapper, which R2 does not support. Cloudflare R2 requires a different format than standard AWS S3 CORS.

## Incorrect Configuration

```json
{
  "CORSConfiguration": {
    "AllowedOrigins": [...],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["Content-Length"],
    "MaxAgeSeconds": 3600
  }
}
```

**Problems:**
1. Object wrapper `CORSConfiguration` not supported by R2
2. `OPTIONS` method not supported by R2
3. `ExposeHeaders` not supported by R2

## Correct Configuration

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://maquina-de-conteudo.vercel.app",
      "https://storage-mc.zoryon.org",
      "https://*.zoryon.org"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**Key Changes:**
1. Use **array format** instead of object
2. Remove `OPTIONS` from AllowedMethods
3. Remove `ExposeHeaders` entirely

## Reference

Cloudflare R2 CORS Documentation:
https://developers.cloudflare.com/r2/buckets/cors/#common-issues

## How to Apply

1. Go to Cloudflare Dashboard > R2 > maquina-conteudo bucket
2. Click "Settings" > "CORS Policy"
3. Paste the correct JSON configuration
4. Click "Save"

## Verification

After applying, verify CORS is working:
```bash
curl -I -H "Origin: http://localhost:3000" \
  https://storage-mc.zoryon.org/test-key
```

Should return headers:
```
access-control-allow-origin: http://localhost:3000
access-control-allow-methods: GET, HEAD
```
