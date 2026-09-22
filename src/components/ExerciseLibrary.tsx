import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Flame, ArrowLeft, Search, Filter, X } from 'lucide-react';
import {
  exercises,
  categoryLabels,
  categoryColors,
  type Exercise,
  type ExerciseCategory,
} from '@/data/exercises';

type Props = {
  onBack: () => void;
  onSelectExercise: (exercise: Exercise) => void;
};

const categories: (ExerciseCategory | 'all')[] = ['all', 'strength', 'cardio', 'flexibility', 'core'];

const difficultyColors: Record<string, string> = {
  Beginner: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Intermediate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Advanced: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export default function ExerciseLibrary({ onBack, onSelectExercise }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(search.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || ex.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  const handleStart = (exercise: Exercise) => {
    setSelectedExercise(null);
    onSelectExercise(exercise);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#c9a84c]/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-[#c9a84c] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-[#0a0a0f]" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg tracking-wider">
              <span className="text-gradient-gold">SWITCH</span>
              <span className="text-white">FIT</span>
            </span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-4xl md:text-5xl text-white mb-2">
            Exercise <span className="text-gradient-gold">Library</span>
          </h1>
          <p className="text-gray-400">
            {exercises.length} exercises with AI motion tracking &middot; Choose your weapon
          </p>
        </motion.div>

        {/* Search + filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c9a84c]/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises or muscle groups..."
              className="w-full bg-[#14141d] border border-[#c9a84c]/15 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:border-[#c9a84c]/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-[#c9a84c]/50 flex-shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-gold-gradient text-[#0a0a0f]'
                    : 'bg-[#14141d] text-gray-400 border border-[#c9a84c]/15 hover:border-[#c9a84c]/40'
                }`}
              >
                {cat === 'all' ? 'All' : categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No exercises found. Try a different search.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                onClick={() => setSelectedExercise(ex)}
                className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/15 bg-[#14141d] p-5 hover:border-[#c9a84c]/50 transition-all cursor-pointer"
              >
                <div className="absolute -right-10 -top-10 w-28 h-28 rounded-full bg-gold-gradient opacity-5 group-hover:opacity-20 blur-2xl transition-opacity" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium border ${difficultyColors[ex.difficulty]}`}>
                      {ex.difficulty}
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full bg-${categoryColors[ex.category]}-500/10 text-${categoryColors[ex.category]}-400`}
                    >
                      {categoryLabels[ex.category]}
                    </span>
                  </div>

                  <h3 className="font-display text-lg text-white mb-1">{ex.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{ex.muscleGroup}</p>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4">{ex.description}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      {ex.caloriesPerRep} kcal/rep
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Exercise detail modal */}
      <AnimatePresence>
        {selectedExercise && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedExercise(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg border-gradient-gold rounded-3xl p-8 bg-[#14141d] shadow-gold-glow"
            >
              <button
                onClick={() => setSelectedExercise(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#0a0a0f] border border-[#c9a84c]/20 flex items-center justify-center text-gray-400 hover:text-[#c9a84c] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start justify-between mb-4 pr-10">
                <h2 className="font-display text-3xl text-white">{selectedExercise.name}</h2>
              </div>

              <div className="flex flex-wrap gap-2 mb-5">
                <span className={`text-xs px-3 py-1 rounded-full border ${difficultyColors[selectedExercise.difficulty]}`}>
                  {selectedExercise.difficulty}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-[#c9a84c]/10 text-[#c9a84c]">
                  {categoryLabels[selectedExercise.category]}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400">
                  {selectedExercise.muscleGroup}
                </span>
              </div>

              <p className="text-gray-300 mb-4">{selectedExercise.description}</p>

              <div className="bg-[#0a0a0f] rounded-xl p-4 mb-6 border border-[#c9a84c]/10">
                <p className="text-sm text-gray-400">
                  <span className="text-[#c9a84c] font-medium">Pro Tip: </span>
                  {selectedExercise.tip}
                </p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Flame className="w-4 h-4 text-rose-400" />
                  {selectedExercise.caloriesPerRep} calories per rep
                </div>
                <div className="text-sm text-gray-400">
                  <span className="text-white font-medium">{selectedExercise.caloriesPerRep * 15}</span>
                  <span className="ml-1">kcal in 15 reps</span>
                </div>
              </div>

              <button
                onClick={() => handleStart(selectedExercise)}
                className="group w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gold-gradient text-[#0a0a0f] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Start with Camera Tracking
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
