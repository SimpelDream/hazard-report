const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const username = 'admin';
    const password = 'admin123';

    // 检查是否已存在管理员账户
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    });

    if (existingAdmin) {
      console.log('管理员账户已存在');
      return;
    }

    // 创建新管理员账户
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword
      }
    });

    console.log('管理员账户创建成功:', admin.username);
  } catch (error) {
    console.error('创建管理员账户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 