const prisma = require('../../config/database');

const getLeaderboard = async ({ classId, period }) => {
  const filterDate = new Date();
  if (period === 'week') {
    filterDate.setDate(filterDate.getDate() - 7);
  } else if (period === 'month') {
    filterDate.setDate(filterDate.getDate() - 30);
  }

  // 1. Find users in the class (if classId is provided)
  let studentIds = null;
  if (classId) {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId, isDeleted: false },
      select: { userId: true }
    });
    studentIds = enrollments.map(e => e.userId);
  }

  // 2. Fetch students
  const userQuery = {
    role: 'STUDENT',
    isDeleted: false,
  };
  if (studentIds) {
    userQuery.id = { in: studentIds };
  }

  const students = await prisma.user.findMany({
    where: userQuery,
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      gamification: true,
    }
  });

  let rankings = [];

  // 3. Aggregate stars based on period
  if (period === 'all') {
    rankings = students.map(s => ({
      userId: s.id,
      name: s.name,
      avatar: s.avatarUrl || '/assets/mascot-face-avatar.png',
      totalStars: s.gamification?.stars || 0,
      change: 0 // Mock rank change
    }));
  } else {
    // For week or month, calculate stars based on scores in that period
    const scores = await prisma.score.findMany({
      where: {
        userId: { in: students.map(s => s.id) },
        completedAt: { gte: filterDate }
      },
      select: {
        userId: true,
        score: true
      }
    });

    // Group scores by userId
    const userStarsMap = {};
    scores.forEach(sc => {
      // Calculate stars earned: score/20 (e.g. 100 score -> 5 stars)
      const starsEarned = Math.round(sc.score / 20) || 1;
      userStarsMap[sc.userId] = (userStarsMap[sc.userId] || 0) + starsEarned;
    });

    rankings = students.map(s => ({
      userId: s.id,
      name: s.name,
      avatar: s.avatarUrl || '/assets/mascot-face-avatar.png',
      totalStars: userStarsMap[s.id] || 0,
      change: Math.floor(Math.random() * 3) - 1 // Random change for mock: -1, 0, +1
    }));
  }

  // 4. Sort and assign ranks
  rankings.sort((a, b) => b.totalStars - a.totalStars);
  
  return rankings.map((item, idx) => ({
    rank: idx + 1,
    ...item
  })).slice(0, 10); // Top 10
};

module.exports = { getLeaderboard };
