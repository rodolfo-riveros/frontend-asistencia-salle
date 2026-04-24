
import { mutation, query } from "convex/server";
import { v } from "convex/values";

/**
 * Crea una sala de gamificación en tiempo real.
 */
export const createRoom = mutation({
  args: {
    roomCode: v.string(),
    questions: v.array(v.any()),
    configId: v.string(),
    unidadId: v.string(),
  },
  handler: async (ctx, args) => {
    // Buscar si ya existe una sala con ese código para limpiarla
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("rooms", {
      roomCode: args.roomCode,
      status: "lobby",
      currentQuestionIndex: 0,
      configId: args.configId,
      unidadId: args.unidadId,
      questions: args.questions,
      createdAt: Date.now(),
    });
  },
});

/**
 * Obtiene los datos de una sala específica incluyendo sus participantes.
 */
export const getRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    
    if (!room) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    return { ...room, participants };
  },
});

/**
 * Permite a un estudiante unirse a una sala.
 */
export const joinRoom = mutation({
  args: { roomCode: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    
    if (!room) throw new Error("La sala no existe.");
    if (room.status === 'finished') throw new Error("El juego ya terminó.");

    return await ctx.db.insert("participants", {
      roomId: room._id,
      name: args.name,
      score: 0,
      answers: [],
    });
  },
});

/**
 * Registra la respuesta de un participante.
 */
export const submitAnswer = mutation({
  args: {
    roomCode: v.string(),
    participantId: v.string(),
    questionIndex: v.number(),
    isCorrect: v.boolean(),
  },
  handler: async (ctx, args) => {
    const participantId = args.participantId as any;
    const participant = await ctx.db.get(participantId);
    if (!participant) return;

    const newAnswers = [...participant.answers, { 
      questionIndex: args.questionIndex, 
      isCorrect: args.isCorrect 
    }];
    
    await ctx.db.patch(participantId, {
      answers: newAnswers,
      score: participant.score + (args.isCorrect ? 10 : 0)
    });
  },
});

/**
 * Actualiza el estado de la sala (lobby -> active -> finished).
 */
export const updateStatus = mutation({
  args: { roomCode: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    if (!room) return;
    await ctx.db.patch(room._id, { status: args.status as any });
  },
});
