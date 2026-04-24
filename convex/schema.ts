import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * rooms — sala de juego en tiempo real.
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
   * participants — alumnos conectados con identidad completa de Supabase/FastAPI.
   */
  participants: defineTable({
    roomId:     v.id("rooms"),
    studentId:  v.optional(v.string()), // UUID oficial de la base de datos
    name:       v.string(),
    score:      v.number(),
    avatar:     v.string(), // Nombre del personaje (Maestro Jedi, etc.)
    programa:   v.optional(v.string()), // Nombre de la carrera
    semestre:   v.optional(v.string()), // Semestre actual
    isCheating: v.boolean(), 
    answers:    v.array(
      v.object({
        questionIndex: v.number(),
        isCorrect:     v.boolean(),
      })
    ),
  }).index("by_room", ["roomId"])
    .index("by_student_in_room", ["roomId", "studentId"]),
});
