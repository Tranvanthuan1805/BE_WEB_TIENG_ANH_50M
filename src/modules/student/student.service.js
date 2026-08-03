const prisma = require('../../config/database');
const gamesService = require('../ocr/games.service');
const OpenAI = require('openai');
const env = require('../../config/env');
const https = require('https');

const agent = env.ocrInsecureTls ? new https.Agent({ rejectUnauthorized: false }) : undefined;
const buildAIClient = () => {
  if (env.ocrProvider === 'openrouter') {
    return new OpenAI({ apiKey: env.openrouterApiKey, baseURL: env.openrouterBaseUrl, httpAgent: agent, maxRetries: 0 });
  }
  return new OpenAI({ apiKey: env.geminiApiKey, baseURL: env.geminiBaseUrl, httpAgent: agent, maxRetries: 0 });
};
const aiClient = buildAIClient();

const getStudentScores = async (user, { period }) => {
  const filterDate = new Date();
  if (period === 'day') {
    filterDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    filterDate.setDate(filterDate.getDate() - 7);
  } else if (period === 'month') {
    filterDate.setDate(filterDate.getDate() - 30);
  }

  // 1. Get gamification info
  let gamification = await prisma.gamification.findUnique({
    where: { userId: user.id }
  });
  
  if (!gamification) {
    // Create lazy gamification if it doesn't exist
    gamification = await prisma.gamification.create({
      data: {
        userId: user.id,
        totalPoints: 0,
        stars: 0,
        badges: "[]",
        streak: 0
      }
    });
  }

  // 2. Fetch student's scores
  const scores = await prisma.score.findMany({
    where: {
      userId: user.id,
      completedAt: { gte: filterDate }
    },
    include: {
      exercise: true
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  // 3. Calculate avg per skill type
  const typeSumCount = {
    VOCAB: { sum: 0, count: 0 },
    PATTERN: { sum: 0, count: 0 },
    QUIZ: { sum: 0, count: 0 },
    SPEAKING: { sum: 0, count: 0 }
  };

  scores.forEach(sc => {
    const typeKey = sc.exercise.type;
    if (typeSumCount[typeKey]) {
      typeSumCount[typeKey].sum += sc.score;
      typeSumCount[typeKey].count += 1;
    }
  });

  const bySkill = {
    vocab: typeSumCount.VOCAB.count ? Math.round(typeSumCount.VOCAB.sum / typeSumCount.VOCAB.count) : 0,
    sentence: typeSumCount.PATTERN.count ? Math.round(typeSumCount.PATTERN.sum / typeSumCount.PATTERN.count) : 0,
    quiz: typeSumCount.QUIZ.count ? Math.round(typeSumCount.QUIZ.sum / typeSumCount.QUIZ.count) : 0,
    speaking: typeSumCount.SPEAKING.count ? Math.round(typeSumCount.SPEAKING.sum / typeSumCount.SPEAKING.count) : 0
  };

  // 4. Exercise history
  const history = scores.map(sc => ({
    exerciseId: sc.exercise.id,
    title: sc.exercise.title,
    type: sc.exercise.type,
    score: sc.score,
    completedAt: sc.completedAt
  }));

  // 5. Weekly trend (day-by-day average score)
  const trendMap = {};
  scores.forEach(sc => {
    const dateStr = sc.completedAt.toISOString().split('T')[0];
    if (!trendMap[dateStr]) {
      trendMap[dateStr] = { sum: 0, count: 0 };
    }
    trendMap[dateStr].sum += sc.score;
    trendMap[dateStr].count += 1;
  });

  const weeklyTrend = Object.keys(trendMap).map(date => ({
    date,
    score: Math.round(trendMap[date].sum / trendMap[date].count)
  })).sort((a, b) => a.date.localeCompare(b.date));

  // Fetch recent speaking attempts for the student, including teacher feedback
  const speakingResultsList = await prisma.speakingResult.findMany({
    where: { userId: user.id },
    include: {
      exercise: {
        select: {
          title: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });

  const speakingResults = speakingResultsList.map(r => ({
    id: r.id,
    exerciseId: r.exerciseId,
    exerciseTitle: r.exercise?.title || 'Luyện nói',
    audioUrl: r.audioUrl,
    aiScore: r.aiScore,
    feedback: r.feedback,
    teacherFeedback: r.teacherFeedback,
    feedbackAudioUrl: r.feedbackAudioUrl,
    createdAt: r.createdAt
  }));

  return {
    totalStars: gamification.stars,
    streak: gamification.streak,
    bySkill,
    history,
    weeklyTrend,
    speakingResults
  };
};

const getStudentExercises = async (user) => {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId: user.id, isDeleted: false },
    select: { classId: true }
  });
  const classIds = enrollments.map(e => e.classId);

  let exercises = [];
  if (classIds.length > 0) {
    exercises = await prisma.exercise.findMany({
      where: {
        classId: { in: classIds },
        status: 'PUBLISHED',
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        classId: true,
        gameConfig: true,
        createdAt: true,
        class: {
          select: {
            name: true,
            classCode: true
          }
        }
      }
    });
  }

  if (exercises.length === 0) {
    exercises = await prisma.exercise.findMany({
      where: {
        status: 'PUBLISHED',
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        classId: true,
        gameConfig: true,
        createdAt: true,
        class: {
          select: {
            name: true,
            classCode: true
          }
        }
      }
    });
  }

  const scores = await prisma.score.findMany({
    where: { userId: user.id }
  });
  const scoreMap = Object.fromEntries(scores.map(s => [s.exerciseId, { score: s.score, wrongQuestions: s.wrongQuestions }]));

  return exercises.map(ex => ({
    id: ex.id,
    title: ex.title,
    type: ex.type,
    classId: ex.classId,
    className: ex.class?.name || '—',
    classCode: ex.class?.classCode || '',
    counts: ex.gameConfig?.counts || { vocab: 0, sentence: 0, question: 0 },
    score: scoreMap[ex.id]?.score ?? null,
    wrongQuestions: scoreMap[ex.id]?.wrongQuestions ?? null,
    completed: scoreMap[ex.id] !== undefined,
    createdAt: ex.createdAt
  }));
};

const getStudentExerciseDetail = async (user, id) => {
  const exercise = await prisma.exercise.findFirst({
    where: { id: id, isDeleted: false },
    include: { class: true }
  });
  if (!exercise) {
    const err = new Error('Không tìm thấy bài tập.');
    err.status = 404;
    throw err;
  }

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { userId: user.id, classId: exercise.classId, isDeleted: false }
  });
  if (!enrollment) {
    const err = new Error('Bạn không có quyền truy cập bài tập này.');
    err.status = 403;
    throw err;
  }

  const config = exercise.gameConfig || {};

  // Nếu GV đã kích hoạt game (xem trước & giao bài), dùng đúng bản đã lưu — tránh sinh lại
  // ngẫu nhiên khác với bản GV đã duyệt, và đỡ tốn lượt gọi AI enrichment mỗi lần học sinh mở bài.
  if (config.games) {
    return {
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      classId: exercise.classId,
      className: exercise.class?.name || '—',
      games: config.games,
      counts: config.gamesMeta?.counts || config.counts
    };
  }

  const generated = await gamesService.generate({
    vocabText: config.vocabText || '',
    sentenceText: config.sentenceText || '',
    mcqText: config.mcqText || '',
    grade: 0
  });

  return {
    id: exercise.id,
    title: exercise.title,
    type: exercise.type,
    classId: exercise.classId,
    className: exercise.class?.name || '—',
    games: generated.games,
    counts: generated.meta.counts
  };
};

const submitExerciseScore = async (user, exerciseId, { score, wrongQuestions }) => {
  if (score === undefined || score === null) {
    const err = new Error('Thiếu điểm số.');
    err.status = 400;
    throw err;
  }

  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, isDeleted: false }
  });
  if (!exercise) {
    const err = new Error('Không tìm thấy bài tập.');
    err.status = 404;
    throw err;
  }

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { userId: user.id, classId: exercise.classId, isDeleted: false }
  });
  if (!enrollment) {
    const err = new Error('Bạn không có quyền nộp bài tập này.');
    err.status = 403;
    throw err;
  }

  const existingScore = await prisma.score.findFirst({
    where: { userId: user.id, exerciseId }
  });

  let savedScore;
  if (!existingScore) {
    savedScore = await prisma.score.create({
      data: {
        userId: user.id,
        exerciseId,
        score: Number(score),
        wrongQuestions: wrongQuestions || null
      }
    });
  } else {
    const updateData = {};
    if (Number(score) > existingScore.score) {
      updateData.score = Number(score);
    }
    if (wrongQuestions !== undefined) {
      updateData.wrongQuestions = wrongQuestions;
    }
    savedScore = await prisma.score.update({
      where: { id: existingScore.id },
      data: updateData
    });
  }

  const earnedStars = Number(score) >= 80 ? 3 : Number(score) >= 50 ? 2 : 1;
  const points = earnedStars * 10;

  let gamification = await prisma.gamification.findUnique({
    where: { userId: user.id }
  });

  const now = new Date();
  if (!gamification) {
    gamification = await prisma.gamification.create({
      data: {
        userId: user.id,
        stars: earnedStars,
        totalPoints: points,
        streak: 1,
        lastActive: now
      }
    });
  } else {
    let newStreak = gamification.streak;
    const lastActive = new Date(gamification.lastActive);

    if (now.toDateString() !== lastActive.toDateString()) {
      const diffTime = Math.abs(now - lastActive);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    gamification = await prisma.gamification.update({
      where: { id: gamification.id },
      data: {
        stars: gamification.stars + earnedStars,
        totalPoints: gamification.totalPoints + points,
        streak: newStreak,
        lastActive: now
      }
    });
  }

  return {
    success: true,
    score: savedScore.score,
    stars: earnedStars,
    points,
    streak: gamification.streak
  };
};

