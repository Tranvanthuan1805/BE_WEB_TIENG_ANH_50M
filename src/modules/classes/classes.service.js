const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  const random = crypto.randomBytes(5).toString('hex');
  const counter = crypto.randomBytes(3).toString('hex');
  return timestamp + random + counter;
}

function getInitials(fullName) {
  if (!fullName) return '';
  const normalized = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
    
  return normalized
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

const getAll = async (user) => {
  if (user.role === 'TEACHER') {
    return prisma.class.findMany({
      where: { teacherId: user.id, isDeleted: false },
      include: {
        _count: {
          select: { enrollments: { where: { isDeleted: false } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  const enrollments = await prisma.classEnrollment.findMany({
    where: { userId: user.id, isDeleted: false },
    include: { class: true }
  });
  return enrollments
    .map(e => e.class)
    .filter(c => c && !c.isDeleted);
};

const createClass = async (teacher, body) => {
  const { name, grade, description, studentsText, passwordType, passwordVal, basePassword, confirmDuplicate } = body;

  // 0. Check if class with the same name already exists for this teacher
  if (!confirmDuplicate) {
    const existingClass = await prisma.class.findFirst({
      where: {
        teacherId: teacher.id,
        name: name.trim(),
        isDeleted: false,
      },
    });

    if (existingClass) {
      return {
        isDuplicateWarning: true,
        message: `Lớp học "${name}" đã tồn tại trong danh mục của bạn. Bạn có chắc chắn muốn tạo thêm một lớp học trùng tên?`,
      };
    }
  }

  // 1. Generate unique classCode
  let classCode;
  let attempts = 0;
  while (attempts < 10) {
    const totalClasses = await prisma.class.count();
    const tempCode = `TAS${String(totalClasses + 1 + attempts).padStart(2, '0')}`;
    const exists = await prisma.class.findFirst({ where: { classCode: tempCode } });
    if (!exists) {
      classCode = tempCode;
      break;
    }
    attempts++;
  }
  if (!classCode) {
    classCode = `TAS${Math.floor(10 + Math.random() * 90)}`;
  }

  // 2. Parse students list
  const rawNames = studentsText
    ? studentsText
        .split(/[\n,;\-]+/)
        .map(name => name.trim())
        .filter(Boolean)
    : [];

  // 3. Pre-generate passwords hash
  let sharedPasswordHash = null;
  if (passwordType === 'SAME' && passwordVal) {
    sharedPasswordHash = await bcrypt.hash(passwordVal, 10);
  }

  let hashedPasswords = [];
  if (passwordType === 'SEQUENCE' && basePassword) {
    hashedPasswords = await Promise.all(
      rawNames.map((_, i) => bcrypt.hash(`${basePassword}${i + 1}`, 10))
    );
  }

  // 4. Pre-generate class ID
  const classId = generateObjectId();

  const studentsData = [];
  const enrollmentsData = [];
  const studentAccounts = [];

  for (let i = 0; i < rawNames.length; i++) {
    const name = rawNames[i];
    const orderIndex = i + 1;
    const initials = getInitials(name);
    const studentCode = `${classCode}${initials}${orderIndex}`;
    const userId = generateObjectId();

    let passwordHash;
    let plainPassword;
    if (passwordType === 'SAME') {
      passwordHash = sharedPasswordHash;
      plainPassword = passwordVal;
    } else {
      passwordHash = hashedPasswords[i];
      plainPassword = `${basePassword}${orderIndex}`;
    }

    studentsData.push({
      id: userId,
      name,
      studentCode,
      email: `${studentCode.toLowerCase()}@smarthomework.edu.vn`,
      password: passwordHash,
      role: 'STUDENT',
      provider: 'LOCAL',
      version: 0,
      isDeleted: false,
    });

    enrollmentsData.push({
      id: generateObjectId(),
      classId: classId,
      userId: userId,
      isDeleted: false,
    });

    studentAccounts.push({
      name,
      studentCode,
      plainPassword,
    });
  }

  // 5. Execute creation
  const newClass = await prisma.class.create({
    data: {
      id: classId,
      name,
      classCode,
      description,
      teacherId: teacher.id,
    }
  });

  if (studentsData.length > 0) {
    await prisma.$transaction([
      prisma.user.createMany({ data: studentsData }),
      prisma.classEnrollment.createMany({ data: enrollmentsData })
    ]);
  }

  // 6. Generate CSV content with UTF-8 BOM and explicit Excel delimiter directive
  let csvContent = '\uFEFF';
  csvContent += 'sep=;\n';
  csvContent += 'STT;Họ và Tên;Mã Học Sinh;Mật Khẩu Ban Đầu\n';
  studentAccounts.forEach((student, index) => {
    const escapedName = student.name.includes(';') ? `"${student.name}"` : student.name;
    csvContent += `${index + 1};${escapedName};${student.studentCode};${student.plainPassword}\n`;
  });

  return {
    class: newClass,
    students: studentAccounts,
    csvContent,
  };
};

// ── Lấy lớp do GV sở hữu (chặn truy cập lớp người khác) ──
const getOwnedClass = async (user, classId) => {
  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId: user.id, isDeleted: false },
  });
  if (!cls) {
    const e = new Error('Không tìm thấy lớp học hoặc bạn không có quyền truy cập.');
    e.status = 404;
    throw e;
  }
  return cls;
};

// ── Chi tiết lớp + danh sách học sinh (chưa bị xóa mềm) ──
const getClassDetail = async (user, classId) => {
  const cls = await getOwnedClass(user, classId);
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId, isDeleted: false },
    include: { user: true },
    orderBy: { joinedAt: 'asc' },
  });
  const students = enrollments
    .filter((e) => e.user && !e.user.isDeleted)
    .map((e) => ({
      id: e.user.id,
      enrollmentId: e.id,
      name: e.user.name,
      studentCode: e.user.studentCode,
      email: e.user.email,
    }));
  return {
    class: { id: cls.id, name: cls.name, classCode: cls.classCode, description: cls.description },
    students,
  };
};

// ── Sửa thông tin lớp (tên / mô tả) ──
const updateClass = async (user, classId, body) => {
  await getOwnedClass(user, classId);
  const data = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim();
  if (Object.keys(data).length === 0) {
    const e = new Error('Không có thông tin nào để cập nhật.');
    e.status = 400;
    throw e;
  }
  const c = await prisma.class.update({ where: { id: classId }, data });
  return { class: { id: c.id, name: c.name, classCode: c.classCode, description: c.description } };
};

// ── Thêm 1 học sinh vào lớp (tạo tài khoản + ghi danh) ──
const addStudent = async (user, classId, body) => {
  const cls = await getOwnedClass(user, classId);
  const name = String(body.name || '').trim();
  if (!name) {
    const e = new Error('Tên học sinh không được để trống.');
    e.status = 400;
    throw e;
  }
  const plainPassword = body.password && String(body.password).length >= 4 ? String(body.password) : '123456';

  // STT tăng dần theo TỔNG ghi danh từng có (kể cả đã xóa) → mã HS không trùng.
  const total = await prisma.classEnrollment.count({ where: { classId } });
  const orderIndex = total + 1;
  const initials = getInitials(name);
  const studentCode = `${cls.classCode || 'TAS'}${initials}${orderIndex}`;
  const email = `${studentCode.toLowerCase()}@smarthomework.edu.vn`;
  const userId = generateObjectId();
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.create({
    data: { id: userId, name, studentCode, email, password: passwordHash, role: 'STUDENT', provider: 'LOCAL', version: 0, isDeleted: false },
  });
  await prisma.classEnrollment.create({
    data: { id: generateObjectId(), classId, userId, isDeleted: false },
  });

  return { student: { id: userId, name, studentCode, email, plainPassword } };
};

// ── Sửa học sinh (tên / đặt lại mật khẩu) ──
const updateStudent = async (user, classId, studentId, body) => {
  await getOwnedClass(user, classId);
  const enr = await prisma.classEnrollment.findFirst({ where: { classId, userId: studentId, isDeleted: false } });
  if (!enr) {
    const e = new Error('Học sinh không thuộc lớp này.');
    e.status = 404;
    throw e;
  }
  const data = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  let plainPassword;
  if (body.password && String(body.password).length >= 4) {
    plainPassword = String(body.password);
    data.password = await bcrypt.hash(plainPassword, 10);
  }
  if (Object.keys(data).length === 0) {
    const e = new Error('Không có thông tin nào để cập nhật.');
    e.status = 400;
    throw e;
  }
  const u = await prisma.user.update({ where: { id: studentId }, data });
  return { student: { id: u.id, name: u.name, studentCode: u.studentCode, email: u.email }, plainPassword };
};

// ── Xóa MỀM học sinh khỏi lớp (đánh dấu isDeleted, không xóa thật) ──
const removeStudent = async (user, classId, studentId) => {
  await getOwnedClass(user, classId);
  const enr = await prisma.classEnrollment.findFirst({ where: { classId, userId: studentId, isDeleted: false } });
  if (!enr) {
    const e = new Error('Học sinh không thuộc lớp này.');
    e.status = 404;
    throw e;
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.classEnrollment.update({ where: { id: enr.id }, data: { isDeleted: true, deletedAt: now } }),
    prisma.user.update({ where: { id: studentId }, data: { isDeleted: true, deletedAt: now } }),
  ]);
  return { ok: true };
};

module.exports = {
  getAll,
  createClass,
  getClassDetail,
  updateClass,
  addStudent,
  updateStudent,
  removeStudent,
};

