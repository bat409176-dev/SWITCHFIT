import { useState, useEffect } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import Dashboard from '@/components/Dashboard';
import ExerciseLibrary from '@/components/ExerciseLibrary';
import ExercisePlayer from '@/components/ExercisePlayer';
import type { Exercise } from '@/data/exercises';

type AppView = 'dashboard' | 'library';

function App() {
  const [showedWelcome, setShowedWelcome] = useState(false);
  const [view, setView] = useState<AppView>('dashboard');
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    if (showedWelcome) {
      window.scrollTo(0, 0);
    }
  }, [showedWelcome, view]);

  if (!showedWelcome) {
    return <WelcomeScreen onEnter={() => setShowedWelcome(true)} />;
  }

  if (activeExercise) {
    return (
      <ExercisePlayer
        exercise={activeExercise}
        onExit={() => {
          setActiveExercise(null);
          setView('library');
        }}
      />
    );
  }

  if (view === 'library') {
    return (
      <ExerciseLibrary
        onBack={() => setView('dashboard')}
        onSelectExercise={(ex) => setActiveExercise(ex)}
      />
    );
  }

  return (
    <Dashboard
      onNavigate={(v) => {
        if (v === 'library') setView('library');
      }}
    />
  );
}

export default App;
