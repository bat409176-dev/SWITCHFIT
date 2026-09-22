import type { Exercise } from '@/data/exercises';

export type PosePoint = { x: number; y: number; score: number; name?: string };

export type Pose = {
  keypoints: PosePoint[];
  nose: PosePoint | null;
  leftShoulder: PosePoint | null;
  rightShoulder: PosePoint | null;
  leftElbow: PosePoint | null;
  rightElbow: PosePoint | null;
  leftWrist: PosePoint | null;
  rightWrist: PosePoint | null;
  leftHip: PosePoint | null;
  rightHip: PosePoint | null;
  leftKnee: PosePoint | null;
  rightKnee: PosePoint | null;
  leftAnkle: PosePoint | null;
  rightAnkle: PosePoint | null;
};

export type TrackedJoint = {
  label: string;
  angle: number;
  point: PosePoint;
};

export function extractPose(keypoints: any[]): Pose {
  const get = (name: string): PosePoint | null => {
    const kp = keypoints.find((k) => k.name === name);
    if (!kp || kp.score < 0.3) return null;
    return { x: kp.x, y: kp.y, score: kp.score, name: kp.name };
  };
  return {
    keypoints: keypoints.map((k) => ({ x: k.x, y: k.y, score: k.score, name: k.name })),
    nose: get('nose'),
    leftShoulder: get('left_shoulder'),
    rightShoulder: get('right_shoulder'),
    leftElbow: get('left_elbow'),
    rightElbow: get('right_elbow'),
    leftWrist: get('left_wrist'),
    rightWrist: get('right_wrist'),
    leftHip: get('left_hip'),
    rightHip: get('right_hip'),
    leftKnee: get('left_knee'),
    rightKnee: get('right_knee'),
    leftAnkle: get('left_ankle'),
    rightAnkle: get('right_ankle'),
  };
}

