import type { Metadata } from 'next'

// What link previews (WhatsApp, LinkedIn, X, Slack) show for the public pages.
// Without an og:image they fall back to the first photo on the page.
const title = "MediVault · Your family's health, on one calendar"
const description =
  "Your family's prescriptions, read and dated on one calendar. Photograph a prescription and MediVault reads the doctor, the date and every medicine. Try the demo with a sample family."
const image = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'MediVault: a family calendar of prescriptions and vaccinations next to an emergency card with a QR code',
}

export function shareMetadata(path: string): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      type: 'website',
      siteName: 'MediVault',
      locale: 'en_IN',
      url: path,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}
