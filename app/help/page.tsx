"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail, Phone, MessageSquare, MapPin } from "lucide-react"

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold text-white mb-2">Help & Support</h1>
          <p className="text-gray-400 mb-8">Get in touch with our support team</p>
        </motion.div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-slate-800 border-orange-500/20 p-6 hover:border-orange-500/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500/20 p-3 rounded-lg">
                  <Mail className="text-orange-500" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Email Support</h3>
                  <p className="text-gray-400 mb-4">Reach out to us via email for detailed inquiries</p>
                  <a
                    href="mailto:support@vendchain.com"
                    className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
                  >
                    support@vendchain.com
                  </a>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-slate-800 border-orange-500/20 p-6 hover:border-orange-500/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500/20 p-3 rounded-lg">
                  <Phone className="text-orange-500" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Phone Support</h3>
                  <p className="text-gray-400 mb-4">Call us during business hours (9 AM - 6 PM EST)</p>
                  <a
                    href="tel:+1-800-VENDCHAIN"
                    className="text-orange-500 hover:text-orange-400 font-medium transition-colors"
                  >
                    +1-800-VENDCHAIN
                  </a>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Live Chat */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-slate-800 border-orange-500/20 p-6 hover:border-orange-500/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500/20 p-3 rounded-lg">
                  <MessageSquare className="text-orange-500" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Live Chat</h3>
                  <p className="text-gray-400 mb-4">Chat with our support team in real-time</p>
                  <button className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
                    Start Chat
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-slate-800 border-orange-500/20 p-6 hover:border-orange-500/40 transition-colors">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500/20 p-3 rounded-lg">
                  <MapPin className="text-orange-500" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Visit Us</h3>
                  <p className="text-gray-400 mb-4">Come visit our headquarters</p>
                  <p className="text-orange-500 font-medium">
                    123 Blockchain Ave
                    <br />
                    San Francisco, CA 94105
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="bg-slate-800 border-orange-500/20 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-2">How do I use VendChain?</h3>
                <p className="text-gray-400">
                  Connect your Algorand wallet, scan a vending machine QR code, enter the amount, and confirm the
                  payment. Your items will be dispensed instantly.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-400">
                  We accept ALGO (Algorand) tokens. You'll need an Algorand wallet with sufficient balance to make
                  purchases.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Is my payment secure?</h3>
                <p className="text-gray-400">
                  Yes! All transactions are secured by the Algorand blockchain. Your wallet remains in your control at
                  all times.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-2">What if I encounter an issue?</h3>
                <p className="text-gray-400">
                  Contact our support team using any of the methods above. We're here to help resolve any issues
                  quickly.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-500 mb-2">Can I get a refund?</h3>
                <p className="text-gray-400">
                  If there's an issue with your transaction, please contact support immediately. We'll investigate and
                  process refunds if applicable.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <Link href="/">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
