const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const ex = await prisma.exercise.findFirst({
    where: { title: { contains: 'Unit 3' } }
  });
  console.log(JSON.stringify(ex.gameConfig, null, 2));
}
run();
