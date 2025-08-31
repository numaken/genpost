import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'genpost - AI-Powered WordPress Article Generator',
  description: 'Generate. Post. Done. Create high-quality WordPress articles in seconds with AI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}