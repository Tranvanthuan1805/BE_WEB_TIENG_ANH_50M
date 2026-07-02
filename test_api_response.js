const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const gamificationService = require('./src/modules/gamification/gamification.service');

async function testAPIResponses() {
  try {
    console.log('=== Testing Gamification API Responses ===\n');
    
    // Get a real user who has gamification data
    const userWithPoints = await prisma.user.findFirst({
      where: {
        gamification: {
          totalPoints: { gt: 0 }
        }
      },
      include: {
        gamification: true
      }
    });
    
    if (!userWithPoints) {
      console.log('❌ No users with gamification points found');
      return;
    }
    
    console.log(`Testing with user: ${userWithPoints.name} (${userWithPoints.gamification.totalPoints} points)\n`);
    
    // Test leaderboard API
    console.log('1️⃣ Testing /api/gamification/leaderboard');
    const leaderboardData = await gamificationService.getLeaderboard(5, userWithPoints.id);
    console.log('Response:', JSON.stringify(leaderboardData, null, 2));
    console.log('');
    
    // Test progress API
    console.log('2️⃣ Testing /api/gamification/progress');
    const progressData = await gamificationService.getProgress(userWithPoints.id);
    console.log('Response:', JSON.stringify(progressData, null, 2));
    console.log('');
    
    // Verify the structure
    console.log('=== Verification ===');
    console.log(`✅ topUsers is array: ${Array.isArray(leaderboardData.topUsers)}`);
    console.log(`✅ topUsers count: ${leaderboardData.topUsers?.length || 0}`);
    console.log(`✅ currentUser exists: ${!!leaderboardData.currentUser}`);
    console.log(`✅ currentUser name: ${leaderboardData.currentUser?.name}`);
    console.log(`✅ currentUser points: ${leaderboardData.currentUser?.points}`);
    console.log(`✅ progress percent: ${progressData.percent}%`);
    console.log(`✅ weekdays is array: ${Array.isArray(progressData.weekdays)}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIResponses();
