import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SolanaProvider } from '@/providers/SolanaProvider'
import { QueryProvider } from '@/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Minereal — Tokenized Ukraine Minerals',
  description: 'Invest in verified Ukrainian mineral deposits from $10',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: '#F7F9FB', color: '#1C2E45' }}>
        <QueryProvider>
          <SolanaProvider>
            {children}
          </SolanaProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
