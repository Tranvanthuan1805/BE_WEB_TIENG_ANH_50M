const prisma = require('../../config/database');

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

  return {
    totalStars: gamification.stars,
    streak: gamification.streak,
    bySkill,
    history,
    weeklyTrend
  };
};

module.exports = { getStudentScores };
