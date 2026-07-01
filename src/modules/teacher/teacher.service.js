const prisma = require('../../config/database');

const getTeacherScores = async (user, { classId, period }) => {
  // 1. Verify that this class exists and belongs to this teacher
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: user.id, isDeleted: false }
  });
  if (!cls) {
    const err = new Error('Không tìm thấy lớp học hoặc bạn không có quyền.');
    err.status = 404;
    throw err;
  }

  // 2. Determine filter start date
  const filterDate = new Date();
  if (period === 'day') {
    filterDate.setHours(0, 0, 0, 0); // today
  } else if (period === 'week') {
    filterDate.setDate(filterDate.getDate() - 7);
  } else if (period === 'month') {
    filterDate.setDate(filterDate.getDate() - 30);
  }

  // 3. Get enrolled students in the class
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId, isDeleted: false },
    include: { user: true }
  });
  const students = enrollments.map(e => e.user);
  const studentIds = students.map(s => s.id);

  // 4. Query scores
  const scores = await prisma.score.findMany({
    where: {
      userId: { in: studentIds },
      completedAt: { gte: filterDate },
      exercise: { classId } // ensure scores are for this class's exercises
    },
    include: {
      exercise: true
    }
  });

  // 5. Aggregate averages by exercise type
  const typeSumCount = {
    VOCAB: { sum: 0, count: 0 },
    PATTERN: { sum: 0, count: 0 },
    QUIZ: { sum: 0, count: 0 },
    SPEAKING: { sum: 0, count: 0 }
  };

  const studentStats = {};
  studentIds.forEach(id => {
    const s = students.find(item => item.id === id);
    studentStats[id] = {
      userId: id,
      name: s.name,
      vocab: null,
      sentence: null,
      quiz: null,
      speaking: null,
      total: 0,
      count: 0
    };
  });

  scores.forEach(sc => {
    const exType = sc.exercise.type; // VOCAB, PATTERN, QUIZ, SPEAKING, MIXED
    const typeKey = exType === 'PATTERN' ? 'PATTERN' : exType;
    if (typeSumCount[typeKey]) {
      typeSumCount[typeKey].sum += sc.score;
      typeSumCount[typeKey].count += 1;
    }

    const sStat = studentStats[sc.userId];
    if (sStat) {
      const field = exType === 'VOCAB' ? 'vocab' :
                    exType === 'PATTERN' ? 'sentence' :
                    exType === 'QUIZ' ? 'quiz' :
                    exType === 'SPEAKING' ? 'speaking' : null;
      if (field) {
        if (sStat[field] === null) {
          sStat[field] = { sum: 0, count: 0 };
        }
        sStat[field].sum += sc.score;
        sStat[field].count += 1;
      }
      sStat.total += sc.score;
      sStat.count += 1;
    }
  });

  const summary = {
    vocab: typeSumCount.VOCAB.count ? Math.round(typeSumCount.VOCAB.sum / typeSumCount.VOCAB.count) : 0,
    sentence: typeSumCount.PATTERN.count ? Math.round(typeSumCount.PATTERN.sum / typeSumCount.PATTERN.count) : 0,
    quiz: typeSumCount.QUIZ.count ? Math.round(typeSumCount.QUIZ.sum / typeSumCount.QUIZ.count) : 0,
    speaking: typeSumCount.SPEAKING.count ? Math.round(typeSumCount.SPEAKING.sum / typeSumCount.SPEAKING.count) : 0
  };

  const byStudent = Object.values(studentStats).map(s => ({
    userId: s.userId,
    name: s.name,
    vocab: s.vocab ? Math.round(s.vocab.sum / s.vocab.count) : 0,
    sentence: s.sentence ? Math.round(s.sentence.sum / s.sentence.count) : 0,
    quiz: s.quiz ? Math.round(s.quiz.sum / s.quiz.count) : 0,
    speaking: s.speaking ? Math.round(s.speaking.sum / s.speaking.count) : 0,
    total: s.count ? Math.round(s.total / s.count) : 0
  }));

  // 6. Calculate trend data (Group by YYYY-MM-DD)
  const trendMap = {};
  scores.forEach(sc => {
    const dateStr = sc.completedAt.toISOString().split('T')[0];
    if (!trendMap[dateStr]) {
      trendMap[dateStr] = { sum: 0, count: 0 };
    }
    trendMap[dateStr].sum += sc.score;
    trendMap[dateStr].count += 1;
  });

  const trend = Object.keys(trendMap).map(date => ({
    date,
    score: Math.round(trendMap[date].sum / trendMap[date].count)
  })).sort((a, b) => a.date.localeCompare(b.date));

  return { summary, byStudent, trend };
};

const getStudentDetails = async (user, { studentId, period }) => {
  // Query speaking results for this specific student
  const filterDate = new Date();
  if (period === 'day') {
    filterDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    filterDate.setDate(filterDate.getDate() - 7);
  } else if (period === 'month') {
    filterDate.setDate(filterDate.getDate() - 30);
  }

  const results = await prisma.speakingResult.findMany({
    where: {
      userId: studentId,
      createdAt: { gte: filterDate }
    },
    include: {
      exercise: {
        include: {
          class: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return results.map(r => ({
    id: r.id,
    exerciseId: r.exercise.id,
    title: r.exercise.title,
    type: r.exercise.type,
    className: r.exercise.class.name,
    score: r.aiScore,
    audioUrl: r.audioUrl,
    feedback: r.feedback,
    completedAt: r.createdAt
  }));
};

module.exports = { getTeacherScores, getStudentDetails };
