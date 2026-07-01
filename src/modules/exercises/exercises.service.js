const prisma = require('../../config/database');
const games = require('../ocr/games.service'); // tái dùng parser để đếm vị/câu/hỏi

// Lấy lớp do GV sở hữu (chặn thao tác lớp người khác)
const getOwnedClass = async (user, classId) => {
  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: user.id, isDeleted: false } });
  if (!cls) { const e = new Error('Không tìm thấy lớp học hoặc bạn không có quyền.'); e.status = 404; throw e; }
  return cls;
};

const countContent = (vocabText, sentenceText, mcqText) => ({
  vocab: games.parseVocab(vocabText).vocabularies.length,
  sentence: games.parseSentences(sentenceText).sentences.length,
  question: games.parseQuestions(mcqText).questions.length,
});

const decideType = ({ vocab, sentence, question }) => {
  const kinds = [vocab > 0, sentence > 0, question > 0].filter(Boolean).length;
  if (kinds !== 1) return 'MIXED';
  if (vocab > 0) return 'VOCAB';
  if (sentence > 0) return 'PATTERN';
  return 'QUIZ';
};

// ── Giao bài: lưu 1 Exercise (PUBLISHED) cho lớp ──
const create = async (user, body) => {
  const { classId, vocabText = '', sentenceText = '', mcqText = '' } = body;
  const title = String(body.title || '').trim();
  const cls = await getOwnedClass(user, classId);
  if (!title) { const e = new Error('Tên bài tập không được để trống.'); e.status = 400; throw e; }

  const counts = countContent(vocabText, sentenceText, mcqText);
  if (counts.vocab + counts.sentence + counts.question === 0) {
    const e = new Error('Bài tập cần ít nhất một nội dung (từ vựng / mẫu câu / trắc nghiệm).');
    e.status = 400; throw e;
  }

  const ex = await prisma.exercise.create({
    data: {
      classId,
      title,
      type: decideType(counts),
      status: 'PUBLISHED',
      gameConfig: { vocabText, sentenceText, mcqText, counts },
    },
  });

  return {
    exercise: {
      id: ex.id, title: ex.title, type: ex.type, status: ex.status,
      classId, className: cls.name, classCode: cls.classCode, counts, createdAt: ex.createdAt,
    },
  };
};

// ── Danh sách bài đã giao của GV (lọc theo lớp tùy chọn) ──
const getAll = async (user, classId) => {
  const classes = await prisma.class.findMany({
    where: { teacherId: user.id, isDeleted: false },
    select: { id: true, name: true, classCode: true },
  });
  const clsMap = Object.fromEntries(classes.map((c) => [c.id, c]));
  const ids = classes.map((c) => c.id);

  const where = { isDeleted: false, classId: { in: ids } };
  if (classId && classId !== 'all') where.classId = classId;

  const list = await prisma.exercise.findMany({ where, orderBy: { createdAt: 'desc' } });
  return list.map((ex) => ({
    id: ex.id,
    title: ex.title,
    type: ex.type,
    status: ex.status,
    classId: ex.classId,
    className: clsMap[ex.classId]?.name || '—',
    classCode: clsMap[ex.classId]?.classCode || '',
    counts: ex.gameConfig?.counts || { vocab: 0, sentence: 0, question: 0 },
    createdAt: ex.createdAt,
  }));
};

// ── Xóa MỀM bài tập ──
const remove = async (user, id) => {
  const ex = await prisma.exercise.findUnique({ where: { id } });
  if (!ex || ex.isDeleted) { const e = new Error('Không tìm thấy bài tập.'); e.status = 404; throw e; }
  await getOwnedClass(user, ex.classId); // đảm bảo bài thuộc lớp của GV
  await prisma.exercise.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
  return { ok: true };
};

module.exports = { create, getAll, remove };
