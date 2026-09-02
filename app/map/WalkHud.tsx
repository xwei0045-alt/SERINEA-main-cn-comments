import { formatRemainingClock, formatWalkDistance } from "@/lib/walkCopy";

type Props = {
  placeName: string;
  legLabel: string;
  remainingSeconds: number;
  remainingMeters: number;
  instruction: string;
  arrived: boolean;
  canWalkBack: boolean;
  overBudget: boolean;
  onEnd: () => void;
  onWalkBack: () => void;
};

export function WalkHud({
  placeName,
  legLabel,
  remainingSeconds,
  remainingMeters,
  instruction,
  arrived,
  canWalkBack,
  overBudget,
  onEnd,
  onWalkBack
}: Props) {
  const clock = formatRemainingClock(remainingSeconds);

  return (
    <div className="walk-hud" role="status" aria-live="polite">
      <p className="walk-hud-time">
        {arrived ? "0:00" : clock}
        <span>{arrived ? "arrived" : "remaining"}</span>
      </p>
      <p className="walk-hud-step">{arrived ? `You’ve reached ${placeName}` : instruction}</p>
      <p className="walk-hud-meta">
        {legLabel}
        {arrived ? "" : ` · ${formatWalkDistance(remainingMeters)} left`}
        {` · ${placeName}`}
      </p>
      {overBudget && !arrived && (
        <p className="walk-hud-warn">Along streets this round trip may take more than 15 minutes.</p>
      )}
      <div className="walk-hud-actions">
        {arrived && canWalkBack && (
          <button type="button" className="walk-primary" onClick={onWalkBack}>
            Walk back
          </button>
        )}
        <button type="button" className="walk-secondary" onClick={onEnd}>
          End walk
        </button>
      </div>
    </div>
  );
}