export function angleBetween(a: PosePoint, b: PosePoint, c: PosePoint): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  if (magAB === 0 || magCB === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export type RepState = 'up' | 'down';

export type RepCounter = {
  reps: number;
  state: RepState;
  lastAngle: number;
  trackedAngle: number;
};

export function createRepCounter(): RepCounter {
  return { reps: 0, state: 'up', lastAngle: 180, trackedAngle: 180 };
}

type CounterConfig = {
  downThreshold: number;
  upThreshold: number;
};

const configs: Record<string, CounterConfig> = {
  squat: { downThreshold: 100, upThreshold: 160 },
  lunge: { downThreshold: 100, upThreshold: 160 },
  'side-lunge': { downThreshold: 110, upThreshold: 165 },
  pushup: { downThreshold: 90, upThreshold: 160 },
  'arm-curl': { downThreshold: 50, upThreshold: 150 },
  'shoulder-press': { downThreshold: 90, upThreshold: 160 },
  'lateral-raise': { downThreshold: 30, upThreshold: 80 },
  'standing-row': { downThreshold: 50, upThreshold: 120 },
  'calf-raise': { downThreshold: 140, upThreshold: 170 },
  'glute-bridge': { downThreshold: 150, upThreshold: 175 },
  'wall-sit': { downThreshold: 95, upThreshold: 160 },
  situp: { downThreshold: 70, upThreshold: 140 },
  crunch: { downThreshold: 80, upThreshold: 140 },
  'leg-raise': { downThreshold: 70, upThreshold: 160 },
  'russian-twist': { downThreshold: 40, upThreshold: 120 },
  'high-knees': { downThreshold: 90, upThreshold: 150 },
  'mountain-climber': { downThreshold: 90, upThreshold: 160 },
  'jumping-jack': { downThreshold: 30, upThreshold: 100 },
  'skater': { downThreshold: 110, upThreshold: 165 },
  'star-jump': { downThreshold: 40, upThreshold: 100 },
  'toe-touch': { downThreshold: 100, upThreshold: 170 },
  'cobra': { downThreshold: 60, upThreshold: 140 },
  punches: { downThreshold: 80, upThreshold: 150 },
  burpee: { downThreshold: 100, upThreshold: 160 },
};

function computeAngle(pose: Pose, exerciseId: string): number {
  switch (exerciseId) {
    case 'squat':
    case 'wall-sit':
    case 'glute-bridge': {
      if (pose.leftHip && pose.leftKnee && pose.leftAnkle)
        return angleBetween(pose.leftHip, pose.leftKnee, pose.leftAnkle);
      if (pose.rightHip && pose.rightKnee && pose.rightAnkle)
        return angleBetween(pose.rightHip, pose.rightKnee, pose.rightAnkle);
      return 180;
    }
    case 'lunge':
    case 'side-lunge':
    case 'skater':
    case 'high-knees':
    case 'mountain-climber': {
      if (pose.rightHip && pose.rightKnee && pose.rightAnkle)
        return angleBetween(pose.rightHip, pose.rightKnee, pose.rightAnkle);
      if (pose.leftHip && pose.leftKnee && pose.leftAnkle)
        return angleBetween(pose.leftHip, pose.leftKnee, pose.leftAnkle);
      return 180;
    }
    case 'pushup':
    case 'burpee':
    case 'plank':
    case 'arm-curl':
    case 'punches': {
      if (pose.leftShoulder && pose.leftElbow && pose.leftWrist)
        return angleBetween(pose.leftShoulder, pose.leftElbow, pose.leftWrist);
      if (pose.rightShoulder && pose.rightElbow && pose.rightWrist)
        return angleBetween(pose.rightShoulder, pose.rightElbow, pose.rightWrist);
      return 180;
    }
    case 'shoulder-press':
    case 'lateral-raise':
    case 'star-jump':
    case 'jumping-jack':
    case 'standing-row': {
      if (pose.leftElbow && pose.leftShoulder && pose.leftHip)
        return angleBetween(pose.leftElbow, pose.leftShoulder, pose.leftHip);
      if (pose.rightElbow && pose.rightShoulder && pose.rightHip)
        return angleBetween(pose.rightElbow, pose.rightShoulder, pose.rightHip);
      return 180;
    }
    case 'calf-raise': {
      if (pose.leftKnee && pose.leftAnkle) {
        const footDown = { x: pose.leftAnkle.x, y: pose.leftAnkle.y + 50, score: 1 };
        return angleBetween(pose.leftKnee, pose.leftAnkle, footDown);
      }
      return 180;
    }
    case 'situp':
    case 'crunch': {
      if (pose.leftHip && pose.leftShoulder && pose.nose)
        return angleBetween(pose.leftHip, pose.leftShoulder, pose.nose);
      if (pose.rightHip && pose.rightShoulder && pose.nose)
        return angleBetween(pose.rightHip, pose.rightShoulder, pose.nose);
      return 180;
    }
    case 'leg-raise': {
      if (pose.leftHip && pose.leftKnee && pose.leftAnkle)
        return angleBetween(pose.leftHip, pose.leftKnee, pose.leftAnkle);
      return 180;
    }
    case 'russian-twist': {
      if (pose.leftShoulder && pose.nose && pose.rightShoulder) {
        const mid = {
          x: (pose.leftShoulder.x + pose.rightShoulder.x) / 2,
          y: (pose.leftShoulder.y + pose.rightShoulder.y) / 2,
          score: 1,
        };
        return angleBetween(pose.leftShoulder, mid, pose.nose);
      }
      return 180;
    }
    case 'toe-touch': {
      if (pose.leftHip && pose.leftShoulder && pose.leftWrist)
        return angleBetween(pose.leftHip, pose.leftShoulder, pose.leftWrist);
      return 180;
    }
    case 'cobra': {
      if (pose.leftHip && pose.leftShoulder && pose.leftElbow)
        return angleBetween(pose.leftHip, pose.leftShoulder, pose.leftElbow);
      return 180;
    }
    default:
      return 180;
  }
}

export function updateRepCount(
  counter: RepCounter,
  pose: Pose,
  exerciseId: string
): RepCounter {
  const cfg = configs[exerciseId];
  if (!cfg) return counter;

  const angle = computeAngle(pose, exerciseId);
  let { state, reps } = counter;

  if (state === 'up' && angle < cfg.downThreshold) {
    state = 'down';
  } else if (state === 'down' && angle > cfg.upThreshold) {
    state = 'up';
    reps += 1;
  }

  return { reps, state, lastAngle: angle, trackedAngle: angle };
}

export function calculateCalories(exercise: Exercise, reps: number): number {
  return exercise.caloriesPerRep * reps;
}

export function getFormFeedback(angle: number, exerciseId: string): string | null {
  const cfg = configs[exerciseId];
  if (!cfg) return null;
  const midRange = (cfg.downThreshold + cfg.upThreshold) / 2;
  if (angle > cfg.upThreshold + 10) return 'Go lower to complete the rep';
  if (angle < cfg.downThreshold) return 'Now push back up';
  if (angle < midRange + 15 && angle > midRange - 15) return 'Halfway there';
  return null;
}
