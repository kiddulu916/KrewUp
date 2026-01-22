#!/usr/bin/env node

/**
 * SEO Metadata Verification Script
 * Checks that all required OpenGraph and Twitter card metadata is present
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = {
  openGraph: ['title', 'description', 'type', 'url', 'siteName', 'locale', 'images'],
  twitter: ['card', 'title', 'description', 'images'],
};

function checkMetadata(filePath) {
  console.log(`\n📄 Checking: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract metadata object
  const metadataMatch = content.match(/export const metadata: Metadata = \{[\s\S]*?\n\};/);

  if (!metadataMatch) {
    console.log('  ❌ No metadata found');
    return false;
  }

  const metadata = metadataMatch[0];
  let allPassed = true;

  // Check basic metadata
  const hasTitle = metadata.includes('title:');
  const hasDescription = metadata.includes('description:');

  console.log(`  ${hasTitle ? '✅' : '❌'} Title`);
  console.log(`  ${hasDescription ? '✅' : '❌'} Description`);

  if (!hasTitle || !hasDescription) allPassed = false;

  // Check OpenGraph fields
  console.log('\n  OpenGraph:');
  REQUIRED_FIELDS.openGraph.forEach(field => {
    const regex = new RegExp(`${field}:`);
    const hasField = regex.test(metadata);
    console.log(`    ${hasField ? '✅' : '❌'} ${field}`);
    if (!hasField) allPassed = false;
  });

  // Check Twitter card fields
  console.log('\n  Twitter Card:');
  REQUIRED_FIELDS.twitter.forEach(field => {
    const regex = new RegExp(`${field}:`);
    const hasField = regex.test(metadata);
    console.log(`    ${hasField ? '✅' : '❌'} ${field}`);
    if (!hasField) allPassed = false;
  });

  // Check for absolute image URLs
  const hasAbsoluteImageUrl = metadata.includes('https://krewup.net/og-image.png');
  console.log(`\n  ${hasAbsoluteImageUrl ? '✅' : '❌'} Absolute image URLs`);
  if (!hasAbsoluteImageUrl) allPassed = false;

  return allPassed;
}

// Check both pages
const pages = [
  './app/page.tsx',
  './app/pricing/page.tsx',
];

console.log('🔍 SEO Metadata Verification\n');
console.log('='.repeat(50));

let overallPassed = true;

pages.forEach(page => {
  const passed = checkMetadata(page);
  if (!passed) overallPassed = false;
});

console.log('\n' + '='.repeat(50));

// Check that og-image.png exists
const ogImageExists = fs.existsSync('./public/og-image.png');
console.log(`\n📸 ${ogImageExists ? '✅' : '❌'} /public/og-image.png exists`);
if (!ogImageExists) overallPassed = false;

if (overallPassed) {
  console.log('\n✅ All SEO metadata checks passed!\n');
  process.exit(0);
} else {
  console.log('\n❌ Some SEO metadata checks failed.\n');
  process.exit(1);
}
