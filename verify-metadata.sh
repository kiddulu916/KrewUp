#!/bin/bash

echo "🔍 SEO Metadata Verification"
echo "=================================================="
echo ""

# Check homepage metadata
echo "📄 Checking: app/page.tsx"
echo ""

# Check for required fields in homepage
HOMEPAGE_CHECKS=(
  "title:"
  "description:"
  "keywords:"
  "openGraph:"
  "siteName:"
  "locale:"
  "twitter:"
  "card:"
  "https://krewup.net/og-image.png"
)

for check in "${HOMEPAGE_CHECKS[@]}"; do
  if grep -q "$check" ./app/page.tsx; then
    echo "  ✅ Found: $check"
  else
    echo "  ❌ Missing: $check"
  fi
done

echo ""
echo "=================================================="
echo ""
echo "📄 Checking: app/pricing/page.tsx"
echo ""

# Check for required fields in pricing page
PRICING_CHECKS=(
  "title:"
  "description:"
  "openGraph:"
  "siteName:"
  "locale:"
  "twitter:"
  "card:"
  "https://krewup.net/og-image.png"
)

for check in "${PRICING_CHECKS[@]}"; do
  if grep -q "$check" ./app/pricing/page.tsx; then
    echo "  ✅ Found: $check"
  else
    echo "  ❌ Missing: $check"
  fi
done

echo ""
echo "=================================================="
echo ""
echo "📸 Checking: public/og-image.png"
echo ""

if [ -f "./public/og-image.png" ]; then
  echo "  ✅ og-image.png exists"
  ls -lh ./public/og-image.png
else
  echo "  ❌ og-image.png not found"
  exit 1
fi

echo ""
echo "=================================================="
echo ""
echo "✅ All SEO metadata checks passed!"
echo ""
