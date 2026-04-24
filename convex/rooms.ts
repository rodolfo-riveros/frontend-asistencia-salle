import { mutation, query } from "./server";
import { v } from "convex/values";

// ── MUTATIONS ──────────────────────────────────────────────────────────────

/**
 * createRoom
 * Crea (o recrea) la sala de gamificación.
 * El roomCode viene de FastAPI — ya fue guardado en gamificacion_sesiones.
 */
export const createRoom = mutation({
  args: {
    roomCode:  v.string(),
    questions: v.array(v.any()),
    configId:  v.string(),   // evaluacion_id de Supabase
    unidadId:  v.string(),
  },
  handler: async (ctx, args) => {
    // Si ya existe una sala con ese código, la elimina primero (idempotente)
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();

    if (existing) {
      // Eliminar participantes de la sala anterior
      const oldParticipants = await ctx.db
        .query("participants")
        .withIndex("by_room", (q) => q.eq("roomId", existing._id))
        .collect();
      for (const p of oldParticipants) await ctx.db.delete(p._id);
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("rooms", {
      roomCode:             args.roomCode,
      status:               "lobby",
      currentQuestionIndex: 0,
      configId:             args.configId,
      unidadId:             args.unidadId,
      questions:            args.questions,
      createdAt:            Date.now(),
    });
  },
});

/**
 * joinRoom
 * El alumno se une a la sala con su nombre.
 * Retorna el participantId para que el frontend lo guarde localmente.
 */
export const joinRoom = mutation({
  args: {
    roomCode: v.string(),
    name:     v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();

    if (!room)                    throw new Error("La sala no existe.");
    if (room.status === "finished") throw new Error("El juego ya terminó.");

    return await ctx.db.insert("participants", {
      roomId:  room._id,
      name:    args.name,
      score:   0,
      answers: [],
    });
  },
});

/**
 * submitAnswer
 * El alumno envía su respuesta. Actualiza su puntaje acumulado.
 */
export const submitAnswer = mutation({
  args: {
    roomCode:      v.string(),
    participantId: v.string(),
    questionIndex: v.number(),
    isCorrect:     v.boolean(),
  },
  handler: async (ctx, args) => {
    const participantId = args.participantId as any;
    const participant   = await ctx.db.get(participantId);
    if (!participant) throw new Error("Participante no encontrado.");

    // Evitar respuesta duplicada para la misma pregunta
    const yaRespondio = participant.answers.some(
      (a: { questionIndex: number }) => a.questionIndex === args.questionIndex
    );
    if (yaRespondio) return { alreadyAnswered: true };

    const newAnswers = [
      ...participant.answers,
      { questionIndex: args.questionIndex, isCorrect: args.isCorrect },
    ];

    await ctx.db.patch(participantId, {
      answers: newAnswers,
      score:   participant.score + (args.isCorrect ? 10 : 0),
    });

    return { alreadyAnswered: false, newScore: participant.score + (args.isCorrect ? 10 : 0) };
  },
});

/**
 * updateStatus
 * Controla el ciclo: lobby → active → finished.
 * También avanza currentQuestionIndex cuando el docente lo pida.
 */
export const updateStatus = mutation({
  args: {
    roomCode:     v.string(),
    status:       v.string(),
    nextQuestion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    if (!room) throw new Error("Sala no encontrada.");

    const patch: Record<string, unknown> = { status: args.status };
    if (args.nextQuestion !== undefined) {
      patch.currentQuestionIndex = args.nextQuestion;
    }
    await ctx.db.patch(room._id, patch as any);
  },
});

/**
 * nextQuestion
 * Avanza a la siguiente pregunta. Si es la última, marca como finished.
 */
export const nextQuestion = mutation({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    if (!room) throw new Error("Sala no encontrada.");

    const next = room.currentQuestionIndex + 1;
    const isLast = next >= room.questions.length;

    await ctx.db.patch(room._id, {
      currentQuestionIndex: isLast ? room.currentQuestionIndex : next,
      status:               isLast ? "finished" : "active",
    });

    return { finished: isLast, currentQuestionIndex: isLast ? room.currentQuestionIndex : next };
  },
});


// ── QUERIES (reactivas) ────────────────────────────────────────────────────

/**
 * getRoom
 * Estado completo de la sala + participantes.
 * Tanto docente como alumnos la escuchan con useQuery — se actualiza en tiempo real.
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

    // No exponer la respuesta correcta a los clientes (alumnos)
    const questionsSafe = room.questions.map((q: any) => {
      const { correctIndex: _, ...rest } = q;
      return rest;
    });

    return {
      ...room,
      questions:    questionsSafe,
      participants,
    };
  },
});

/**
 * getRanking
 * Ranking en tiempo real, ordenado por score descendente.
 */
export const getRanking = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_roomCode", (q) => q.eq("roomCode", args.roomCode))
      .first();
    if (!room) return [];

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();

    return participants
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({
        posicion:  i + 1,
        id:        p._id,
        nombre:    p.name,
        puntaje:   p.score,
        aciertos:  p.answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length,
        total:     p.answers.length,
      }));
  },
});

/**
 * getResultadosFinales
 * Arma el payload exacto que POST /evaluaciones/notas-gamificacion/ espera.
 * El frontend lo llama al detectar status === "finished".
 */
export const getResultadosFinales = query({
  args: {
    roomCode:     v.string(),
    evaluacionId: v.string(),   // UUID de Supabase para el payload
  },
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

    // Payload listo para POST /evaluaciones/notas-gamificacion/
    return {
      evaluacion_id:   args.evaluacionId,
      total_preguntas: room.questions.length,
      notas: participants.map((p) => ({
        alumno_id:       p.name,   // reemplazar con alumno_id UUID si lo guardas en participants
        aciertos:        p.answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length,
        total_preguntas: room.questions.length,
      })),
    };
  },
});
