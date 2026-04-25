import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const AVATARS = [
  "Cazador Nocturno", "Guardián de Hierro", "Explorador Salle", 
  "Maestro Jedi", "Héroe Ágil", "Escudo Valiente", 
  "Místico Astral", "Guerrero Trueno", "Fénix Dorado"
];

export const createRoom = mutation({
  args: {
    roomCode:  v.string(),
    questions: v.array(v.any()),
    configId:  v.string(),
    unidadId:  v.string(),
  },
  handler: async (ctx, args) => {
    const code = args.roomCode.toUpperCase();
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", code))
      .first();

    if (existing) {
      const oldParticipants = await ctx.db
        .query("participants")
        .withIndex("by_room", (q) => q.eq("roomId", existing._id))
        .collect();
      for (const p of oldParticipants) await ctx.db.delete(p._id);
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("rooms", {
      roomCode:             code,
      status:               "lobby",
      currentQuestionIndex: 0,
      configId:             args.configId,
      unidadId:             args.unidadId,
      questions:            args.questions,
      createdAt:            Date.now(),
    });
  },
});

export const joinRoom = mutation({
  args: { 
    roomCode: v.string(), 
    name: v.string(), 
    alumno_id: v.string(),
    programa: v.optional(v.string()),
    semestre: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const code = args.roomCode.toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", code))
      .first();
      
    if (!room) throw new Error("La sala no existe.");

    // RECUPERACIÓN DE SESIÓN POR UUID TÉCNICO
    const existingParticipant = await ctx.db
      .query("participants")
      .withIndex("by_alumno_in_room", (q) => q.eq("roomId", room._id).eq("alumno_id", args.alumno_id))
      .first();
    
    if (existingParticipant) {
      return existingParticipant._id;
    }

    if (room.status === "finished") throw new Error("El juego ya terminó.");

    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];

    return await ctx.db.insert("participants", {
      roomId:    room._id,
      alumno_id: args.alumno_id,
      name:      args.name.trim().toUpperCase(),
      programa:  args.programa,
      semestre:  args.semestre,
      score:     0,
      avatar:    randomAvatar,
      isCheating: false,
      answers:   [],
    });
  },
});

export const reportCheat = mutation({
  args: { participantId: v.string(), isCheating: v.boolean() },
  handler: async (ctx, args) => {
    try {
      const pId = args.participantId as any;
      const participant = await ctx.db.get(pId);
      if (participant) {
        await ctx.db.patch(participant._id, { isCheating: args.isCheating });
      }
    } catch (e) {
      console.error("Error reporting cheat:", e);
    }
  },
});

export const submitAnswer = mutation({
  args: {
    roomCode:      v.string(),
    participantId: v.string(),
    questionIndex: v.number(),
    isCorrect:     v.boolean(),
  },
  handler: async (ctx, args) => {
    const pId = args.participantId as any;
    const participant = await ctx.db.get(pId);
    if (!participant) throw new Error("Participante no encontrado.");

    const yaRespondio = participant.answers.some((a: any) => a.questionIndex === args.questionIndex);
    if (yaRespondio) return { alreadyAnswered: true };

    const newAnswers = [...participant.answers, { questionIndex: args.questionIndex, isCorrect: args.isCorrect }];
    await ctx.db.patch(participant._id, {
      answers: newAnswers,
      score:   participant.score + (args.isCorrect ? 100 : 0), 
    });

    return { alreadyAnswered: false };
  },
});

export const updateStatus = mutation({
  args: { roomCode: v.string(), status: v.string(), nextQuestion: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const code = args.roomCode.toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", code))
      .first();
      
    if (!room) throw new Error("Sala no encontrada.");
    const patch: any = { status: args.status };
    if (args.nextQuestion !== undefined) patch.currentQuestionIndex = args.nextQuestion;
    await ctx.db.patch(room._id, patch);
  },
});

export const getRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const code = args.roomCode.toUpperCase();
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", code))
      .first();

    if (!room) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    return { ...room, participants };
  },
});
