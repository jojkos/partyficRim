import type { Role } from "@partyficrim/shared";
export const STATIONS: Role[] = ["defense", "weapons", "repair"];
export const STATION_HELP: Record<Role, string> = {
  defense: "Steer left / right. Shield a quadrant.",
  repair: "Steer up / down. Repair a quadrant.",
  weapons: "Choose cores, a weapon, then a direction.",
};
