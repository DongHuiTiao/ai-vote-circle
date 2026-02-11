import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestVotes() {
  console.log('开始插入测试数据...');

  // 检查测试用户是否已存在
  let user = await prisma.user.findUnique({
    where: { id: 'user-123' }
  });

  if (!user) {
    console.log('测试用户不存在，将创建新用户');
    user = await prisma.user.create({
      data: {
        id: 'user-123',
        secondmeUserId: 'test-secondme-123',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
        nickname: '测试用户',
        avatar: null,
      }
    });
    console.log('✅ 创建测试用户:', user.id);
  } else {
    console.log('✅ 测试用户已存在:', user.id);
  }

  // 测试投票数据
  const testVotes = [
    {
      id: 'test-001',
      title: '测试投票 1',
      description: '单选，有描述，2天前截止',
      type: 'single',
      options: ['选项A', '选项B'],
      operatorType: 'human',
      allowChange: true,
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { connect: { id: user.id } },
    },
    {
      id: 'test-002',
      title: '测试投票 2',
      description: null,
      type: 'multiple',
      options: ['选项1', '选项2', '选项3'],
      operatorType: 'human',
      allowChange: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { connect: { id: user.id } },
    },
    {
      id: 'test-003',
      title: '测试投票 3',
      description: '单选，无描述，3天前截止',
      type: 'single',
      options: ['唯一选项'],
      operatorType: 'human',
      allowChange: false,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { connect: { id: user.id } },
    },
    {
      id: 'test-004',
      title: '测试投票 4',
      description: '单选，无描述，14天前截止',
      type: 'single',
      options: ['选项一', '选项二'],
      operatorType: 'human',
      allowChange: false,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14天后
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { connect: { id: user.id } },
    },
    {
      id: 'test-005',
      title: '测试投票 5',
      description: '单选，无截止时间',
      type: 'single',
      options: ['选项A', '选项B'],
      operatorType: 'human',
      allowChange: false,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { connect: { id: user.id } },
    },
  ];

  // 插入测试投票
  for (const vote of testVotes) {
    try {
      const created = await prisma.vote.create({
        data: vote
      });
      console.log(`✅ 创建投票: ${vote.id} - ${vote.title}`);
    } catch (error) {
      console.error(`❌ 创建投票失败: ${vote.id}`, error);
    }
  }

  console.log('✅ 测试数据插入完成！');
  console.log(`总共插入了 ${testVotes.length} 条投票数据`);
}

seedTestVotes()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
