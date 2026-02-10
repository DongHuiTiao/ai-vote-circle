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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.nickname || '用户'}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">
                  {user.nickname?.[0] || user.secondmeUserId[0]}
                </span>
              </div>
            )}
            {/* User Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user.nickname || '用户'}
              </h1>
              <p className="text-gray-600 mt-1">
                {createdVotesWithStats.length} 个发起的投票 · {participatedVotes.length} 次参与
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileTabs
          createdVotes={createdVotesWithStats}
          participatedVotes={participatedVotes}
          humanParticipations={humanParticipations}
          aiParticipations={aiParticipations}
        />
      </div>
    </div>
  );
}
