/** Plain walking directions from OSRM maneuver codes. */

const TURN: Record<string, string> = {
  left: "Turn left",
  right: "Turn right",
  "slight left": "Bear left",
  "slight right": "Bear right",
  "sharp left": "Turn sharp left",
  "sharp right": "Turn sharp right",
  straight: "Continue straight",
  uturn: "Make a U-turn"
};

function onto(name: string): string {
  const street = name.trim();
  return street ? ` onto ${street}` : "";
}

export function describeWalkStep(input: {
  type: string;
  modifier?: string;
  name?: string;
}): string {
  const name = input.name?.trim() ?? "";
  const modifier = input.modifier?.trim().toLowerCase() ?? "";
  const turn = TURN[modifier] ?? (modifier ? `Turn ${modifier}` : "Continue");

  switch (input.type) {
    case "depart":
      return name ? `Start walking along ${name}` : "Start walking";
    case "arrive":
      return "You have arrived";
    case "new name":
    case "continue":
      return name ? `Continue on ${name}` : "Continue straight";
    case "turn":
    case "end of road":
    case "fork":
    case "merge":
    case "ramp":
      return `${turn}${onto(name)}`;
    case "roundabout":
    case "rotary":
      return name ? `At the roundabout, take the exit onto ${name}` : "At the roundabout, take the exit";
    case "notification":
      return name ? `Continue on ${name}` : "Continue";
    default:
      return name ? `${turn}${onto(name)}` : turn;
  }
}

export function formatWalkDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRemainingClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function walkingSecondsFromMeters(meters: number, kmPerHour = 4.8): number {
  if (meters <= 0) return 0;
  return (meters / 1000 / kmPerHour) * 3600;
}
