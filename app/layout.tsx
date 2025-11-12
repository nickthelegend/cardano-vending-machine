import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import Nav from "@/components/nav"
import Footer from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VendChain - On-Chain Vending Machines",
  description: "The future of commerce. Buy anything, anytime, anywhere with blockchain-powered vending machines.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden dark">
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Providers>
            <div className="flex min-h-screen flex-col overflow-x-hidden">
              <Nav />
              <main className="flex-1 w-full overflow-x-hidden">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
