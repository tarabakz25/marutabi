export type RouteLegSummary = {
  distance: number; // meters
  timeMinutes: number; // minutes
  fare: number; // yen
  transfers: number; // count
};

export type RouteEvaluationInput = {
  legs: RouteLegSummary[];
  totalDistance: number; // meters
  totalTimeMinutes: number; // minutes
  totalFare: number; // yen
  transferCount: number; // count
  preferences?: {
    weightTime?: number; // default 0.4
    weightFare?: number; // default 0.3
    weightTransfers?: number; // default 0.2
    weightDistance?: number; // default 0.1
  };
};

export type RouteEvaluation = {
  score: number; // 0-100
  breakdown: {
    timeScore: number;
    fareScore: number;
    transferScore: number;
    distanceScore: number;
  };
};

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }

// Simple normalization baselines. These can be tuned or learned later.
const BASELINES = {
  timeMinutes: 180, // 3h
  fare: 8000,       // 8,000 JPY
  distance: 300000, // 300 km
  transfers: 5,
};

// Convert raw values into desirability (1 best, 0 worst) using exponential falloff
function desirability(value: number, baseline: number): number {
  if (baseline <= 0) return 0;
  const ratio = value / baseline;
  // Higher is worse; map 0 -> 1, baseline -> ~0.37, 2x -> ~0.14
  const desirability = Math.exp(-ratio);
  return clamp01(desirability);
}

export function computeCompositeScore(input: RouteEvaluationInput): RouteEvaluation {
  const weights = {
    time: input.preferences?.weightTime ?? 0.4,
    fare: input.preferences?.weightFare ?? 0.3,
    transfers: input.preferences?.weightTransfers ?? 0.2,
    distance: input.preferences?.weightDistance ?? 0.1,
  };
  const sumW = weights.time + weights.fare + weights.transfers + weights.distance;
  const normW = {
    time: weights.time / sumW,
    fare: weights.fare / sumW,
    transfers: weights.transfers / sumW,
    distance: weights.distance / sumW,
  };

  const timeScore = desirability(input.totalTimeMinutes, BASELINES.timeMinutes);
  const fareScore = desirability(input.totalFare, BASELINES.fare);
  const transferScore = desirability(input.transferCount, BASELINES.transfers);
  const distanceScore = desirability(input.totalDistance, BASELINES.distance);

  const score01 = (
    timeScore * normW.time +
    fareScore * normW.fare +
    transferScore * normW.transfers +
    distanceScore * normW.distance
  );

  return {
    score: Math.round(score01 * 100),
    breakdown: {
      timeScore: Math.round(timeScore * 100),
      fareScore: Math.round(fareScore * 100),
      transferScore: Math.round(transferScore * 100),
      distanceScore: Math.round(distanceScore * 100),
    },
  };
}

export type LLMRouteEvaluation = {
  score: number; // 0-100
  reasons: string[];
  risks?: string[];
  comment?: string; // overall comment in locale language
  errorMessage?: string; // present when LLM call failed/partial
  schedule?: {
    time: string; // HH:MM 24h
    title: string;
    description?: string;
  }[];
};

export type LLMRouteEvalInput = RouteEvaluationInput & {
  locale?: 'ja' | 'en';
  style?: 'concise' | 'detailed';
  userNotes?: string;
};


