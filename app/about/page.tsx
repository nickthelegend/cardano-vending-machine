"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { motion } from "framer-motion"
import { Zap, Shield, Globe, Users } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black z-0" />

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

        <div className="container relative z-10 px-4 py-24 md:py-32 mx-auto">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">About VendChain</h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="mt-6 text-xl text-gray-300 max-w-2xl">
                Revolutionizing retail through blockchain technology. VendChain brings decentralized commerce to every
                corner of the world.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative w-full overflow-hidden py-24 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black z-0" />

        <div className="container relative z-10 px-4 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white">Our Mission</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-orange-500/20 rounded-xl p-8"
          >
            <p className="text-gray-300 text-lg leading-relaxed">
              VendChain is building the future of automated retail by leveraging blockchain technology and the Algorand
              network. We believe that commerce should be decentralized, transparent, and accessible to everyone. Our
              vending machines represent a new paradigm where customers can purchase goods instantly, securely, and
              without intermediaries.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Core Values */}
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
            <h2 className="text-4xl font-bold text-white">Our Core Values</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Innovation",
                description: "Pushing the boundaries of what's possible in retail technology",
              },
              {
                icon: Shield,
                title: "Security",
                description: "Protecting user data and transactions with military-grade encryption",
              },
              {
                icon: Globe,
                title: "Accessibility",
                description: "Making blockchain commerce available to everyone, everywhere",
              },
              {
                icon: Users,
                title: "Community",
                description: "Building a thriving ecosystem of users, merchants, and developers",
              },
            ].map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-6 rounded-lg bg-slate-900/50 border border-orange-500/20 hover:border-orange-500/50 transition-colors"
              >
                <div className="p-3 rounded-full bg-orange-500/10 mb-4">
                  <value.icon className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">{value.title}</h3>
                <p className="mt-2 text-gray-400 text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="relative w-full overflow-hidden py-24 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black z-0" />

        <div className="container relative z-10 px-4 mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white">Built on Algorand</h2>
            <p className="mt-4 text-gray-400">Leveraging the world's most efficient blockchain</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                title: "Lightning Fast",
                description: "Transactions complete in seconds with Algorand's consensus mechanism",
              },
              {
                title: "Carbon Neutral",
                description: "Algorand is the world's first carbon-negative blockchain",
              },
              {
                title: "Scalable",
                description: "Handle millions of transactions without compromising security",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-orange-500/20"
              >
                <h3 className="text-lg font-semibold text-orange-500 mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative w-full overflow-hidden py-24 bg-black">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-600/5 to-transparent z-0" />

        <div className="container relative z-10 px-4 mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Join the Revolution?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Start using VendChain today and experience the future of decentralized commerce.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                <Link href="/pay">Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent"
              >
                <Link href="/help">Contact Us</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
