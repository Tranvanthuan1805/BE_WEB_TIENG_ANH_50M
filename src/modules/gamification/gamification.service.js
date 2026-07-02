const prisma = require('../../config/database');

const getAll = async (user) => {
  return [];
};

const getLeaderboard = async (limit = 10, currentUserId) => {
  // Tìm classId của user hiện tại
  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId: currentUserId, isDeleted: false },
    orderBy: { joinedAt: 'desc' },
    select: { classId: true }
  });

  let classUserIds = [];
  if (enrollments.length > 0) {
    const classId = enrollments[0].classId;
    const classmates = await prisma.classEnrollment.findMany({
      where: { classId: classId, isDeleted: false },
      select: { userId: true }
    });
    classUserIds = classmates.map(c => c.userId);
  } else {
    // Nếu chưa vào lớp nào thì chỉ hiện mình
    classUserIds = [currentUserId];
  }

  // Lấy tất cả user trong lớp cùng với điểm gamification
  const usersWithPoints = await prisma.user.findMany({
    where: { id: { in: classUserIds } },
    select: {
      id: true,
      name: true,
      gamification: { select: { totalPoints: true } }
    }
  });

  // Gắn điểm 0 nếu chưa có record, sau đó sort giảm dần
  const allUsersSorted = usersWithPoints.map(u => ({
    userId: u.id,
    name: u.name,
    points: u.gamification?.totalPoints || 0
  })).sort((a, b) => b.points - a.points);

  // Lấy top limit
  const formattedTopUsers = allUsersSorted.slice(0, limit).map((u, index) => ({
    rank: index + 1,
    name: u.name || 'Unknown',
    points: u.points,
    avatar: '/assets/mascot-face-avatar.png'
  }));

  // Lấy thứ hạng của user hiện tại
  let currentUserData = null;
  if (currentUserId) {
    const currentIndex = allUsersSorted.findIndex(u => u.userId === currentUserId);
    if (currentIndex !== -1) {
      const u = allUsersSorted[currentIndex];
      currentUserData = {
        rank: currentIndex + 1,
        name: u.name || 'Unknown',
        points: u.points,
        avatar: '/assets/mascot-face-avatar.png'
      };
    }
  }

  return { topUsers: formattedTopUsers, currentUser: currentUserData };
};

const getProgress = async (currentUserId) => {
  const weeklyGoal = 16; // Fixed goal for now
  
  // Calculate start of current week (Monday)
  const now = new Date();
  const day = now.getDay() || 7; 
  if (day !== 1) now.setHours(-24 * (day - 1));
  now.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  
  // Fetch scores (exercises) created this week
  const scoresThisWeek = await prisma.score.findMany({
    where: {
      userId: currentUserId,
      completedAt: { gte: startOfWeek }
    }
  });
  
  // Also fetch speaking results this week
  const speakingResultsThisWeek = await prisma.speakingResult.findMany({
    where: {
      userId: currentUserId,
      createdAt: { gte: startOfWeek }
    }
  });

  // Fetch vocabulary progress this week (since they don't always create a Score)
  const vocabsThisWeek = await prisma.userVocabularyProgress.findMany({
    where: {
      userId: currentUserId,
      updatedAt: { gte: startOfWeek }
    }
  });

  // Assume 1 task = 10 vocab words
  const vocabTasks = Math.floor(vocabsThisWeek.length / 10) || (vocabsThisWeek.length > 0 ? 1 : 0);

  const completedTasks = scoresThisWeek.length + speakingResultsThisWeek.length + vocabTasks;
  const progressPercent = Math.min(Math.round((completedTasks / weeklyGoal) * 100), 100);

  const activeDays = new Set();
  scoresThisWeek.forEach(score => {
    const d = new Date(score.completedAt).getDay() || 7;
    activeDays.add(d);
  });
  speakingResultsThisWeek.forEach(result => {
    const d = new Date(result.createdAt).getDay() || 7;
    activeDays.add(d);
  });
  vocabsThisWeek.forEach(vocab => {
    const d = new Date(vocab.updatedAt).getDay() || 7;
    activeDays.add(d);
  });

  const currentDayNum = new Date().getDay() || 7;

  const weekdays = [
    { name: 'T2', id: 1 },
    { name: 'T3', id: 2 },
    { name: 'T4', id: 3 },
    { name: 'T5', id: 4 },
    { name: 'T6', id: 5 },
    { name: 'T7', id: 6 },
    { name: 'CN', id: 7 }
  ].map(dayObj => {
    let status = 'empty';
    if (activeDays.has(dayObj.id)) {
      status = 'checked';
    } else if (dayObj.id === currentDayNum) {
      status = 'active';
    }
    return { name: dayObj.name, status };
  });

  return {
    percent: progressPercent,
    tasks: completedTasks,
    goal: weeklyGoal,
    weekdays
  };
};

module.exports = { getAll, getLeaderboard, getProgress };
