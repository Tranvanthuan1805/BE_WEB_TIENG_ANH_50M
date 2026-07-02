const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGamificationData() {
  try {
    console.log('=== Testing Gamification Data ===\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });
    console.log(`Found ${users.length} users in database:`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    console.log('');
    
    if (users.length === 0) {
      console.log('No users found. Please create some users first.');
      return;
    }
    
    // Check gamification records
    const gamificationRecords = await prisma.gamification.findMany({
      include: { user: { select: { name: true, email: true } } }
    });
    console.log(`Found ${gamificationRecords.length} gamification records:`);
    gamificationRecords.forEach(g => {
      console.log(`  - ${g.user.name}: ${g.totalPoints} points, ${g.stars} stars`);
    });
    console.log('');
    
    // If no gamification records, create default ones
    if (gamificationRecords.length === 0) {
      console.log('Creating default gamification records for all users...');
      for (const user of users) {
        await prisma.gamification.create({
          data: {
            userId: user.id,
            totalPoints: 0,
            stars: 0,
            streak: 0
          }
        });
        console.log(`  - Created gamification record for ${user.name}`);
      }
      console.log('');
    }
    
    // Test leaderboard API logic
    console.log('=== Testing Leaderboard Logic ===');
    const testUserId = users[0].id;
    console.log(`Testing with user: ${users[0].name}\n`);
    
    // Find user's class
    const enrollments = await prisma.classEnrollment.findMany({
      where: { userId: testUserId, isDeleted: false },
      orderBy: { joinedAt: 'desc' },
      include: { class: { select: { name: true } } }
    });
    
    if (enrollments.length > 0) {
      console.log(`User is enrolled in ${enrollments.length} class(es):`);
      enrollments.forEach(e => console.log(`  - ${e.class.name}`));
      
      const classId = enrollments[0].classId;
      const classmates = await prisma.classEnrollment.findMany({
        where: { classId: classId, isDeleted: false },
        include: { user: { select: { name: true } } }
      });
      
      console.log(`\nClassmates in ${enrollments[0].class.name}:`);
      classmates.forEach(c => console.log(`  - ${c.user.name}`));
      
      // Get their gamification data
      const classUserIds = classmates.map(c => c.userId);
      const usersWithPoints = await prisma.user.findMany({
        where: { id: { in: classUserIds } },
        select: {
          id: true,
          name: true,
          gamification: { select: { totalPoints: true } }
        }
      });
      
      console.log('\nLeaderboard:');
      const sorted = usersWithPoints
        .map(u => ({
          name: u.name,
          points: u.gamification?.totalPoints || 0
        }))
        .sort((a, b) => b.points - a.points);
      
      sorted.forEach((u, idx) => {
        console.log(`  ${idx + 1}. ${u.name} - ${u.points} points`);
      });
    } else {
      console.log('User is not enrolled in any class.');
    }
    
    // Test progress API logic
    console.log('\n=== Testing Progress Logic ===');
    const now = new Date();
    const day = now.getDay() || 7;
    if (day !== 1) now.setHours(-24 * (day - 1));
    now.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    
    console.log(`Week starts at: ${startOfWeek.toISOString()}\n`);
    
    // Check scores this week
    const scoresThisWeek = await prisma.score.findMany({
      where: {
        userId: testUserId,
        completedAt: { gte: startOfWeek }
      }
    });
    console.log(`Scores this week: ${scoresThisWeek.length}`);
    
    // Check speaking results this week
    const speakingThisWeek = await prisma.speakingResult.findMany({
      where: {
        userId: testUserId,
        createdAt: { gte: startOfWeek }
      }
    });
    console.log(`Speaking results this week: ${speakingThisWeek.length}`);
    
    // Check vocab progress this week
    const vocabThisWeek = await prisma.userVocabularyProgress.findMany({
      where: {
        userId: testUserId,
        updatedAt: { gte: startOfWeek }
      }
    });
    console.log(`Vocabulary progress this week: ${vocabThisWeek.length}`);
    
    const vocabTasks = Math.floor(vocabThisWeek.length / 10) || (vocabThisWeek.length > 0 ? 1 : 0);
    const totalTasks = scoresThisWeek.length + speakingThisWeek.length + vocabTasks;
    const weeklyGoal = 16;
    const progressPercent = Math.min(Math.round((totalTasks / weeklyGoal) * 100), 100);
    
    console.log(`\nProgress: ${totalTasks}/${weeklyGoal} tasks (${progressPercent}%)`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGamificationData();
