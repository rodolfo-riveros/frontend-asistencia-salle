import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * rooms — sala de juego en tiempo real.
   * roomCode coincide con room_code de gamificacion_sesiones en Supabase.
   */
  rooms: defineTable({
    roomCode:             v.string(),
    status:               v.union(
      v.literal("lobby"),
      v.literal("active"),
      v.literal("finished"),
    ),
    currentQuestionIndex: v.number(),
    configId:             v.string(),   // evaluacion_id de Supabase
    unidadId:             v.string(),   // unidad_id de Supabase
    questions:            v.array(v.any()),
    createdAt:            v.number(),
  }).index("by_roomCode", ["roomCode"]),

  /**
   * participants — alumnos conectados.
   */
  participants: defineTable({
    roomId:  v.id("rooms"),
    name:    v.string(),
    score:   v.number(),
    answers: v.array(
      v.object({
        questionIndex: v.number(),
        isCorrect:     v.boolean(),
      })
    ),
  }).index("by_room", ["roomId"]),
});
