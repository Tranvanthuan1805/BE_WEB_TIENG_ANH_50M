const prisma = require('../../config/database');

const getAll = async (user) => {
  return await prisma.score.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: 'desc' },
  });
};

const saveScore = async (user, body) => {
  const { exerciseId, score } = body;
  
  if (!exerciseId || score === undefined) {
    const error = new Error('Thiếu exerciseId hoặc score');
    error.status = 400;
    throw error;
  }

  // Lấy hoặc tạo Gamification profile
  let gamification = await prisma.gamification.findUnique({
    where: { userId: user.id }
  });

  if (!gamification) {
    gamification = await prisma.gamification.create({
      data: { userId: user.id, totalPoints: 0 }
    });
  }

  // Tìm score hiện tại của bài tập này
  const existingScore = await prisma.score.findFirst({
    where: { userId: user.id, exerciseId }
  });

  let newScoreObj;
  
  if (existingScore) {
    // Nếu điểm mới cao hơn điểm cũ, cập nhật
    if (score > existingScore.score) {
      const pointsDiff = score - existingScore.score;
      newScoreObj = await prisma.score.update({
        where: { id: existingScore.id },
        data: { score, completedAt: new Date() }
      });
      // Cộng phần điểm chênh lệch vào tổng điểm
      await prisma.gamification.update({
        where: { userId: user.id },
        data: { totalPoints: { increment: pointsDiff } }
      });
    } else {
      newScoreObj = existingScore;
    }
  } else {
    // Chưa có điểm bài này
    newScoreObj = await prisma.score.create({
      data: {
        userId: user.id,
        exerciseId,
        score
      }
    });
    // Cộng điểm mới vào tổng điểm
    await prisma.gamification.update({
      where: { userId: user.id },
      data: { totalPoints: { increment: score } }
    });
  }

  return newScoreObj;
};

const getExerciseLeaderboard = async (exerciseId, user) => {
  // Lấy danh sách điểm của bài tập này
  const allScores = await prisma.score.findMany({
    where: { exerciseId },
    orderBy: { score: 'desc' },
    include: {
      user: {
        select: {
          name: true
        }
      }
    }
  });

  // Lấy sĩ số lớp học thông qua bài tập
  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: { classId: true }
  });

  let classSize = 0;
  if (exercise) {
    classSize = await prisma.classEnrollment.count({
      where: { classId: exercise.classId, isDeleted: false }
    });
  }

  // Định dạng lại kết quả
  let currentUserRank = null;
  const formattedScores = allScores.map((s, index) => {
    const rank = index + 1;
    const isCurrentUser = s.userId === user.id;
    const formatted = {
      rank,
      name: s.user?.name || 'Unknown',
      score: s.score,
      avatar: '/assets/mascot-face-avatar.png',
      isCurrentUser
    };
    if (isCurrentUser) {
      currentUserRank = formatted;
    }
    return formatted;
  });

  return {
    leaderboard: formattedScores,
    currentUser: currentUserRank,
    classSize,
    totalSubmitted: allScores.length
  };
};

module.exports = { getAll, saveScore, getExerciseLeaderboard };
