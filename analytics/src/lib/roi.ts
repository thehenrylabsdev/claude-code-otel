import { getRoiAssumptions } from "./config";

export type RoiResult = {
  sessions: number;
  costUsd: number;
  estimatedHoursSaved: number;
  estimatedValueUsd: number;
  roiMultiple: number | null;
  assumptions: {
    avgHoursSavedPerSession: number;
    hourlyEngineerCostUsd: number;
  };
};

export function computeRoi(sessions: number, costUsd: number): RoiResult {
  const assumptions = getRoiAssumptions();
  const estimatedHoursSaved = sessions * assumptions.avgHoursSavedPerSession;
  const estimatedValueUsd =
    estimatedHoursSaved * assumptions.hourlyEngineerCostUsd;

  return {
    sessions,
    costUsd,
    estimatedHoursSaved,
    estimatedValueUsd,
    roiMultiple:
      costUsd > 0.000001
        ? estimatedValueUsd / costUsd
        : estimatedValueUsd > 0
          ? Infinity
          : null,
    assumptions,
  };
}
