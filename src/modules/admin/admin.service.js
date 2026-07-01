const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

// Log helper to write to AuditLog table
const writeAuditLog = async (userId, action, target) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        target
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};

// ─── USER MANAGEMENT ───

const getUsers = async ({ page = 1, limit = 20, search = '', role }) => {
  const skip = (page - 1) * limit;

  const where = {
    isDeleted: false
  };

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentCode: true,
        phone: true,
        avatarUrl: true,
        isDeleted: true,
        createdAt: true
      }
    })
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

const createUser = async (adminId, { name, email, password, role, classId }) => {
  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  if (existing) {
    const err = new Error('Email này đã được sử dụng.');
    err.status = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Generate a mock student code if role is student
  let studentCode = null;
  if (role === 'STUDENT') {
    studentCode = 'HS' + Math.floor(100000 + Math.random() * 900000);
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'STUDENT',
      studentCode,
      provider: 'LOCAL'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentCode: true,
      createdAt: true
    }
  });

  // Assign user to class if classId is provided and role is STUDENT
  if (classId && role === 'STUDENT') {
    await prisma.classEnrollment.create({
      data: {
        userId: user.id,
        classId
      }
    });
  }

  await writeAuditLog(adminId, 'CREATE_USER', `User ID: ${user.id}, Role: ${user.role}`);
  return user;
};

const updateUser = async (adminId, userId, { name, email, role, status, classId }) => {
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase();
  if (role) updateData.role = role;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  // Handle class enrollment updates if student
  if (classId && user.role === 'STUDENT') {
    // Delete existing enrollments first
    await prisma.classEnrollment.deleteMany({
      where: { userId }
    });
    // Create new enrollment
    await prisma.classEnrollment.create({
      data: {
        userId,
        classId
      }
    });
  }

  await writeAuditLog(adminId, 'UPDATE_USER', `User ID: ${userId}`);
  return user;
};

const deleteUser = async (adminId, userId) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });

  await writeAuditLog(adminId, 'DELETE_USER', `User ID: ${userId}`);
  return { success: true, message: 'Đã xóa người dùng thành công (soft delete).' };
};

const resetPassword = async (adminId, userId, { newPassword }) => {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error('Mật khẩu mới phải từ 6 ký tự.');
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  await writeAuditLog(adminId, 'RESET_PASSWORD', `User ID: ${userId}`);
  return { success: true, message: 'Đặt lại mật khẩu thành công.' };
};

// ─── CLASS MANAGEMENT ───

const getClasses = async () => {
  return prisma.class.findMany({
    where: { isDeleted: false },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      enrollments: {
        where: { isDeleted: false },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });
};

const createClass = async (adminId, { name, classCode, description, teacherId }) => {
  if (!name || !teacherId) {
    const err = new Error('Tên lớp và giáo viên phụ trách là bắt buộc.');
    err.status = 400;
    throw err;
  }

  const cls = await prisma.class.create({
    data: {
      name,
      classCode: classCode || 'CLASS_' + Math.floor(1000 + Math.random() * 9000),
      description: description || '',
      teacherId
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  await writeAuditLog(adminId, 'CREATE_CLASS', `Class ID: ${cls.id}, Name: ${cls.name}`);
  return cls;
};

const deleteClass = async (adminId, classId) => {
  // Check if class has active published exercises
  const activeExercises = await prisma.exercise.count({
    where: {
      classId,
      status: 'PUBLISHED',
      isDeleted: false
    }
  });

  if (activeExercises > 0) {
    const err = new Error('Không thể xóa lớp học vì vẫn còn bài tập đang hoạt động.');
    err.status = 400;
    throw err;
  }

  await prisma.class.update({
    where: { id: classId },
    data: {
      isDeleted: true,
      deletedAt: new Date()
    }
  });

  await writeAuditLog(adminId, 'DELETE_CLASS', `Class ID: ${classId}`);
  return { success: true, message: 'Đã xóa lớp học thành công.' };
};

const getAuditLogs = async () => {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    },
    take: 100 // Limit to top 100 logs
  });
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
  getClasses,
  createClass,
  deleteClass,
  getAuditLogs
};
