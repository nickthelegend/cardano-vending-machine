"use client"

import { type Wallet, useWallet } from "@txnlab/use-wallet-react"
import { toast } from "react-toastify"
import { motion, AnimatePresence } from "framer-motion"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

const ConnectWalletModal = ({
  wallets,
  isOpen,
  onClose,
}: {
  wallets: Wallet[]
  isOpen: boolean
  onClose: () => void
}) => {
  const { activeAccount } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handleWalletClick = async (wallet: Wallet) => {
    try {
      if (wallet.isConnected) {
        await wallet.setActive()
        toast.success("Wallet set as active")
      } else {
        await wallet.connect()
        toast.success("Wallet connected successfully")
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to connect wallet")
    }
  }

  const disconnectWallets = async () => {
    try {
      for (const wallet of wallets) {
        if (wallet.isConnected) {
          await wallet.disconnect()
        }
      }
      toast.success("Disconnected from all wallets")
      onClose()
    } catch (error) {
      console.error(error)
      toast.error("Failed to disconnect wallets")
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[100]"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-card dark:bg-card rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex justify-between items-center w-full mb-4">
              <h3 className="text-lg font-medium">Connect to a wallet</h3>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close wallet connect modal"
              >
                <span className="sr-only">Close</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 w-full">
              {wallets.map((wallet, index) => (
                <motion.div
                  onClick={() => handleWalletClick(wallet)}
                  key={wallet.id}
                  className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors w-full
                    ${
                      wallet.isConnected
                        ? "bg-accent/10 border border-accent/20 hover:bg-accent/20"
                        : "bg-muted border border-border hover:bg-muted/80"
                    }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="font-medium">
                    {wallet.metadata.name}{" "}
                    {wallet.activeAccount &&
                      `[${wallet.activeAccount.address.slice(0, 3)}...${wallet.activeAccount.address.slice(-3)}]`}
                    {wallet.isActive && ` (active)`}
                  </span>
                  <img
                    src={wallet.metadata.icon || "/placeholder.svg?height=24&width=24&query=wallet-icon"}
                    alt={`${wallet.metadata.name} icon`}
                    className="h-6 w-6"
                  />
                </motion.div>
              ))}

              {activeAccount && (
                <motion.div
                  onClick={disconnectWallets}
                  className="flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 mt-4 w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="font-medium text-destructive">
                    Disconnect{" "}
                    {activeAccount && `[${activeAccount.address.slice(0, 3)}...${activeAccount.address.slice(-3)}]`}
                  </span>
                </motion.div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t text-sm text-center text-muted-foreground w-full">
              <span>New to Algorand? </span>
              <a
                href="https://algorand.com/wallets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                Learn more about wallets
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default ConnectWalletModal
