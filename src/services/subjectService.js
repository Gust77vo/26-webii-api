import prisma from "../config/database.js";
import { ConflictError, NotFoundError } from "../errors/AppError.js";

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
  createdAt: true,
  updatedAt: true,
  professor: { select: publicUserSelect },
};

/**
 * Busca todas as matérias públicas em ordem decrescente de criação.
 * @returns {Promise<object[]>} Lista de matérias públicas.
 */
export async function getAllSubjects() {
  return prisma.subject.findMany({
    select: publicSubjectSelect,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Busca uma matéria por ID para expor o contrato público.
 * @param {number} subjectId - ID da matéria já validado.
 * @returns {Promise<object>} Matéria pública encontrada.
 * @throws {NotFoundError} Quando a matéria não existe.
 */
export async function getSubjectById(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: publicSubjectSelect,
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }

  return subject;
}

/**
 * Cria uma matéria após validar existência do professor.
 * @param {{nome: string, professorId: number, ativa?: boolean}} subjectData - Dados validados.
 * @returns {Promise<object>} Matéria pública criada.
 * @throws {NotFoundError} Quando o professor não existe.
 */
export async function createSubject(subjectData) {
  const professor = await prisma.user.findUnique({
    where: { id: subjectData.professorId },
    select: { id: true },
  });

  if (!professor) {
    throw new NotFoundError(`Professor com ID ${subjectData.professorId} não encontrado`);
  }

  return prisma.subject.create({
    data: {
      nome: subjectData.nome.trim(),
      professorId: subjectData.professorId,
      ativa: subjectData.ativa ?? true,
    },
    select: publicSubjectSelect,
  });
}

/**
 * Atualiza somente campos permitidos de uma matéria existente.
 * @param {number} subjectId - ID da matéria já validado.
 * @param {{nome?: string, professorId?: number, ativa?: boolean}} subjectData - Dados parciais.
 * @returns {Promise<object>} Matéria pública atualizada.
 * @throws {NotFoundError} Quando a matéria não existe.
 * @throws {NotFoundError} Quando o professor informado não existe.
 */
export async function updateSubject(subjectId, subjectData) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }

  if (subjectData.professorId !== undefined) {
    const professor = await prisma.user.findUnique({
      where: { id: subjectData.professorId },
      select: { id: true },
    });

    if (!professor) {
      throw new NotFoundError(
        `Professor com ID ${subjectData.professorId} não encontrado`,
      );
    }
  }

  const data = {};

  if (subjectData.nome !== undefined) data.nome = subjectData.nome.trim();
  if (subjectData.ativa !== undefined) data.ativa = subjectData.ativa;
  if (subjectData.professorId !== undefined) data.professorId = subjectData.professorId;

  return prisma.subject.update({
    where: { id: subjectId },
    data,
    select: publicSubjectSelect,
  });
}

/**
 * Remove uma matéria sem questões vinculadas.
 * @param {number} subjectId - ID da matéria já validado.
 * @returns {Promise<object>} Matéria pública removida.
 * @throws {NotFoundError} Quando a matéria não existe.
 * @throws {ConflictError} Quando há questões vinculadas.
 */
export async function deleteSubject(subjectId) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      _count: { select: { questions: true } },
    },
  });

  if (!subject) {
    throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
  }

  if (subject._count.questions > 0) {
    throw new ConflictError("Matéria possui questões vinculadas");
  }

  try {
    return await prisma.subject.delete({
      where: { id: subjectId },
      select: publicSubjectSelect,
    });
  } catch (error) {
    if (error?.code === "P2025") {
      throw new NotFoundError(`Matéria com ID ${subjectId} não encontrada`);
    }

    throw error;
  }
}
