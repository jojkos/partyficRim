import { z } from "zod";
const roomCode = z.string().regex(/^[A-Z]{4}$/);
const index = z.number().int().min(0).max(3);
const kind = z.enum(["melee", "rotary", "laser", "bomb"]);
export const packetSchemas: Record<string, z.ZodType> = {
  "display:join_room": z.object({
    roomCode,
    hostToken: z.string().max(128).optional(),
  }),
  "phone:join": z.object({
    roomCode,
    sessionId: z.string().max(128).optional(),
  }),
  "phone:claim_role": z.object({
    role: z.enum(["defense", "repair", "weapons"]).nullable(),
  }),
  "phone:input": z.object({ dx: z.number().finite(), dy: z.number().finite() }),
  "phone:select": z.object({ index, on: z.boolean() }),
  "phone:quadrant": z.object({ index }),
  "phone:repair": z.object({ quadrant: index }),
  "phone:select_attack": z.object({ kind: kind.nullable() }),
  "phone:fire": z.object({ kind }),
};
export const requiredAckEvents = new Set([
  "display:create_room",
  "display:end_room",
  "display:join_room",
  "phone:join",
]);

export const ackEvents = new Set([
  ...requiredAckEvents,
  "phone:claim_role",
  "phone:leave",
  "client:restart_room",
]);
