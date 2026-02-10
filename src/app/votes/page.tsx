'use client';

import { VoteCard } from '@/components/VoteCard';
import { CreateVoteDialog } from '@/components/CreateVoteDialog';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Vote {
  id: string;
  title: string;
  description: string | null;
  type: 'single' | 'multiple';
  options: unknown;
  operatorType: string;
  allowChange: boolean;
  expiresAt: Date | null;
  activeAt: Date;
  createdAt: Date;
  updatedAt: Date;
  participantCount: {
    human: number;
    ai: number;
    total: number;
  };
  userVoted?: boolean;
  creator: {
    id: string;
    nickname: string | null;
    avatar: string | null;
  };
}

interface VotesResponse {
  code: number;
  data: {
    votes: Vote[];
    total: number;
    page: number;
    limit: number;
  };
}

type SortType = 'latest' | 'hot' | 'expiring';

export default function VotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortType>('latest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchVotes = async () => {
    setLoading(true);
    try {
      const sortParam = sort === 'expiring' ? 'latest' : sort;
      const res = await fetch(`/api/votes?sort=${sortParam}`);
      const data: VotesResponse = await res.json();

      if (data.code === 0) {
        let sortedVotes = data.data.votes;

        // 如果是按即将截止排序，在前端过滤
        if (sort === 'expiring') {
          sortedVotes = sortedVotes
            .filter((v) => v.expiresAt && new Date(v.expiresAt) > new Date())
            .sort((a, b) => {
              const aExpiresAt = new Date(a.expiresAt!).getTime();
              const bExpiresAt = new Date(b.expiresAt!).getTime();
              return aExpiresAt - bExpiresAt;
            });
        }

        setVotes(sortedVotes);
      }
    } catch (error) {
      console.error('Failed to fetch votes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVotes();
  }, [sort]);

  const filterButtons: { key: SortType; label: string }[] = [
    { key: 'latest', label: '最新活跃' },
    { key: 'hot', label: '最热门' },
    { key: 'expiring', label: '即将截止' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">投票大厅</h1>
              <p className="text-gray-600 mt-1">让 AI 帮你收集 1000 个观点</p>
            </div>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              发起投票
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                sort === key
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded mt-6"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Vote Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {votes.map((vote) => (
                <VoteCard
                  key={vote.id}
                  id={vote.id}
                  title={vote.title}
                  description={vote.description || undefined}
                  type={vote.type}
                  participantCount={{
                    human: vote.participantCount.human,
                    ai: vote.participantCount.ai,
                  }}
                  expiresAt={vote.expiresAt ? new Date(vote.expiresAt) : undefined}
                  activeAt={new Date(vote.activeAt)}
                  allowChange={vote.allowChange}
                  userVoted={vote.userVoted || false}
                />
              ))}
            </div>

            {/* Empty State */}
            {votes.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <PlusIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无投票</h3>
                <p className="text-gray-600 mb-6">成为第一个发起投票的人吧！</p>
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  发起投票
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Vote Dialog */}
      <CreateVoteDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={fetchVotes}
      />
    </div>
  );
}
