import { z } from "zod";
import { positiveIdSchema } from "./idSchema.js";

const difficultySchema = z.union([
  z.number().int("Dificuldade deve ser um inteiro").min(1, "Dificuldade deve estar entre 1 e 3").max(3, "Dificuldade deve estar entre 1 e 3"),
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Dificuldade deve ser um número inteiro de 1 a 3")
    .transform(Number)
    .refine((value) => value >= 1 && value <= 3, "Dificuldade deve estar entre 1 e 3"),
]);

const optionalTextSchema = z.union([
  z.string().trim().min(1, "Texto não pode ficar vazio").max(500, "Texto deve ter no máximo 500 caracteres"),
  z.null(),
]);

/** Schema para POST /questions. */
export const createQuestionSchema = z
  .object({
    enunciado: z
      .string()
      .trim()
      .min(3, "Enunciado deve ter pelo menos 3 caracteres")
      .max(500, "Enunciado deve ter no máximo 500 caracteres"),
    dificuldade: difficultySchema,
    respostaCorreta: optionalTextSchema.optional(),
    subjectId: positiveIdSchema,
    authorId: positiveIdSchema,
    ativa: z.boolean().optional(),
  })
  .strict();

/** Schema para PATCH /questions/:id. */
export const updateQuestionSchema = z
  .object({
    enunciado: z
      .string()
      .trim()
      .min(3, "Enunciado deve ter pelo menos 3 caracteres")
      .max(500, "Enunciado deve ter no máximo 500 caracteres")
      .optional(),
    dificuldade: difficultySchema.optional(),
    respostaCorreta: optionalTextSchema.optional(),
    subjectId: positiveIdSchema.optional(),
    authorId: positiveIdSchema.optional(),
    ativa: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envie pelo menos um campo para atualização",
  });

/** Schema para parâmetros :id positivos. */
export const idParamSchema = z.object({
  id: positiveIdSchema,
});
