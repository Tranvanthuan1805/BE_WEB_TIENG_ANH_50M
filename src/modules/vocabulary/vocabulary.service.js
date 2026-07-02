const prisma = require('../../config/database');

const getAll = async (user) => {
  return [];
};

const getGardenData = async (user) => {
  // 1. Lấy danh sách lớp học user tham gia
  const enrollments = await prisma.classEnrollment.findMany({ where: { userId: user.id }, select: { classId: true } });
  const classIds = enrollments.map(e => e.classId);
  
  // 2. Lấy danh sách exercise của các lớp này
  const exercises = await prisma.exercise.findMany({ 
    where: { classId: { in: classIds }, status: { in: ['PUBLISHED', 'DRAFT'] } }, // Tạm cho phép DRAFT để dễ test
    select: { id: true } 
  });
  const exerciseIds = exercises.map(e => e.id);
  
  // 3. Lấy tất cả từ vựng
  const vocabularies = await prisma.vocabulary.findMany({ where: { exerciseId: { in: exerciseIds }, isDeleted: false } });
  
  // 4. Lấy tiến độ hiện tại
  const progressList = await prisma.userVocabularyProgress.findMany({ 
    where: { userId: user.id }, 
    include: { vocabulary: true } 
  });
  
  const progressMap = {};
  progressList.forEach(p => progressMap[p.vocabularyId] = p);

  // 5. Khởi tạo tiến độ cho từ vựng mới
  const newProgresses = [];
  for (const vocab of vocabularies) {
    if (!progressMap[vocab.id]) {
      newProgresses.push({
        userId: user.id,
        vocabularyId: vocab.id,
        level: 0,
        nextReview: new Date()
      });
    }
  }

  if (newProgresses.length > 0) {
    await prisma.userVocabularyProgress.createMany({ data: newProgresses });
    const added = await prisma.userVocabularyProgress.findMany({
      where: { userId: user.id, vocabularyId: { in: newProgresses.map(p => p.vocabularyId) } },
      include: { vocabulary: true }
    });
    progressList.push(...added);
  }

  // 6. Gamification
  let gamification = await prisma.gamification.findUnique({ where: { userId: user.id } });
  if (!gamification) {
    gamification = await prisma.gamification.create({ data: { userId: user.id } });
  }

  // Gom nhóm
  const stats = {
    new: progressList.filter(p => p.level === 0).length,
    learning: progressList.filter(p => p.level === 1).length,
    temp: progressList.filter(p => p.level === 2).length,
    long: progressList.filter(p => p.level === 3).length,
    mastered: progressList.filter(p => p.level >= 4).length,
  };

  return {
    progress: progressList,
    stats,
    gamification
  };
};

const updateProgress = async (user, vocabularyId, isCorrect) => {
  const progress = await prisma.userVocabularyProgress.findUnique({
    where: { userId_vocabularyId: { userId: user.id, vocabularyId } }
  });

  if (!progress) throw { status: 404, message: 'Vocabulary progress not found' };

  let newLevel = progress.level;
  let nextReview = new Date();

  if (isCorrect) {
    newLevel = Math.min(newLevel + 1, 4);
    // SRS delay (ngày)
    const delays = [1, 2, 4, 7, 14]; // level 0->1: 1 ngày, ...
    nextReview.setDate(nextReview.getDate() + delays[newLevel]);
    
    // Cộng điểm
    await prisma.gamification.update({
      where: { userId: user.id },
      data: { totalPoints: { increment: 10 } }
    });
  } else {
    newLevel = Math.max(newLevel - 1, 0);
  }

  return prisma.userVocabularyProgress.update({
    where: { userId_vocabularyId: { userId: user.id, vocabularyId } },
    data: { level: newLevel, nextReview }
  });
};

const getQuizData = async (user) => {
  // 1. Get user's vocabulary progress to find words to study
  // We prioritize words where nextReview is due or level is 0
  const now = new Date();
  let progressList = await prisma.userVocabularyProgress.findMany({
    where: { 
      userId: user.id,
      OR: [
        { level: 0 },
        { nextReview: { lte: now } }
      ]
    },
    include: { vocabulary: true },
    take: 10
  });

  // If we have less than 10 words due for review, fill the remaining with other words the user is learning
  if (progressList.length < 10) {
    const existingIds = progressList.map(p => p.id);
    const additional = await prisma.userVocabularyProgress.findMany({
      where: { 
        userId: user.id,
        id: { notIn: existingIds }
      },
      include: { vocabulary: true },
      take: 10 - progressList.length
    });
    progressList = [...progressList, ...additional];
  }

  if (progressList.length === 0) {
    return []; // No vocabulary to quiz
  }

  // 2. Fetch all vocabularies in the same exercises to pick random wrong answers
  const exerciseIds = [...new Set(progressList.map(p => p.vocabulary.exerciseId))];
  const allVocabs = await prisma.vocabulary.findMany({
    where: { exerciseId: { in: exerciseIds } }
  });

  // 3. Generate quiz questions
  const questions = progressList.map(p => {
    const correctVocab = p.vocabulary;
    
    // Pick 3 random wrong answers
    const wrongVocabs = allVocabs.filter(v => v.id !== correctVocab.id);
    // Shuffle wrongVocabs
    wrongVocabs.sort(() => 0.5 - Math.random());
    const selectedWrongs = wrongVocabs.slice(0, 3).map(v => v.meaning);

    // If we don't have enough wrong vocabs, pad with placeholders
    while (selectedWrongs.length < 3) {
      selectedWrongs.push('Nghĩa khác ' + Math.random().toString(36).substring(7));
    }

    const options = [correctVocab.meaning, ...selectedWrongs];
    
    return {
      id: correctVocab.id, // Using vocab id as question id so frontend can pass it to progress API
      question: `Nghĩa của từ "${correctVocab.word}" là gì?`,
      options: options,
      correctAnswer: correctVocab.meaning
    };
  });

  return questions;
};

// ── Lấy danh sách mẫu câu (Pattern) từ các lớp học user tham gia ──
const getPatterns = async (user) => {
  // 1. Lớp học user tham gia
  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId: user.id, isDeleted: false },
    select: { classId: true }
  });
  const classIds = enrollments.map(e => e.classId);

  // 2. Exercise của các lớp
  const exercises = await prisma.exercise.findMany({
    where: { classId: { in: classIds }, status: { in: ['PUBLISHED', 'DRAFT'] }, isDeleted: false },
    select: { id: true }
  });
  const exerciseIds = exercises.map(e => e.id);

  // 3. Patterns
  const patterns = await prisma.pattern.findMany({
    where: { exerciseId: { in: exerciseIds }, isDeleted: false },
    orderBy: { createdAt: 'asc' }
  });

  // 4. Trả về format frontend cần: thêm tokens (chia câu thành mảng từ)
  return patterns.map(p => ({
    id: p.id,
    sentence: p.sentence,
    translation: p.translation,
    audioUrl: p.audioUrl,
    tokens: p.sentence.trim().split(/\s+/) // chia thành token để dùng cho scramble game
  }));
};

module.exports = { getAll, getGardenData, updateProgress, getQuizData, getPatterns };
