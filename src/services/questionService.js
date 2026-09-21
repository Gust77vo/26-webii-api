import prisma from "../config/database.js";
import { NotFoundError } from "../errors/AppError.js";

const publicUserSelect = {
  id: true,
  nome: true,
  email: true,
  papel: true,
  foto: true,
};

const publicSubjectSelect = {
  id: true,
  nome: true,
  ativa: true,
};

const publicQuestionSelect = {
  id: true,
  enunciado: true,
  dificuldade: true,
  respostaCorreta: true,
  ativa: true,
  createdAt: true,
  updatedAt: true,
  subject: { select: publicSubjectSelect },
  author: { select: publicUserSelect },
};

/**
 * Verifica a existência de matéria e autor sem depender de strings de mensagem.
 * @param {{subjectId?: number, authorId?: number}} data - IDs a validar.
 * @returns {{ok: true}|{ok: false, reason: "SUBJECT_NOT_FOUND"|"AUTHOR_NOT_FOUND"}} Resultado da verificação.
 */
async function relatedRecordsExist({ subjectId, authorId }) {
  if (subjectId !== undefined) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });

    if (!subject) {
      return { ok: false, reason: "SUBJECT_NOT_FOUND" };
    }
  }

  if (authorId !== undefined) {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true },
    });

    if (!author) {
      return { ok: false, reason: "AUTHOR_NOT_FOUND" };
    }
  }

  return { ok: true };
}

/**
 * Busca todas as questões públicas em ordem decrescente de criação.
 * @returns {Promise<object[]>} Lista de questões públicas.
 */
export async function getAllQuestions() {
  return prisma.question.findMany({
    select: publicQuestionSelect,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Busca uma questão por ID com o contrato público completo.
 * @param {number} questionId - ID da questão já validado.
 * @returns {Promise<object>} Questão pública encontrada.
 * @throws {NotFoundError} Quando a questão não existe.
 */
export async function getQuestionById(questionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: publicQuestionSelect,
  });

  if (!question) {
    throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  }

  return question;
}

/**
 * Cria uma questão após validar existência de matéria e autor.
 * @param {{enunciado: string, dificuldade: number, respostaCorreta?: string|null, subjectId: number, authorId: number, ativa?: boolean}} questionData - Dados validados.
 * @returns {Promise<object>} Questão pública criada.
 * @throws {NotFoundError} Quando a matéria ou o autor não existe.
 */
export async function createQuestion(questionData) {
  const relations = await relatedRecordsExist(questionData);

  if (!relations.ok) {
    if (relations.reason === "SUBJECT_NOT_FOUND") {
      throw new NotFoundError(`Matéria com ID ${questionData.subjectId} não encontrada`);
    }

    throw new NotFoundError(`Autor com ID ${questionData.authorId} não encontrado`);
  }

  return prisma.question.create({
    data: {
      enunciado: questionData.enunciado.trim(),
      dificuldade: questionData.dificuldade,
      respostaCorreta: questionData.respostaCorreta === undefined ? null : questionData.respostaCorreta?.trim() || null,
      subjectId: questionData.subjectId,
      authorId: questionData.authorId,
      ativa: questionData.ativa ?? true,
    },
    select: publicQuestionSelect,
  });
}

/**
 * Atualiza somente os campos permitidos de uma questão existente.
 * @param {number} questionId - ID da questão já validado.
 * @param {{enunciado?: string, dificuldade?: number, respostaCorreta?: string|null, subjectId?: number, authorId?: number, ativa?: boolean}} questionData - Dados parciais.
 * @returns {Promise<object>} Questão pública atualizada.
 * @throws {NotFoundError} Quando a questão, matéria ou autor não existe.
 */
export async function updateQuestion(questionId, questionData) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!question) {
    throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  }

  const relations = await relatedRecordsExist(questionData);

  if (!relations.ok) {
    if (relations.reason === "SUBJECT_NOT_FOUND") {
      throw new NotFoundError(`Matéria com ID ${questionData.subjectId} não encontrada`);
    }

    throw new NotFoundError(`Autor com ID ${questionData.authorId} não encontrado`);
  }

  const data = {};

  if (questionData.enunciado !== undefined) {
    data.enunciado = questionData.enunciado.trim();
  }

  if (questionData.dificuldade !== undefined) {
    data.dificuldade = questionData.dificuldade;
  }

  if (questionData.respostaCorreta !== undefined) {
    data.respostaCorreta = questionData.respostaCorreta === null ? null : questionData.respostaCorreta.trim();
  }

  if (questionData.subjectId !== undefined) {
    data.subjectId = questionData.subjectId;
  }

  if (questionData.authorId !== undefined) {
    data.authorId = questionData.authorId;
  }

  if (questionData.ativa !== undefined) {
    data.ativa = questionData.ativa;
  }

  return prisma.question.update({
    where: { id: questionId },
    data,
    select: publicQuestionSelect,
  });
}

/**
 * Remove uma questão pelo ID informado.
 * @param {number} questionId - ID da questão já validado.
 * @returns {Promise<object>} Questão pública removida.
 * @throws {NotFoundError} Quando a questão não existe.
 */
export async function deleteQuestion(questionId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });

  if (!question) {
    throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
  }

  try {
    return await prisma.question.delete({
      where: { id: questionId },
      select: publicQuestionSelect,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw new NotFoundError(`Questão com ID ${questionId} não encontrada`);
    }

    throw error;
  }
}
