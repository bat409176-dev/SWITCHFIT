import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, ChevronRight, Sparkles } from 'lucide-react';

type Props = {
  onEnter: () => void;
};

export default function WelcomeScreen({ onEnter }: Props) {
  const [showButton, setShowButton] = useState(false);
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setParticles(Array.from({ length: 30 }, (_, i) => i));
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#14141d] to-[#0a0a0f]">
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gold-gradient opacity-20"
            style={{
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100 - Math.random() * 200],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* Rotating ring backdrop */}
      <motion.div
        className="absolute rounded-full border-2 border-[#c9a84c]/10"
        style={{ width: 500, height: 500 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute rounded-full border border-[#c9a84c]/15"
        style={{ width: 700, height: 700 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute rounded-full border-2 border-dashed border-[#c9a84c]/8"
        style={{ width: 350, height: 350 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center perspective-1000">
        {/* 3D animated logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotateY: -180 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="transform-style-3d"
        >
          <motion.div
            animate={{
              rotateY: [0, 10, 0, -10, 0],
              rotateX: [0, 5, 0, -5, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gold-gradient rounded-3xl blur-2xl opacity-40 animate-pulse-gold" />
            <div className="relative w-24 h-24 rounded-3xl bg-gold-gradient flex items-center justify-center shadow-gold-glow">
              <Dumbbell className="w-12 h-12 text-[#0a0a0f]" strokeWidth={2.5} />
            </div>
          </motion.div>
        </motion.div>

        {/* Welcome text */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="font-display text-5xl md:text-7xl mt-8 text-center tracking-wider"
        >
          <span className="text-gradient-gold">SWITCH</span>
          <span className="text-white">FIT</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex items-center gap-2 mt-3"
        >
          <Sparkles className="w-4 h-4 text-[#c9a84c]" />
          <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-[#c9a84c]/80">
            Train Like Royalty
          </span>
          <Sparkles className="w-4 h-4 text-[#c9a84c]" />
        </motion.div>

        {/* Enter button */}
        <AnimatePresence>
          {showButton && (
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              onClick={onEnter}
              className="group relative mt-12 px-10 py-4 rounded-full overflow-hidden"
            >
              <div className="absolute inset-0 bg-gold-gradient transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-gold-gradient blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
              <span className="relative flex items-center gap-2 text-[#0a0a0f] font-semibold tracking-wide">
                Enter Royal Training
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute -bottom-20 text-gray-500 text-sm tracking-wide"
        >
          AI-Powered Motion Tracking &middot; 25+ Exercises &middot; Real-Time Coaching
        </motion.p>
      </div>
    </div>
  );
}
