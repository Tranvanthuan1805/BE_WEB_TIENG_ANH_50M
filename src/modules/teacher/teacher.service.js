const prisma = require('../../config/database');

const getTeacherScores = async (user, { classId, period, exerciseId }) => {
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
  const scoreWhere = {
    userId: { in: studentIds },
    completedAt: { gte: filterDate },
    exercise: { classId } // ensure scores are for this class's exercises
  };
  if (exerciseId && exerciseId !== 'all') {
    scoreWhere.exerciseId = exerciseId;
  }

  const scores = await prisma.score.findMany({
    where: scoreWhere,
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

  const byStudent = Object.values(studentStats).map(s => {
    const vocab = s.vocab ? Math.round(s.vocab.sum / s.vocab.count) : 0;
    const sentence = s.sentence ? Math.round(s.sentence.sum / s.sentence.count) : 0;
    const quiz = s.quiz ? Math.round(s.quiz.sum / s.quiz.count) : 0;
    const speaking = s.speaking ? Math.round(s.speaking.sum / s.speaking.count) : 0;
    const total = s.count ? Math.round(s.total / s.count) : 0;

    // 4 Skills aggregated from 6 exercise question types (Listening, Speaking, Reading, Writing)
    const fourSkills = {
      listening: Math.round(sentence * 0.4 + vocab * 0.3 + quiz * 0.3),
      speaking: Math.round(speaking * 0.85 + sentence * 0.15),
      reading: Math.round(quiz * 0.5 + vocab * 0.3 + sentence * 0.2),
      writing: Math.round(sentence * 0.5 + vocab * 0.3 + quiz * 0.2)
    };

    return {
      userId: s.userId,
      name: s.name,
      vocab,
      sentence,
      quiz,
      speaking,
      total,
      fourSkills
    };
  });

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
  const filterDate = new Date();
  if (period === 'day') {
    filterDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    filterDate.setDate(filterDate.getDate() - 7);
  } else if (period === 'month') {
    filterDate.setDate(filterDate.getDate() - 30);
  }

  // 1. Fetch speaking results
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

  // 2. Fetch general scores (Vocab, Pattern, Quiz)
  const scores = await prisma.score.findMany({
    where: {
      userId: studentId,
      completedAt: { gte: filterDate }
    },
    include: {
      exercise: {
        include: {
          class: true
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  // 3. Map both results
  const resultsMapped = results.map(r => ({
    id: r.id,
    exerciseId: r.exercise.id,
    title: r.exercise.title,
    type: r.exercise.type,
    className: r.exercise.class?.name || '—',
    score: r.aiScore,
    audioUrl: r.audioUrl,
    feedback: r.feedback,
    teacherFeedback: r.teacherFeedback,
    feedbackAudioUrl: r.feedbackAudioUrl,
    completedAt: r.createdAt
  }));

  const scoresMapped = scores.map(s => ({
    id: s.id,
    exerciseId: s.exercise.id,
    title: s.exercise.title,
    type: s.exercise.type,
    className: s.exercise.class?.name || '—',
    score: s.score,
    wrongQuestions: s.wrongQuestions || null,
    completedAt: s.completedAt
  }));

  // Merge and sort desc
  const allSubmissions = [...resultsMapped, ...scoresMapped].sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
  );

  return allSubmissions;
};

const updateSpeakingFeedback = async (user, resultId, { teacherFeedback, deleteAudio, file }) => {
  // 1. Find speaking result
  const speakingResult = await prisma.speakingResult.findUnique({
    where: { id: resultId },
    include: {
      exercise: true
    }
  });

  if (!speakingResult) {
    const err = new Error('Không tìm thấy bài nộp của học sinh.');
    err.status = 404;
    throw err;
  }

  // 2. Verify teacher owns the class of this exercise
  const cls = await prisma.class.findFirst({
    where: { id: speakingResult.exercise.classId, teacherId: user.id, isDeleted: false }
  });

  if (!cls) {
    const err = new Error('Bạn không có quyền nhận xét bài nộp này.');
    err.status = 403;
    throw err;
  }

  const { uploadToR2, deleteFromR2, getR2KeyFromUrl } = require('../../utils/r2');
  let feedbackAudioUrl = speakingResult.feedbackAudioUrl;

  // 3. Delete existing audio if requested
  if (deleteAudio === 'true' && speakingResult.feedbackAudioUrl) {
    try {
      const oldKey = getR2KeyFromUrl(speakingResult.feedbackAudioUrl);
      if (oldKey) {
        await deleteFromR2(oldKey);
      }
    } catch (err) {
      console.error('Failed to delete feedback audio from R2:', err);
    }
    feedbackAudioUrl = null;
  }

  // 4. If teacher uploaded new recording file, upload to R2 and clean up the old one
  if (file) {
    if (speakingResult.feedbackAudioUrl) {
      try {
        const oldKey = getR2KeyFromUrl(speakingResult.feedbackAudioUrl);
        if (oldKey) {
          await deleteFromR2(oldKey);
        }
      } catch (err) {
        console.error('Failed to delete old feedback audio from R2:', err);
      }
    }

    const path = require('path');
    const ext = path.extname(file.originalname) || '.webm';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const r2FileName = `feedback-${resultId}-${uniqueSuffix}${ext}`;
    feedbackAudioUrl = await uploadToR2(file.buffer, r2FileName, file.mimetype);
  }

  // 5. Update the DB record
  const updatedResult = await prisma.speakingResult.update({
    where: { id: resultId },
    data: {
      teacherFeedback: teacherFeedback !== undefined ? teacherFeedback : speakingResult.teacherFeedback,
      feedbackAudioUrl
    }
  });

  return {
    id: updatedResult.id,
    teacherFeedback: updatedResult.teacherFeedback,
    feedbackAudioUrl: updatedResult.feedbackAudioUrl
  };
};

const getExerciseScores = async (user, exerciseId) => {
  // 1. Fetch exercise
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, isDeleted: false },
    include: { class: true }
  });

  if (!exercise) {
    const err = new Error('Không tìm thấy bài tập.');
    err.status = 404;
    throw err;
  }

  // 2. Verify class belongs to teacher
  if (exercise.class.teacherId !== user.id) {
    const err = new Error('Bạn không có quyền truy cập bài tập này.');
    err.status = 403;
    throw err;
  }

  // 3. Get enrolled students in class
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: exercise.classId, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentCode: true
        }
      }
    }
  });
  const students = enrollments.map(e => e.user);
  const studentIds = students.map(s => s.id);

  // 4. Query scores for this exercise
  const scores = await prisma.score.findMany({
    where: { exerciseId, userId: { in: studentIds } }
  });

  // 5. Query speaking results for this exercise
  const speakingResults = await prisma.speakingResult.findMany({
    where: { exerciseId, userId: { in: studentIds } }
  });

  // 6. Map each student to their completion data
  const studentsList = students.map(s => {
    const scoreRec = scores.find(sc => sc.userId === s.id);
    const speakRec = speakingResults.find(sr => sr.userId === s.id);

    return {
      id: s.id,
      name: s.name,
      studentCode: s.studentCode || '',
      completed: !!(scoreRec || speakRec),
      completedAt: scoreRec?.completedAt || speakRec?.createdAt || null,
      score: scoreRec ? scoreRec.score : (speakRec ? speakRec.aiScore : null),
      wrongQuestions: scoreRec ? scoreRec.wrongQuestions : null,
      speakingResult: speakRec ? {
        id: speakRec.id,
        audioUrl: speakRec.audioUrl,
        aiScore: speakRec.aiScore,
        feedback: speakRec.feedback,
        teacherFeedback: speakRec.teacherFeedback,
        feedbackAudioUrl: speakRec.feedbackAudioUrl,
      } : null
    };
  });

  return {
    exercise: {
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      className: exercise.class.name,
      classCode: exercise.class.classCode
    },
    students: studentsList
  };
};

module.exports = { getTeacherScores, getStudentDetails, updateSpeakingFeedback, getExerciseScores };
