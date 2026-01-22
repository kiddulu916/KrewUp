# SEO Metadata Summary

## Overview
This document summarizes the complete SEO metadata implementation for the KrewUp marketing landing pages.

## Pages with Complete SEO Metadata

### 1. Homepage (`app/page.tsx`)

**Meta Tags:**
- ✅ Title: "KrewUp - Connect Skilled Trade Workers with Employers"
- ✅ Description: Full description with keywords
- ✅ Keywords: Array of relevant trade job keywords

**OpenGraph Tags:**
- ✅ `og:title`: "KrewUp - Connect Skilled Trade Workers with Employers"
- ✅ `og:description`: Platform description
- ✅ `og:type`: "website"
- ✅ `og:url`: "https://krewup.net"
- ✅ `og:site_name`: "KrewUp"
- ✅ `og:locale`: "en_US"
- ✅ `og:image`: "https://krewup.net/og-image.png" (1200x630, absolute URL)
- ✅ `og:image:width`: 1200
- ✅ `og:image:height`: 630
- ✅ `og:image:alt`: "KrewUp - Trade Jobs Platform"

**Twitter Card Tags:**
- ✅ `twitter:card`: "summary_large_image"
- ✅ `twitter:title`: "KrewUp - Connect Skilled Trade Workers with Employers"
- ✅ `twitter:description`: Platform description
- ✅ `twitter:image`: "https://krewup.net/og-image.png" (absolute URL)

### 2. Pricing Page (`app/pricing/page.tsx`)

**Meta Tags:**
- ✅ Title: "Pricing - KrewUp Pro | Trade Jobs Platform"
- ✅ Description: Pricing plan description

**OpenGraph Tags:**
- ✅ `og:title`: "KrewUp Pricing - Plans for Trade Professionals"
- ✅ `og:description`: "Free and Pro plans for workers and employers. Start free, upgrade when ready."
- ✅ `og:type`: "website"
- ✅ `og:url`: "https://krewup.net/pricing"
- ✅ `og:site_name`: "KrewUp"
- ✅ `og:locale`: "en_US"
- ✅ `og:image`: "https://krewup.net/og-image.png" (1200x630, absolute URL)
- ✅ `og:image:width`: 1200
- ✅ `og:image:height`: 630
- ✅ `og:image:alt`: "KrewUp Pricing - Trade Jobs Platform"

**Twitter Card Tags:**
- ✅ `twitter:card`: "summary_large_image"
- ✅ `twitter:title`: "KrewUp Pricing - Plans for Trade Professionals"
- ✅ `twitter:description`: "Free and Pro plans for workers and employers. Start free, upgrade when ready."
- ✅ `twitter:image`: "https://krewup.net/og-image.png" (absolute URL)

## Assets

### OpenGraph Image
- ✅ **File**: `/public/og-image.png`
- ✅ **Dimensions**: 1200x630 (optimal for OpenGraph)
- ✅ **Size**: 58KB
- ✅ **URL**: Absolute URL used (https://krewup.net/og-image.png)

## Best Practices Implemented

1. **Absolute URLs**: All image URLs use absolute paths (https://krewup.net/og-image.png)
2. **Proper Dimensions**: Image dimensions specified (1200x630)
3. **Alt Text**: Descriptive alt text for all images
4. **Locale**: Specified locale (en_US) for international SEO
5. **Site Name**: Consistent site name across all pages
6. **Card Type**: Using "summary_large_image" for maximum visual impact
7. **Complete Coverage**: Both OpenGraph (Facebook, LinkedIn) and Twitter Cards

## Verification

Run the verification script to check all metadata:
```bash
bash verify-metadata.sh
```

## Expected Social Media Preview

When shared on:
- **Facebook/LinkedIn**: Will show large image preview (1200x630) with title and description
- **Twitter**: Will show large card with image, title, and description
- **Slack/Discord**: Will show rich preview with image and metadata

## Notes

- All metadata follows Next.js 13+ App Router conventions
- Metadata is exported as `const metadata: Metadata` from page files
- Images use absolute URLs for proper social media rendering
- All required OpenGraph and Twitter Card fields are present
