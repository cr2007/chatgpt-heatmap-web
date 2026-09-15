import { useEffect, useState } from "react";

export type DevicePosture = "continuous" | "folded";

export function useDevicePosture(): DevicePosture {
  const [posture, setPosture] = useState<DevicePosture>("continuous");
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dp = (navigator as any).devicePosture;
    if (!dp) return;
    setPosture(dp.type as DevicePosture);
    const handler = () => setPosture(dp.type as DevicePosture);
    dp.addEventListener("change", handler);
    return () => dp.removeEventListener("change", handler);
  }, []);
  return posture;
}
