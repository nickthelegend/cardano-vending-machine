"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { Zap, Lock, TrendingUp } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {/* Hero Section 1 - Main Hero */}
      <section className="relative w-full overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black z-0" />

        {/* Animated accent shapes */}
        <motion.div
          className="absolute top-20 right-[10%] w-64 h-64 rounded-full bg-orange-500/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />

        <motion.div
          className="absolute bottom-20 left-[10%] w-72 h-72 rounded-full bg-orange-600/10 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
          }}
        />

        <div className="container relative z-10 px-4 py-24 md:py-32 mx-auto">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">On-Chain Vending Machines</h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="mt-6 text-xl text-gray-300 max-w-2xl">
                The future of commerce is here. Buy anything, anytime, anywhere with blockchain-powered vending
                machines.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 flex flex-col sm:flex-row gap-4"
            >
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Link href="/pay">Start Shopping</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent"
              >
                <Link href="#features">Learn More</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Hero Section 2 - How It Works */}
      <section id="features" className="relative w-full overflow-hidden py-24 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black z-0" />

        <div className="container relative z-10 px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white">How VendChain Works</h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
              Three simple steps to revolutionize your shopping experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Connect Your Wallet",
                description:
                  "Link your Algorand wallet to access our network of vending machines. Secure, fast, and decentralized.",
                step: "01",
              },
              {
                icon: Lock,
                title: "Scan & Select",
                description:
                  "Use QR codes to browse products and make selections. Every transaction is verified on-chain.",
                step: "02",
              },
              {
                icon: TrendingUp,
                title: "Instant Delivery",
                description:
                  "Get your items instantly. All transactions are recorded on the Algorand blockchain for transparency.",
                step: "03",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-orange-500/20 hover:border-orange-500/50 transition-colors"
              >
                <div className="text-4xl font-bold text-orange-500 mb-4">{feature.step}</div>
                <div className="p-3 rounded-full bg-orange-500/10 mb-4">
                  <feature.icon className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-medium text-white">{feature.title}</h3>
                <p className="mt-2 text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Section 3 - Why VendChain */}
      <section className="relative w-full overflow-hidden py-24 bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/5 to-transparent z-0" />

        <div className="container relative z-10 px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white">Why Choose VendChain?</h2>
            <p className="mt-4 text-gray-400 max-w-2xl mx-auto">Experience the next generation of automated retail</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: "Decentralized",
                description: "No middlemen, no fees. Direct peer-to-peer transactions on the blockchain.",
              },
              {
                title: "Secure",
                description: "Military-grade encryption and blockchain verification for every transaction.",
              },
              {
                title: "Fast",
                description: "Instant transactions with Algorand's lightning-fast consensus mechanism.",
              },
              {
                title: "Transparent",
                description: "Every transaction is recorded and verifiable on the public ledger.",
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-lg bg-slate-900/50 border border-orange-500/20 hover:border-orange-500/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-orange-500 mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
            >
              <Link href="/pay">Get Started Now</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
