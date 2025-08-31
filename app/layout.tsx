import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WordPress記事自動生成システム',
  description: 'AIを使ってWordPress記事を自動生成',
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