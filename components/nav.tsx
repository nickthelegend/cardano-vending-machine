"use client"

import Link from "next/link"
import { ConnectWalletButton } from "./connect-wallet-button"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useWallet } from "@txnlab/use-wallet-react"

export default function Nav() {
  const pathname = usePathname()
  const { activeAccount } = useWallet()
  const isPayPage = pathname.startsWith("/pay")

  return (
    <motion.nav
      className="flex justify-between items-center p-4 border-b backdrop-blur-sm bg-background/80 sticky top-0 z-50 w-full"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Link href="/" className="flex items-center gap-2">
        <div className="relative w-8 h-8 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full"
            whileHover={{ scale: 1.2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          />
        </div>
        <motion.h1
          className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          VendChain
        </motion.h1>
      </Link>

      {!isPayPage && (
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          {activeAccount && (
            <Link
              href="/pay"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname.startsWith("/pay") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Pay
            </Link>
          )}
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === "/about" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            About
          </Link>
        </div>
      )}

      <div className="flex items-center">
        <ConnectWalletButton />
      </div>
    </motion.nav>
  )
}
