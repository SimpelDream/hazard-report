const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function createAdmin() {
    try {
        const username = 'admin';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await prisma.admin.create({
            data: {
                username,
                password: hashedPassword
            }
        });

        console.log('管理员账号创建成功:');
        console.log('用户名:', admin.username);
        console.log('密码:', password);
    } catch (error) {
        console.error('创建管理员账号失败:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin(); 