const generateSong = async (user, { prompt }) => {
  if (!prompt) {
    const err = new Error('Thiếu chủ đề hoặc từ vựng tạo bài hát.');
    err.status = 400;
    throw err;
  }

  const modelName = env.ocrModel || 'gemini-flash-latest';
  
  const response = await aiClient.chat.completions.create({
    model: modelName,
    messages: [
      {
        role: 'system',
        content: `You are an AI children's songwriter and English teacher. Create a simple, short, fun and catchy English learning song based on the user's topic or vocabulary list.
Ensure the language is suitable for young students (elementary to middle school).
Provide the output EXACTLY in JSON format with no markdown wrappers or extra text.
JSON Structure:
{
  "title": "Song Title",
  "verses": [
    {
      "heading": "Verse 1 / Chorus / Verse 2",
      "lines": [
        { "en": "English line here", "vi": "Vietnamese translation of the line" }
      ]
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Topic / vocabulary: ${prompt}`
      }
    ],
    response_format: { type: 'json_object' }
  });

  const contentText = response.choices[0].message.content;
  try {
    return JSON.parse(contentText);
  } catch (err) {
    console.error('Failed to parse AI song JSON:', contentText);
    return {
      title: 'Song about ' + prompt,
      verses: [
        {
          heading: 'Lời bài hát',
          lines: [
            { "en": "Let's learn English together!", "vi": "Hãy cùng học tiếng Anh nhé!" },
            { "en": "Sing a song for " + prompt, "vi": "Hát một bài hát về " + prompt }
          ]
        }
      ]
    };
  }
};

