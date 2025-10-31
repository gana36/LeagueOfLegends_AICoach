import { motion } from 'framer-motion'

export default function StatsCard({ title, value, subtitle }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700"
    >
      <p className="text-sm text-gray-400 mb-2">{title}</p>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </motion.div>
  )
}
