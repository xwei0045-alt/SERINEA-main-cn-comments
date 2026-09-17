import { destination, haversineKm } from "@/lib/geo";
import type { Journey, LatLng, Poi } from "@/lib/types";

const DEFAULT_WALKING_SPEED_KM_PER_HOUR = 4.8;

// 按 4.8 km/h 的直线距离估算步行时间；这是列表筛选依据，不是地图上的街道路由线。
export class EstimatedJourneyCalculator {
  // 保存步行速度，允许测试或未来配置注入不同速度。
  constructor(
    private readonly walkingSpeedKmPerHour = DEFAULT_WALKING_SPEED_KM_PER_HOUR
  ) {}

  // 用 Haversine 距离除以步行速度，换算成单程分钟数。
  oneWayMinutes(origin: LatLng, destinationPoint: LatLng): number {
    const distanceKm = haversineKm(origin, destinationPoint);
    return (distanceKm / this.walkingSpeedKmPerHour) * 60;
  }

  // 为一个 POI 生成去程、回程、距离文本和总时间的统一行程对象。
  createWalkingJourney(origin: LatLng, poi: Poi): Journey {
    const distanceKm = haversineKm(origin, poi);
    const minutes = Math.max(0.1, (distanceKm / this.walkingSpeedKmPerHour) * 60);
    const roundedMinutes = this.round(minutes);
    const roundedTrip = this.round(roundedMinutes * 2);
    const distanceText = formatWalkDistance(distanceKm);

    return {
      outbound: [
        {
          mode: "walk",
          minutes: roundedMinutes,
          text: `About ${distanceText} on foot`
        }
      ],
      inbound: [
        {
          mode: "walk",
          minutes: roundedMinutes,
          text: "Same walk back"
        }
      ],
      outboundMinutes: roundedMinutes,
      inboundMinutes: roundedMinutes,
      roundTripMinutes: roundedTrip
    };
  }

  // 按时间窗口生成 48 个圆周点，形成单程可达范围的近似边界。
  createReachHull(origin: LatLng, windowMinutes: number): LatLng[] {
    const radiusKm = (windowMinutes / 60) * this.walkingSpeedKmPerHour;
    return Array.from({ length: 48 }, (_, index) =>
      destination(origin, index * (360 / 48), radiusKm)
    );
  }

  // 保留旧方法名以兼容调用方，内部直接复用新的单程范围计算。
  createRoundTripHull(origin: LatLng, windowMinutes: number): LatLng[] {
    return this.createReachHull(origin, windowMinutes);
  }

  // 将最大单程分钟数换算为允许的最远直线距离。
  maximumOutboundDistanceKm(windowMinutes: number): number {
    return (windowMinutes / 60) * this.walkingSpeedKmPerHour;
  }

  // 将分钟数保留一位小数，避免界面出现过长的小数。
  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }
}

// 将公里距离格式化为米或公里文本，供行程卡片展示。
function formatWalkDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
