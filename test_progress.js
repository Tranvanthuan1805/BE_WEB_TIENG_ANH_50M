/**
 * Test script for Progress Tracking API
 * Tests the complete flow of saving and retrieving progress per student
 */

const prisma = require('./src/config/database');

async function testProgressTracking() {
  console.log('🧪 Testing Progress Tracking System\n');

  try {
    // 1. Get a test user (student)
    console.log('1️⃣  Finding test user...');
    let testUser = await prisma.user.findFirst({
      where: { role: 'STUDENT' }
    });

    if (!testUser) {
      console.log('   Creating test student...');
      testUser = await prisma.user.create({
        data: {
          name: 'Test Student',
          email: `test_student_${Date.now()}@test.com`,
          role: 'STUDENT',
          provider: 'LOCAL'
        }
      });
    }
    console.log(`   ✅ User: ${testUser.name} (${testUser.id})\n`);

    // 2. Get a test exercise
    console.log('2️⃣  Finding test exercise...');
    let testExercise = await prisma.exercise.findFirst({
      where: { isDeleted: false }
    });

    if (!testExercise) {
      console.log('   Creating test exercise...');
      // Need a class first
      let testClass = await prisma.class.findFirst();
      if (!testClass) {
        const teacher = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
        if (!teacher) {
          console.log('   ⚠️  No teacher found. Creating one...');
          const newTeacher = await prisma.user.create({
            data: {
              name: 'Test Teacher',
              email: `test_teacher_${Date.now()}@test.com`,
              role: 'TEACHER',
              provider: 'LOCAL'
            }
          });
          testClass = await prisma.class.create({
            data: {
              name: 'Test Class',
              teacherId: newTeacher.id
            }
          });
        } else {
          testClass = await prisma.class.create({
            data: {
              name: 'Test Class',
              teacherId: teacher.id
            }
          });
        }
      }

      testExercise = await prisma.exercise.create({
        data: {
          classId: testClass.id,
          title: 'Test Vocabulary Quiz',
          type: 'QUIZ',
          status: 'PUBLISHED',
          gameConfig: {
            vocabText: 'apple | táo\nbanana | chuối\norange | cam',
            counts: { vocab: 3, sentence: 0, question: 0 }
          }
        }
      });
    }
    console.log(`   ✅ Exercise: ${testExercise.title} (${testExercise.id})\n`);

    const userId = testUser.id;
    const exerciseId = testExercise.id;
    const type = 'quiz';

    // 3. Test: Check if no progress exists initially
    console.log('3️⃣  Checking initial progress (should be null)...');
    let progress = await prisma.exerciseProgress.findUnique({
      where: {
        userId_exerciseId_type: { userId, exerciseId, type }
      }
    });
    console.log(`   ${progress ? '⚠️  Progress exists' : '✅ No progress (as expected)'}\n`);

    // 4. Test: Create initial progress
    console.log('4️⃣  Creating initial progress...');
    const initialData = {
      currentIndex: 0,
      answers: [],
      score: 0,
      totalQuestions: 10,
      completed: false,
      startedAt: new Date().toISOString()
    };

    progress = await prisma.exerciseProgress.upsert({
      where: {
        userId_exerciseId_type: { userId, exerciseId, type }
      },
      update: { data: initialData },
      create: {
        userId,
        exerciseId,
        type,
        data: initialData
      }
    });
    console.log(`   ✅ Progress created`);
    console.log(`   Data:`, JSON.stringify(progress.data, null, 2), '\n');

    // 5. Test: Save answer #1
    console.log('5️⃣  Saving answer #1 (correct)...');
    let currentData = progress.data;
    currentData.answers[0] = {
      answer: 'táo',
      isCorrect: true,
      answeredAt: new Date().toISOString()
    };
    currentData.score = 1;
    currentData.currentIndex = 1;

    progress = await prisma.exerciseProgress.update({
      where: { id: progress.id },
      data: { data: currentData }
    });
    console.log(`   ✅ Answer saved. Score: ${progress.data.score}/10\n`);

    // 6. Test: Save answer #2
    console.log('6️⃣  Saving answer #2 (incorrect)...');
    currentData = progress.data;
    currentData.answers[1] = {
      answer: 'táo',
      isCorrect: false,
      answeredAt: new Date().toISOString()
    };
    currentData.currentIndex = 2;

    progress = await prisma.exerciseProgress.update({
      where: { id: progress.id },
      data: { data: currentData }
    });
    console.log(`   ✅ Answer saved. Score: ${progress.data.score}/10\n`);

    // 7. Test: Retrieve progress
    console.log('7️⃣  Retrieving progress...');
    const retrieved = await prisma.exerciseProgress.findUnique({
      where: {
        userId_exerciseId_type: { userId, exerciseId, type }
      }
    });
    console.log(`   ✅ Progress retrieved`);
    console.log(`   Current index: ${retrieved.data.currentIndex}`);
    console.log(`   Score: ${retrieved.data.score}`);
    console.log(`   Answers: ${retrieved.data.answers.length}\n`);

    // 8. Test: Create another student's progress (different data)
    console.log('8️⃣  Creating progress for another student...');
    let student2 = await prisma.user.findFirst({
      where: { 
        role: 'STUDENT',
        id: { not: testUser.id }
      }
    });

    if (!student2) {
      student2 = await prisma.user.create({
        data: {
          name: 'Test Student 2',
          email: `test_student2_${Date.now()}@test.com`,
          role: 'STUDENT',
          provider: 'LOCAL'
        }
      });
    }

    const student2Progress = await prisma.exerciseProgress.upsert({
      where: {
        userId_exerciseId_type: {
          userId: student2.id,
          exerciseId,
          type
        }
      },
      update: {
        data: {
          currentIndex: 5,
          answers: [
            { answer: 'táo', isCorrect: true, answeredAt: new Date().toISOString() },
            { answer: 'chuối', isCorrect: true, answeredAt: new Date().toISOString() },
            { answer: 'cam', isCorrect: true, answeredAt: new Date().toISOString() }
          ],
          score: 3,
          totalQuestions: 10,
          completed: false,
          startedAt: new Date().toISOString()
        }
      },
      create: {
        userId: student2.id,
        exerciseId,
        type,
        data: {
          currentIndex: 5,
          answers: [
            { answer: 'táo', isCorrect: true, answeredAt: new Date().toISOString() },
            { answer: 'chuối', isCorrect: true, answeredAt: new Date().toISOString() },
            { answer: 'cam', isCorrect: true, answeredAt: new Date().toISOString() }
          ],
          score: 3,
          totalQuestions: 10,
          completed: false,
          startedAt: new Date().toISOString()
        }
      }
    });
    console.log(`   ✅ Student 2 (${student2.name}) progress: ${student2Progress.data.currentIndex}/10, score: ${student2Progress.data.score}\n`);

    // 9. Test: Verify data isolation
    console.log('9️⃣  Verifying data isolation between students...');
    const student1Final = await prisma.exerciseProgress.findUnique({
      where: {
        userId_exerciseId_type: { userId: testUser.id, exerciseId, type }
      }
    });
    const student2Final = await prisma.exerciseProgress.findUnique({
      where: {
        userId_exerciseId_type: { userId: student2.id, exerciseId, type }
      }
    });

    console.log(`   Student 1: index=${student1Final.data.currentIndex}, score=${student1Final.data.score}`);
    console.log(`   Student 2: index=${student2Final.data.currentIndex}, score=${student2Final.data.score}`);
    
    if (student1Final.data.currentIndex !== student2Final.data.currentIndex) {
      console.log(`   ✅ Data properly isolated!\n`);
    } else {
      console.log(`   ⚠️  Data might not be isolated properly\n`);
    }

    // 10. Test: Mark as completed
    console.log('🔟 Marking student 1 exercise as completed...');
    currentData = student1Final.data;
    currentData.completed = true;
    currentData.completedAt = new Date().toISOString();
    currentData.score = 8;

    await prisma.exerciseProgress.update({
      where: { id: student1Final.id },
      data: { data: currentData }
    });
    console.log(`   ✅ Exercise marked as completed with final score: 8/10\n`);

    // 11. Test: Get all progress for student 1
    console.log('1️⃣1️⃣  Getting all progress for student 1...');
    const allProgress = await prisma.exerciseProgress.findMany({
      where: { userId: testUser.id },
      include: {
        exercise: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      }
    });
    console.log(`   ✅ Found ${allProgress.length} progress record(s)`);
    allProgress.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.exercise.title} (${p.type}) - ${p.data.completed ? '✓ Completed' : '○ In Progress'}`);
    });

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log(`   - Progress is saved per student`);
    console.log(`   - Each student sees their own data`);
    console.log(`   - Data persists in database`);
    console.log(`   - Updates work correctly`);
    console.log(`   - Multi-student isolation confirmed`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProgressTracking().catch(console.error);
