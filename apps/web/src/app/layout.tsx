import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SWRProvider } from '@/lib/swr-config'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Çevre - Yerel Sosyal Aktivite Platformu',
  description: 'Yakınındaki aktiviteleri keşfet, mahalleni tanı, komşunla bağlan.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <SWRProvider>{children}</SWRProvider>
      </body>
    </html>
  )
}
