import './globals.css'
import type { Metadata } from 'next'
import AuthProvider from '@/components/AuthProvider'

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
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}