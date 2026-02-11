import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ProfileTabs } from './ProfileTabs';

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/api/auth/login');
  }

  // 获取用户发起的投票
  const createdVotes = await prisma.vote.findMany({
    where: { createdBy: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      options: true,
      allowChange: true,
      expiresAt: true,
      activeAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 获取每个投票的参与统计
  const createdVotesWithStats = await Promise.all(
    createdVotes.map(async (vote) => {
      const responses = await prisma.voteResponse.findMany({
        where: { voteId: vote.id },
      });

      // 按 operatorType 统计，每个用户每种类型取最新的一条
      const latestByUser = new Map<string, { createdAt: Date; operatorType: string }>();
      responses.forEach((r) => {
        const key = `${r.userId}-${r.operatorType}`;
        const existing = latestByUser.get(key);
        if (!existing || r.createdAt > existing.createdAt) {
          latestByUser.set(key, { createdAt: r.createdAt, operatorType: r.operatorType });
        }
      });

      const uniqueResponses = Array.from(latestByUser.values());
      const humanCount = uniqueResponses.filter((r) => r.operatorType === 'human').length;
      const aiCount = uniqueResponses.filter((r) => r.operatorType === 'ai').length;

      return {
        ...vote,
        participantCount: {
          human: humanCount,
          ai: aiCount,
        },
        creator: {
          id: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
        },
      };
    })
  );

  // 获取用户参与的投票响应
  const participatedVotes = await prisma.voteResponse.findMany({
    where: { userId: user.id },
    include: { vote: true },
    orderBy: { createdAt: 'desc' },
  });

  // 区分人类和 AI 的投票
  const humanParticipations = participatedVotes.filter((r) => r.operatorType === 'human');
  const aiParticipations = participatedVotes.filter((r) => r.operatorType === 'ai');

  // 获取用户收藏的投票
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      vote: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          allowChange: true,
          expiresAt: true,
          activeAt: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 为收藏的投票添加参与统计
  const favoritesWithStats = await Promise.all(
    favorites.map(async (fav) => {
      const responses = await prisma.voteResponse.findMany({
        where: { voteId: fav.vote.id },
      });

      // 按 operatorType 统计，每个用户每种类型取最新的一条
      const latestByUser = new Map<string, { createdAt: Date; operatorType: string }>();
      responses.forEach((r) => {
        const key = `${r.userId}-${r.operatorType}`;
        const existing = latestByUser.get(key);
        if (!existing || r.createdAt > existing.createdAt) {
          latestByUser.set(key, { createdAt: r.createdAt, operatorType: r.operatorType });
        }
      });

      const uniqueResponses = Array.from(latestByUser.values());
      const humanCount = uniqueResponses.filter((r) => r.operatorType === 'human').length;
      const aiCount = uniqueResponses.filter((r) => r.operatorType === 'ai').length;

      // 检查当前用户是否投票
      const userVotedAsHuman = responses.some(r => r.userId === user.id && r.operatorType === 'human');
      const userVotedAsAI = responses.some(r => r.userId === user.id && r.operatorType === 'ai');

      return {
        ...fav,
        vote: {
          ...fav.vote,
          participantCount: {
            human: humanCount,
            ai: aiCount,
          },
          userVotedAsHuman,
          userVotedAsAI,
        },
      };
    })
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileTabs
          createdVotes={createdVotesWithStats as any}
          participatedVotes={participatedVotes as any}
          humanParticipations={humanParticipations as any}
          aiParticipations={aiParticipations as any}
          favorites={favoritesWithStats as any}
        />
    </div>
  );
}
