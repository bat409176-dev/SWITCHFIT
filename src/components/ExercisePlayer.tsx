import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  Flame,
  Camera,
  CameraOff,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Activity,
  Zap,
} from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import type { Exercise } from '@/data/exercises';
import {
  extractPose,
  createRepCounter,
  updateRepCount,
  calculateCalories,
  getFormFeedback,
  angleBetween,
  type Pose,
  type RepCounter,
} from '@/lib/poseDetection';
import { supabase } from '@/lib/supabase';

type Props = {
  exercise: Exercise;
  onExit: () => void;
};

const SKELETON_PAIRS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  ['nose', 'left_shoulder'],
  ['nose', 'right_shoulder'],
];

const JOINT_NAMES: Record<string, string> = {
  left_shoulder: 'L Shoulder',
  right_shoulder: 'R Shoulder',
  left_elbow: 'L Elbow',
  right_elbow: 'R Elbow',
  left_wrist: 'L Wrist',
  right_wrist: 'R Wrist',
  left_hip: 'L Hip',
  right_hip: 'R Hip',
  left_knee: 'L Knee',
  right_knee: 'R Knee',
  left_ankle: 'L Ankle',
  right_ankle: 'R Ankle',
};

export default function ExercisePlayer({ exercise, onExit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const rafRef = useRef<number>(0);
  const counterRef = useRef<RepCounter>(createRepCounter());
  const startTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const fpsRef = useRef<{ frames: number; lastTime: number }>({ frames: 0, lastTime: 0 });

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reps, setReps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [repState, setRepState] = useState<'up' | 'down'>('up');
  const [currentAngle, setCurrentAngle] = useState(180);
  const [fps, setFps] = useState(0);
  const [personDetected, setPersonDetected] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [jointAngles, setJointAngles] = useState<{ label: string; angle: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  useEffect(() => {
    if (!tracking) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [tracking]);

  const drawSkeleton = useCallback(
    (pose: any, ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const kpMap = new Map<string, any>();
      pose.keypoints.forEach((kp: any) => kpMap.set(kp.name, kp));

      // Connections with glow
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#c9a84c';
      ctx.shadowColor = '#c9a84c';
      ctx.shadowBlur = 12;
      for (const [a, b] of SKELETON_PAIRS) {
        const pa = kpMap.get(a);
        const pb = kpMap.get(b);
        if (pa && pb && pa.score > 0.3 && pb.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Keypoints with pulsing rings
      pose.keypoints.forEach((kp: any) => {
        if (kp.score > 0.3) {
          // Outer ring
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 10, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(201, 168, 76, 0.2)';
          ctx.fill();

          // Inner dot
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#e6d48f';
          ctx.fill();

          // Center
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#0a0a0f';
          ctx.fill();
        }
      });

      // Draw joint labels for key joints
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = 'rgba(230, 212, 143, 0.7)';
      const labeledJoints = [
        'left_knee',
        'right_knee',
        'left_elbow',
        'right_elbow',
        'left_hip',
        'right_hip',
      ];
      labeledJoints.forEach((name) => {
        const kp = kpMap.get(name);
        if (kp && kp.score > 0.3) {
          const label = JOINT_NAMES[name] || name;
          ctx.fillText(label, kp.x + 12, kp.y - 8);
        }
      });
    },
    []
  );

  const computeJointAngles = useCallback((pose: Pose): { label: string; angle: number }[] => {
    const joints: { label: string; angle: number }[] = [];

    if (pose.leftHip && pose.leftKnee && pose.leftAnkle)
      joints.push({ label: 'Left Knee', angle: Math.round(angleBetween(pose.leftHip, pose.leftKnee, pose.leftAnkle)) });
    if (pose.rightHip && pose.rightKnee && pose.rightAnkle)
      joints.push({ label: 'Right Knee', angle: Math.round(angleBetween(pose.rightHip, pose.rightKnee, pose.rightAnkle)) });
    if (pose.leftShoulder && pose.leftElbow && pose.leftWrist)
      joints.push({ label: 'Left Elbow', angle: Math.round(angleBetween(pose.leftShoulder, pose.leftElbow, pose.leftWrist)) });
    if (pose.rightShoulder && pose.rightElbow && pose.rightWrist)
      joints.push({ label: 'Right Elbow', angle: Math.round(angleBetween(pose.rightShoulder, pose.rightElbow, pose.rightWrist)) });
    if (pose.leftElbow && pose.leftShoulder && pose.leftHip)
      joints.push({ label: 'Left Shoulder', angle: Math.round(angleBetween(pose.leftElbow, pose.leftShoulder, pose.leftHip)) });
    if (pose.rightElbow && pose.rightShoulder && pose.rightHip)
      joints.push({ label: 'Right Shoulder', angle: Math.round(angleBetween(pose.rightElbow, pose.rightShoulder, pose.rightHip)) });

    return joints;
  }, []);

  const detectLoop = useCallback(async () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    try {
      const poses = await detectorRef.current.estimatePoses(video, { flipHorizontal: true });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (poses.length > 0 && poses[0].keypoints) {
        const pose = poses[0];
        const visibleKps = pose.keypoints.filter((kp: any) => kp.score > 0.3);
        setPersonDetected(visibleKps.length >= 5);

        // Flip keypoints for mirrored display
        const flippedPose = {
          ...pose,
          keypoints: pose.keypoints.map((kp: any) => ({
            ...kp,
            x: canvas.width - kp.x,
          })),
        };
        drawSkeleton(flippedPose, ctx, canvas.width, canvas.height);

        const extracted = extractPose(flippedPose.keypoints);

        // Rep counting
        const newCounter = updateRepCount(counterRef.current, extracted, exercise.id);
        counterRef.current = newCounter;
        setReps(newCounter.reps);
        setRepState(newCounter.state);
        setCurrentAngle(Math.round(newCounter.trackedAngle));
        setCalories(calculateCalories(exercise, newCounter.reps));

        // Form feedback
        setFormFeedback(getFormFeedback(newCounter.trackedAngle, exercise.id));

        // Joint angles for the panel
        setJointAngles(computeJointAngles(extracted));
      } else {
        setPersonDetected(false);
      }

      ctx.restore();

      // FPS tracking
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.lastTime)));
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }
    } catch (err) {
      console.error('Detection error:', err);
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [drawSkeleton, computeJointAngles, exercise.id]);

  const startCamera = useCallback(async () => {
    setError(null);
    setModelLoading(true);
    fpsRef.current = { frames: 0, lastTime: performance.now() };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);

      await tf.setBackend('webgl');
      await tf.ready();

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        }
      );
      detectorRef.current = detector;

      setModelLoading(false);
      setTracking(true);
      startTimeRef.current = Date.now();
      counterRef.current = createRepCounter();
      rafRef.current = requestAnimationFrame(detectLoop);
    } catch (err: any) {
      setModelLoading(false);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError(err.message || 'Failed to start camera. Please try again.');
      }
    }
  }, [detectLoop]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTracking(false);
    setCameraReady(false);
    setPersonDetected(false);
  }, []);

  const saveSession = useCallback(async () => {
    if (reps === 0 || sessionSaved) return;
    setSaving(true);

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const { error } = await supabase.from('workout_sessions').insert({
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      reps,
      calories: calculateCalories(exercise, reps),
      duration_seconds: duration,
    });

    setSaving(false);
    if (error) {
      setError('Failed to save your session. Please try again.');
    } else {
      setSessionSaved(true);
    }
  }, [reps, exercise, sessionSaved]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[#c9a84c]/15">
        <button
          onClick={() => {
            stopCamera();
            onExit();
          }}
          className="flex items-center gap-2 text-gray-400 hover:text-rose-400 transition-colors"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-[#0a0a0f]" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg text-white">{exercise.name}</span>
        </div>

        <div className="w-16" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Camera / canvas area */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border border-[#c9a84c]/20 bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

            {/* Overlays */}
            {!cameraReady && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0f]">
                <CameraOff className="w-16 h-16 text-[#c9a84c]/30" />
                <p className="text-gray-400 text-center max-w-xs px-4">
                  {modelLoading
                    ? 'Loading AI motion tracking model...'
                    : 'Click below to start your camera for real-time body tracking.'}
                </p>
                {modelLoading && (
                  <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
                )}
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0f] p-6">
                <AlertCircle className="w-12 h-12 text-rose-400" />
                <p className="text-rose-300 text-center max-w-sm">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 rounded-xl bg-gold-gradient text-[#0a0a0f] font-semibold"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* No person detected warning */}
            {tracking && !personDetected && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-[#0a0a0f]/85 backdrop-blur-md rounded-2xl px-6 py-5 border border-amber-500/30">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-amber-300 text-sm text-center">
                  Step into frame so the AI can see your full body
                </p>
              </div>
            )}

            {/* Live stats overlay */}
            {tracking && (
              <>
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl px-4 py-2 border border-[#c9a84c]/20">
                    <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider">Reps</p>
                    <p className="text-3xl font-bold text-white tabular-nums">{reps}</p>
                  </div>
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl px-4 py-2 border border-[#c9a84c]/20">
                    <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider">State</p>
                    <p
                      className={`text-sm font-semibold ${
                        repState === 'down' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {repState === 'down' ? 'DOWN' : 'UP'}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl px-4 py-2 border border-[#c9a84c]/20">
                    <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider">Joint Angle</p>
                    <p className="text-2xl font-bold text-[#e6d48f] tabular-nums">
                      {currentAngle}°
                    </p>
                  </div>
                </div>

                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl px-4 py-2 border border-[#c9a84c]/20">
                    <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider">Calories</p>
                    <p className="text-2xl font-bold text-rose-400 tabular-nums">
                      {calories.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl px-4 py-2 border border-[#c9a84c]/20">
                    <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider">Time</p>
                    <p className="text-2xl font-bold text-sky-400 tabular-nums">
                      {formatTime(elapsed)}
                    </p>
                  </div>
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md rounded-xl px-4 py-2 border border-[#c9a84c]/20 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs text-[#c9a84c]/70 uppercase tracking-wider">FPS</p>
                      <p className="text-sm font-bold text-emerald-400 tabular-nums">{fps}</p>
                    </div>
                  </div>
                </div>

                {/* Form feedback */}
                <AnimatePresence>
                  {formFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      key={formFeedback}
                      className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[#0a0a0f]/85 backdrop-blur-md rounded-full px-5 py-2.5 border border-[#c9a84c]/30"
                    >
                      <p className="text-sm text-[#e6d48f] flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        {formFeedback}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live tracking indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0a0a0f]/80 backdrop-blur-md rounded-full px-4 py-2 border border-[#c9a84c]/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-gray-300">
                    Real-Time Body Tracking &middot; {fps} FPS
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-[#c9a84c]/15 p-5 flex flex-col gap-4 overflow-y-auto max-h-[45vh] lg:max-h-none">
          {/* Exercise info */}
          <div className="border-gradient-gold rounded-2xl p-4 bg-[#14141d]">
            <h3 className="font-display text-xl text-white mb-2">{exercise.name}</h3>
            <p className="text-sm text-gray-400 mb-3">{exercise.description}</p>
            <div className="bg-[#0a0a0f] rounded-lg p-3 border border-[#c9a84c]/10">
              <p className="text-xs text-gray-400">
                <span className="text-[#c9a84c] font-medium">Tip: </span>
                {exercise.tip}
              </p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#14141d] rounded-xl p-3 border border-[#c9a84c]/10 text-center">
              <Dumbbell className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white tabular-nums">{reps}</p>
              <p className="text-xs text-gray-500">Reps</p>
            </div>
            <div className="bg-[#14141d] rounded-xl p-3 border border-[#c9a84c]/10 text-center">
              <Flame className="w-5 h-5 text-rose-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white tabular-nums">
                {calories.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Kcal</p>
            </div>
            <div className="bg-[#14141d] rounded-xl p-3 border border-[#c9a84c]/10 text-center">
              <p className="text-2xl font-bold text-sky-400 tabular-nums mt-1">
                {formatTime(elapsed)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Time</p>
            </div>
          </div>

          {/* Live joint angle tracker */}
          {tracking && jointAngles.length > 0 && (
            <div className="bg-[#14141d] rounded-xl p-4 border border-[#c9a84c]/10">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[#c9a84c]" />
                <p className="text-sm font-medium text-white">Live Joint Angles</p>
              </div>
              <div className="space-y-2.5">
                {jointAngles.map((joint) => {
                  const pct = Math.min(100, (joint.angle / 180) * 100);
                  const color =
                    joint.angle < 90
                      ? 'bg-rose-400'
                      : joint.angle < 140
                      ? 'bg-amber-400'
                      : 'bg-emerald-400';
                  return (
                    <div key={joint.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">{joint.label}</span>
                        <span className="text-xs font-medium text-white tabular-nums">
                          {joint.angle}°
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0a0a0f] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${color}`}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.15 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col gap-3 mt-auto">
            {!cameraReady && !error && (
              <button
                onClick={startCamera}
                disabled={modelLoading}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gold-gradient text-[#0a0a0f] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {modelLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading AI Model...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Start Camera & Track
                  </>
                )}
              </button>
            )}

            {tracking && (
              <button
                onClick={stopCamera}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#14141d] border border-rose-500/30 text-rose-400 font-medium hover:bg-rose-500/10 transition-all"
              >
                <CameraOff className="w-5 h-5" />
                Stop Camera
              </button>
            )}

            {tracking && reps > 0 && (
              <button
                onClick={saveSession}
                disabled={saving || sessionSaved}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gold-gradient text-[#0a0a0f] font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : sessionSaved ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Session Saved!
                  </>
                ) : (
                  'Save Session'
                )}
              </button>
            )}

            {sessionSaved && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onExit}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#14141d] border border-[#c9a84c]/20 text-[#c9a84c] font-medium hover:border-[#c9a84c]/50 transition-all"
              >
                Back to Library
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Success overlay */}
      <AnimatePresence>
        {sessionSaved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="bg-gold-gradient rounded-full p-6 shadow-gold-glow"
            >
              <CheckCircle2 className="w-12 h-12 text-[#0a0a0f]" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
