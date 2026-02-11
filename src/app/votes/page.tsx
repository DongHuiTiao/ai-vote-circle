'use client';

import { VoteCard } from '@/components/VoteCard';
import { CreateVoteDialog } from '@/components/CreateVoteDialog';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Vote {
  id: string;
  title: string;
  description: string | null;
  type: 'single' | 'multiple';
  options: unknown;
  operatorType: string;
  allowChange: boolean;
  expiresAt: string | null;
  activeAt: string;
  createdAt: string;
  updatedAt: string;
  participantCount: {
    human: number;
    ai: number;
    total: number;
  };
  userHasVotedAsHuman?: boolean;
  userHasVotedAsAI?: boolean;
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
    totalPages: number;
  };
}

type SortType = 'newest' | 'hot' | 'active' | 'expiring';

export default function VotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState<SortType>('newest');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchVotes = async (page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
    }

    try {
      const sortParam = sort === 'expiring' ? 'newest' : sort;
      const res = await fetch(`/api/votes?sort=${sortParam}&page=${page}&limit=20`);
      const data: VotesResponse = await res.json();

      if (data.code === 0) {
        let sortedVotes = data.data.votes;

        // 根据不同排序方式在前端处理
        if (sort === 'hot') {
          // 最热门：按参与人数降序
          sortedVotes = sortedVotes.sort((a, b) => b.participantCount.total - a.participantCount.total);
        } else if (sort === 'expiring') {
          // 即将截止：过滤并按截止时间升序
          sortedVotes = sortedVotes
            .filter((v) => v.expiresAt && new Date(v.expiresAt) > new Date())
            .sort((a, b) => {
              const aExpiresAt = new Date(a.expiresAt!).getTime();
              const bExpiresAt = new Date(b.expiresAt!).getTime();
              return aExpiresAt - bExpiresAt;
            });
        }

        if (append) {
          setVotes((prev) => [...prev, ...sortedVotes]);
          setCurrentPage(page);
        } else {
          setVotes(sortedVotes);
          setCurrentPage(1);
        }

        setTotalCount(data.data.total);
        setHasMore(page * data.data.limit < data.data.total);

        // 获取收藏状态（去重）
        const voteIds = append
          ? Array.from(new Set([...votes.map((v) => v.id), ...sortedVotes.map((v) => v.id)]))
          : sortedVotes.map((v) => v.id);
        await fetchFavoriteStatus(voteIds);
      }
    } catch (error) {
      console.error('Failed to fetch votes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 批量检查收藏状态
  const fetchFavoriteStatus = async (voteIds: string[]) => {
    try {
      const res = await fetch(`/api/favorites/batch-check?voteIds=${voteIds.join(',')}`);
      const data = await res.json();
      if (data.code === 0) {
        setFavoriteStatus(data.data.favorites);
      }
    } catch (error) {
      console.error('Failed to fetch favorite status:', error);
    }
  };

  const handleToggleFavorite = async (voteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 乐观更新 UI
    const newStatus = !favoriteStatus[voteId];
    setFavoriteStatus((prev) => ({ ...prev, [voteId]: newStatus }));

    try {
      const method = newStatus ? 'POST' : 'DELETE';
      const res = await fetch(`/api/votes/${voteId}/favorite`, { method });

      const data = await res.json();
      if (data.code === 0) {
        toast.success(newStatus ? '收藏成功' : '已取消收藏');
      } else {
        // 失败时回滚
        setFavoriteStatus((prev) => ({ ...prev, [voteId]: !newStatus }));
        toast.error(data.message || '操作失败');
      }
    } catch (error) {
      // 出错时回滚
      setFavoriteStatus((prev) => ({ ...prev, [voteId]: !newStatus }));
      toast.error('操作失败，请重试');
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchVotes(currentPage + 1, true);
    }
  };

  useEffect(() => {
    fetchVotes(1, false);
  }, [sort]);

  const filterButtons: { key: SortType; label: string }[] = [
    { key: 'newest', label: '最新' },
    { key: 'hot', label: '最热门' },
    { key: 'active', label: '最近活跃' },
    { key: 'expiring', label: '即将截止' },
  ];

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                sort === key
                  ? 'bg-primary-500 text-white shadow-md'
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
                  createdAt={new Date(vote.createdAt)}
                  allowChange={vote.allowChange}
                  userVotedAsHuman={vote.userHasVotedAsHuman || false}
                  userVotedAsAI={vote.userHasVotedAsAI || false}
                  operatorType={vote.operatorType}
                  creator={vote.creator}
                  isFavorited={favoriteStatus[vote.id] || false}
                  onToggleFavorite={(e) => handleToggleFavorite(vote.id, e)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && votes.length > 0 && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-white border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loadingMore ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}

            {/* No More Data Indicator */}
            {!hasMore && votes.length > 0 && (
              <div className="text-center mt-8 text-gray-500">
                已加载全部 {totalCount} 个投票
              </div>
            )}

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
    </>
  );
}
