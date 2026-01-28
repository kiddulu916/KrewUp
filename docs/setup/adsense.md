# AdSense setup

Ads are driven by environment variables and are only shown on **content-focused** pages, in line with [Google’s inventory value policy](https://support.google.com/adsense/answer/9274019).

The app implements AdSense’s recommended setup:

1. **Script in head** – The AdSense script (`adsbygoogle.js`) is loaded in the document head via Next.js `Script` with `strategy="beforeInteractive"` when `NEXT_PUBLIC_ADS_ENABLED=true` and a valid `NEXT_PUBLIC_ADSENSE_CLIENT_ID` are set.
2. **Meta tag** – `<meta name="google-adsense-account" content="ca-pub-XXXXXXXXXXXXXXXX" />` is added to the root layout head when AdSense is configured.
3. **ads.txt** – `public/ads.txt` must contain the line from your AdSense account (Account → Ads.txt). Example: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`. Update it with the exact snippet from your AdSense “Ads.txt snippet” if you use a different account or cert.

## Required variables (`.env.local`)

Replace placeholders with values from your [AdSense](https://www.google.com/adsense/) account:

| Variable                              | Format / source                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_ADS_ENABLED`             | `true` to turn ads on                                                                 |
| `NEXT_PUBLIC_AD_PROVIDER`             | `adsense`                                                                             |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID`       | Publisher ID: `ca-pub-XXXXXXXXXXXXXXXX` (16 digits) from AdSense → Account → Settings |
| `NEXT_PUBLIC_ADSENSE_SLOT_JOB_BANNER` | Ad unit ID for feed banner (AdSense → Ads → By ad unit)                               |
| `NEXT_PUBLIC_ADSENSE_SLOT_IN_FEED`    | Ad unit ID for in-feed (between job cards)                                            |
| `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR`    | Ad unit ID for profile sidebar                                                        |

If `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is missing, empty, or still the placeholder `ca-pub-XXXXXXX`, the AdSense script is not loaded and no ads are requested (so nothing will display until real values are set).

## Where ads appear (inventory value policy)

Ads are restricted to pages where **content is the main focus**:

- **Feed** (`/dashboard/feed`) – banner via `FeedAdBanner`
- **Job list** (`/dashboard/jobs`) – in-feed units via `InFeedAd` (every N jobs)
- **Profile view** (`/dashboard/profiles/[id]`) – sidebar via `SidebarAd`

They are **not** used on:

- Login, signup, thank-you, or error pages
- Empty or “dead-end” screens
- Screens where the main interaction is off-screen (e.g. flashlight-style flows)
- Auto-generated content that hasn’t been reviewed

Configuration and policy notes live in `lib/ads/config.ts`.
