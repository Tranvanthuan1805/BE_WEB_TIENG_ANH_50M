const prisma = require('../../config/database');
const games = require('../ocr/games.service'); // tái dùng parser để đếm vị/câu/hỏi

// Lấy lớp do GV sở hữu (chặn thao tác lớp người khác)
const getOwnedClass = async (user, classId) => {
  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId: user.id, isDeleted: false } });
  if (!cls) { const e = new Error('Không tìm thấy lớp học hoặc bạn không có quyền.'); e.status = 404; throw e; }
  return cls;
};

const countContent = (vocabText, sentenceText, mcqText) => {
  const allVocabs = games.parseVocab(vocabText).vocabularies || [];
  const validVocabs = allVocabs.filter(v => v.meaning && v.meaning.trim() !== '');
  return {
    vocab: validVocabs.length,
    sentence: games.parseSentences(sentenceText).sentences.length,
    question: games.parseQuestions(mcqText).questions.length,
  };
};

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

  // Generate enriched games data
  const generatedGames = await games.generate({ vocabText, sentenceText, mcqText });

  const ex = await prisma.exercise.create({
    data: {
      classId,
      title,
      type: decideType(counts),
      status: 'PUBLISHED',
      gameConfig: { vocabText, sentenceText, mcqText, counts, games: generatedGames.games },
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
    gameConfig: ex.gameConfig || {}, // <--- ADDED THIS
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

// ── Danh sách bài tập cho học sinh ──
const getAllForStudent = async (user) => {
  // Find which classes the user is enrolled in
  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId: user.id, isDeleted: false },
    select: { classId: true }
  });
  const classIds = enrollments.map(e => e.classId);

  if (classIds.length === 0) return [];

  // Tính sĩ số các lớp
  const classSizes = {};
  for (const cid of classIds) {
    const count = await prisma.classEnrollment.count({ where: { classId: cid, isDeleted: false } });
    classSizes[cid] = count;
  }

  const list = await prisma.exercise.findMany({
    where: { isDeleted: false, classId: { in: classIds } },
    orderBy: { createdAt: 'desc' }
  });

  return list.map((ex) => {
    const cfg = ex.gameConfig || {};
    const counts = cfg.counts || { vocab: 0, sentence: 0, question: 0 };

    // Tính tổng câu quiz thực tế = vocab flashcard + fill-in-blank + MCQ giáo viên
    const games = cfg.games || {};
    const totalQuizQuestions =
      (games.game1_flashcard?.count || 0) +
      (games.game3_fillblank?.count || 0) +
      (games.quiz_teacher?.count || 0);

    return {
      id: ex.id,
      title: ex.title,
      type: ex.type,
      status: ex.status,
      classId: ex.classId,
      classSize: classSizes[ex.classId] || 1, // Sĩ số lớp
      counts: {
        ...counts,
        // Ghi đè question bằng tổng thực tế (nếu đã có games data)
        question: totalQuizQuestions > 0 ? totalQuizQuestions : counts.question,
      },
      createdAt: ex.createdAt,
    };
  });
};

const getQuizForStudent = async (user, exerciseId) => {
  const ex = await prisma.exercise.findUnique({
    where: { id: exerciseId, isDeleted: false }
  });

  if (!ex || !ex.gameConfig) return [];
  
  let gamesData = ex.gameConfig.games;
  if (!gamesData) {
    const generated = await games.generate({
      vocabText: ex.gameConfig.vocabText || '',
      sentenceText: ex.gameConfig.sentenceText || '',
      mcqText: ex.gameConfig.mcqText || ''
    });
    gamesData = generated.games;
    // Cache it to DB asynchronously for next time
    prisma.exercise.update({
      where: { id: exerciseId },
      data: { gameConfig: { ...ex.gameConfig, games: gamesData } }
    }).catch(console.error);
  }

  let questions = [];

  // 1. MCQ
  if (ex.gameConfig.mcqText) {
    const parsedMcq = games.parseQuestions(ex.gameConfig.mcqText);
    if (parsedMcq.questions && parsedMcq.questions.length > 0) {
      questions = questions.concat(parsedMcq.questions.map((q, idx) => ({
        id: `mcq_${idx}`,
        question: q.question,
        options: q.options,
        // q.answer is a letter like 'A','B','C','D' — convert to the actual option text
        correctAnswer: q.answer
          ? q.options[q.answer.charCodeAt(0) - 65] ?? q.options[0]
          : q.options[0]
      })));
    }
  }

  // 2. Vocab Quiz
  if (gamesData.game1_flashcard && gamesData.game1_flashcard.items) {
    const vocabQuestions = gamesData.game1_flashcard.items.map((v, idx) => {
      return {
        id: `vocab_${idx}`,
        question: `Nghĩa của từ "${v.word}" là gì?`,
        options: v.options,
        correctAnswer: v.meaning
      };
    });
    questions = questions.concat(vocabQuestions);
  }

  // 3. Fill in the blank (game3)
  if (gamesData.game3_fillblank && gamesData.game3_fillblank.items) {
    const fillQuestions = gamesData.game3_fillblank.items.map((it, idx) => {
      return {
        id: `fill_${idx}`,
        question: it.sentence,
        options: it.options,
        correctAnswer: it.correctWord
      };
    });
    questions = questions.concat(fillQuestions);
  }

  return questions.sort(() => 0.5 - Math.random());
};

const getVocabForStudent = async (user, exerciseId) => {
  const ex = await prisma.exercise.findUnique({
    where: { id: exerciseId, isDeleted: false }
  });

  if (!ex || !ex.gameConfig) return [];

  let gamesData = ex.gameConfig.games;
  if (!gamesData) {
    const generated = await games.generate({
      vocabText: ex.gameConfig.vocabText || '',
      sentenceText: ex.gameConfig.sentenceText || '',
      mcqText: ex.gameConfig.mcqText || ''
    });
    gamesData = generated.games;
    prisma.exercise.update({
      where: { id: exerciseId },
      data: { gameConfig: { ...ex.gameConfig, games: gamesData } }
    }).catch(console.error);
  }

  if (!gamesData.game1_flashcard || !gamesData.game1_flashcard.items) return [];

  return gamesData.game1_flashcard.items.map(v => ({
    id: v.id || Math.random().toString(),
    english: v.word || '',
    IPA: v.phonetic || '/.../',
    vietnamese: v.meaning || '',
    audioUrl: v.audioUrl || null,
    type: 'word'
  }));
};

const getPatternForStudent = async (user, exerciseId) => {
  const ex = await prisma.exercise.findUnique({
    where: { id: exerciseId, isDeleted: false }
  });

  if (!ex || !ex.gameConfig) return [];
  
  let gamesData = ex.gameConfig.games;
  if (!gamesData) {
    const generated = await games.generate({
      vocabText: ex.gameConfig.vocabText || '',
      sentenceText: ex.gameConfig.sentenceText || '',
      mcqText: ex.gameConfig.mcqText || ''
    });
    gamesData = generated.games;
    prisma.exercise.update({
      where: { id: exerciseId },
      data: { gameConfig: { ...ex.gameConfig, games: gamesData } }
    }).catch(console.error);
  }

  if (!gamesData.game2_arrange || !gamesData.game2_arrange.items) return [];

  return gamesData.game2_arrange.items.map(it => ({
    sentence: it.sentence,
    translation: it.prompt,
    tokens: it.answer
  }));
};

module.exports = { create, getAll, remove, getAllForStudent, getQuizForStudent, getVocabForStudent, getPatternForStudent };