const generateSkillPractice = async (user, { skill, topic = 'daily life', studentInput = '', level = 'A2' }) => {
  const modelName = env.ocrModel || 'gemini-flash-latest';
  
  let systemPrompt = '';
  let userPrompt = '';

  if (skill === 'listening') {
    systemPrompt = `You are an expert English Listening AI Teacher. Generate an engaging listening practice exercise suitable for level ${level} students.
Return EXACTLY a JSON object with no markdown fences:
{
  "title": "Topic title",
  "script": "Full audio script/dialogue in English",
  "vietnameseTranslation": "Full Vietnamese translation",
  "questions": [
    {
      "id": 1,
      "question": "Question in English?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "answer": 0,
      "explanation": "Explanation in Vietnamese"
    }
  ]
}`;
    userPrompt = `Generate a listening exercise about: ${topic}`;
  } else if (skill === 'speaking') {
    systemPrompt = `You are an expert English Speaking & Pronunciation Evaluator AI.
Evaluate the student's spoken/recorded English response for topic: "${topic}".
Student Spoken Input: "${studentInput}"
Return EXACTLY a JSON object with no markdown fences:
{
  "overallScore": 92,
  "pronunciationScore": 90,
  "fluencyScore": 95,
  "accuracyScore": 90,
  "feedback": "Detailed encouraging feedback in Vietnamese from Mascot AI",
  "goodPoints": ["Highlight 1", "Highlight 2"],
  "improvements": ["Suggestion 1", "Suggestion 2"],
  "improvedPhrase": "Better native sentence way to say it"
}`;
    userPrompt = `Evaluate student speaking for topic "${topic}": ${studentInput}`;
  } else if (skill === 'reading') {
    systemPrompt = `You are an expert English Reading AI Teacher. Create a short, interesting reading passage for level ${level} students about "${topic}".
Return EXACTLY a JSON object with no markdown fences:
{
  "title": "Passage Title",
  "passage": "Full English passage text (100-150 words)",
  "vocabulary": [
    { "word": "example", "ipa": "/ɪɡˈzɑːm.pəl/", "meaning": "ví dụ" }
  ],
  "questions": [
    {
      "id": 1,
      "question": "Reading question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Giải thích chi tiết"
    }
  ]
}`;
    userPrompt = `Create a reading passage about: ${topic}`;
  } else if (skill === 'writing') {
    systemPrompt = `You are an expert English Writing AI Teacher & Examiner.
Evaluate the student's writing submission for topic: "${topic}".
Student Text: "${studentInput}"
Return EXACTLY a JSON object with no markdown fences:
{
  "score": 88,
  "grammarRating": "A",
  "vocabularyRating": "B+",
  "feedback": "Nhận xét chi tiết bằng tiếng Việt giúp học sinh tiến bộ",
  "grammarErrors": [
    { "original": "mistake word", "correction": "corrected word", "reason": "Lý do sửa" }
  ],
  "perfectRewrite": "A polished, natural native-like rewrite of the student paragraph."
}`;
    userPrompt = `Evaluate writing topic "${topic}": ${studentInput}`;
  }

  const modelsToTry = [env.ocrModel, ...env.ocrFallbackModels].filter(Boolean);
  let lastErr = null;

  for (const m of modelsToTry) {
    try {
      const response = await aiClient.chat.completions.create({
        model: m,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      });

      const contentText = response.choices[0].message.content;
      try {
        return JSON.parse(contentText);
      } catch (err) {
        // Handle case where AI wraps JSON in ```json ```
        const cleaned = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
      }
    } catch (err) {
      console.warn(`Model ${m} failed for skill practice, trying fallback...`, err.message);
      lastErr = err;
    }
  }

  throw lastErr || new Error('Không thể kết nối dịch vụ AI. Vui lòng thử lại sau!');
};

module.exports = { 
  getStudentScores,
  getStudentExercises,
  getStudentExerciseDetail,
  submitExerciseScore,
  generateSong,
  generateSkillPractice
};
