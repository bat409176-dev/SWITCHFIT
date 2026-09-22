import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Flame, Clock, TrendingUp, Grid3x3, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Exercise } from '@/data/exercises';
import { exercises } from '@/data/exercises';

type View = 'dashboard' | 'library' | 'exercise';

type Props = {
  onNavigate: (view: View) => void;
};

type Session = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  reps: number;
  calories: number;
  duration_seconds: number;
  completed_at: string;
};

export default function Dashboard({ onNavigate }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, exercise_id, exercise_name, reps, calories, duration_seconds, completed_at')
      .order('completed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to load sessions:', error.message);
      setSessions([]);
    } else {
      setSessions(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const totalReps = sessions.reduce((sum, s) => sum + s.reps, 0);
  const totalCalories = sessions.reduce((sum, s) => sum + Number(s.calories), 0);
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const todaySessions = sessions.filter((s) => {
    const today = new Date();
    const sessionDate = new Date(s.completed_at);
    return (
      sessionDate.getDate() === today.getDate() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getFullYear() === today.getFullYear()
    );
  });

  const featuredExercises = exercises.slice(0, 6);

  const stats = [
    {
      label: 'Total Reps',
      value: totalReps.toString(),
      icon: Dumbbell,
      color: 'text-amber-400',
    },
    {
      label: 'Calories Burned',
      value: totalCalories.toFixed(1),
      icon: Flame,
      color: 'text-rose-400',
    },
    {
      label: 'Active Minutes',
      value: Math.floor(totalDuration / 60).toString(),
      icon: Clock,
      color: 'text-sky-400',
    },
    {
      label: 'Sessions Today',
      value: todaySessions.length.toString(),
      icon: TrendingUp,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-[#c9a84c]/10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gold-gradient flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-[#0a0a0f]" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-wider">
              <span className="text-gradient-gold">SWITCH</span>
              <span className="text-white">FIT</span>
            </span>
          </div>

          <div className="w-9" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl mb-8 border border-[#c9a84c]/15"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#14141d] via-[#1e1e2e] to-[#0a0a0f]" />
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-gold-gradient opacity-10 blur-3xl" />

          <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p className="text-[#c9a84c]/80 text-sm uppercase tracking-[0.2em] mb-2">
                Welcome Back
              </p>
              <h1 className="font-display text-3xl md:text-4xl text-white">
                Ready for your <span className="text-gradient-gold">Royal Workout</span>?
              </h1>
              <p className="text-gray-400 mt-3 max-w-lg">
                Choose from 25+ exercises with real-time AI motion tracking via your camera.
                Count reps, burn calories, and track every move.
              </p>
            </div>

            <button
              onClick={() => onNavigate('library')}
              className="group flex items-center gap-2 px-8 py-4 rounded-full bg-gold-gradient text-[#0a0a0f] font-semibold hover:scale-105 active:scale-95 transition-transform shadow-gold-glow"
            >
              <Camera className="w-5 h-5" />
              Start Training
            </button>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border-gradient-gold rounded-2xl p-5 bg-[#14141d]"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick start + recent activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Featured exercises */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl text-white">Featured Exercises</h2>
              <button
                onClick={() => onNavigate('library')}
                className="text-sm text-[#c9a84c] hover:text-[#e6d48f] transition-colors flex items-center gap-1"
              >
                View All
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {featuredExercises.map((ex, i) => (
                <FeaturedExerciseCard key={ex.id} exercise={ex} index={i} />
              ))}
            </div>
          </div>

          {/* Recent sessions */}
          <div>
            <h2 className="font-display text-2xl text-white mb-4">Recent Activity</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {loading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#c9a84c]/15 rounded-2xl">
                  <Flame className="w-8 h-8 text-[#c9a84c]/30 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    No sessions yet. Start your first workout!
                  </p>
                </div>
              ) : (
                sessions.slice(0, 10).map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 bg-[#14141d] rounded-xl p-3 border border-[#c9a84c]/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gold-gradient flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-[#0a0a0f]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {s.exercise_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {s.reps} reps &middot; {Number(s.calories).toFixed(1)} kcal
                      </p>
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0">
                      {new Date(s.completed_at).toLocaleDateString()}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  const difficultyColor = {
    Beginner: 'text-emerald-400 bg-emerald-400/10',
    Intermediate: 'text-amber-400 bg-amber-400/10',
    Advanced: 'text-rose-400 bg-rose-400/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-2xl border border-[#c9a84c]/15 bg-[#14141d] p-5 hover:border-[#c9a84c]/40 transition-all cursor-pointer"
    >
      <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-gold-gradient opacity-5 group-hover:opacity-15 blur-2xl transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-lg text-white">{exercise.name}</h3>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              difficultyColor[exercise.difficulty]
            }`}
          >
            {exercise.difficulty}
          </span>
        </div>
        <p className="text-sm text-gray-400 line-clamp-2 mb-4">{exercise.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            {exercise.caloriesPerRep} kcal/rep
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
            {exercise.muscleGroup}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
