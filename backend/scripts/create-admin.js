const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    try {
        // 检查是否已存在管理员账号
        const existingAdmin = await prisma.admin.findFirst();
        if (existingAdmin) {
            console.log('管理员账号已存在，跳过创建');
            return;
        }

        // 创建默认管理员账号
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = await prisma.admin.create({
            data: {
                username: 'admin',
                password: hashedPassword,
            },
        });

        console.log('管理员账号创建成功:', admin.username);
    } catch (error) {
        console.error('创建管理员账号失败:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main(); 