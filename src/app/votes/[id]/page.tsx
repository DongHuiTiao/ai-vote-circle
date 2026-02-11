'use client';

import { CheckCircle2, User, Bot, Star, RefreshCw, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

interface Vote {
  id: string;
  title: string;
  description: string | null;
  type: 'single' | 'multiple';
  options: string[];
  operatorType: string;
  allowChange: boolean;
  expiresAt: Date | null;
  activeAt: Date;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    nickname: string | null;
    avatar: string | null;
    secondmeUserId: string;
  };
}

interface VoteResponse {
  id: string;
  voteId: string;
  userId: string;
  choice: number | number[];
  reason: string | null;
  operatorType: 'human' | 'ai';
  createdAt: Date;
  user: {
    id: string;
    nickname: string | null;
    avatar: string | null;
    secondmeUserId: string;
  };
}

interface VoteStats {
  human: number;
  ai: number;
  total: number;
  percentage: number;
}

interface VoteDetailResponse {
  code: number;
  data: {
    vote: Vote;
    stats: Record<string, VoteStats>;
    responses: VoteResponse[];
    totalVotes: number;
    userVoted?: boolean;
    userHasVotedAsHuman?: boolean;
    userHasVotedAsAI?: boolean;
  };
}

export default function VoteDetailPage() {
  const params = useParams();
  const voteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vote, setVote] = useState<Vote | null>(null);
  const [stats, setStats] = useState<Record<string, VoteStats>>({});
  const [responses, setResponses] = useState<VoteResponse[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVoted, setUserVoted] = useState(false);
  const [userHasVotedAsHuman, setUserHasVotedAsHuman] = useState(false);
  const [userHasVotedAsAI, setUserHasVotedAsAI] = useState(false);

  // Form state
  const [selectedChoice, setSelectedChoice] = useState<number | number[] | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI voting state
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiReason, setAiReason] = useState('');

  // Favorite state
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'results' | 'participate' | 'comments'>('participate');

  // Refresh data function
  const refreshData = async () => {
    try {
      const res = await fetch(`/api/votes/${voteId}`);
      const data: VoteDetailResponse = await res.json();

      if (data.code === 0 && data.data) {
        setVote(data.data.vote);
        setStats(data.data.stats);
        setResponses(data.data.responses);
        setTotalVotes(data.data.totalVotes);
        setUserVoted(data.data.userVoted || false);
        setUserHasVotedAsHuman(data.data.userHasVotedAsHuman || false);
        setUserHasVotedAsAI(data.data.userHasVotedAsAI || false);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  useEffect(() => {
    async function fetchVoteDetail() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/votes/${voteId}`);
        const data: VoteDetailResponse = await res.json();

        if (data.code === 0 && data.data) {
          setVote(data.data.vote);
          setStats(data.data.stats);
          setResponses(data.data.responses);
          setTotalVotes(data.data.totalVotes);
          setUserVoted(data.data.userVoted || false);
          setUserHasVotedAsHuman(data.data.userHasVotedAsHuman || false);
          setUserHasVotedAsAI(data.data.userHasVotedAsAI || false);
        } else {
          setError(data.data?.vote ? '未知错误' : '投票不存在');
        }
      } catch (err) {
        console.error('Failed to fetch vote detail:', err);
        setError('获取投票详情失败');
      } finally {
        setLoading(false);
      }
    }
    fetchVoteDetail();
  }, [voteId]);

  // 获取收藏状态
  async function fetchFavoriteStatus() {
    try {
      const res = await fetch(`/api/favorites/check?voteId=${voteId}`);
      const data = await res.json();
      if (data.code === 0) {
        setIsFavorited(data.data.isFavorited);
      }
    } catch (err) {
      console.error('Failed to fetch favorite status:', err);
    }
  }
  fetchFavoriteStatus();

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (selectedChoice === null) {
      toast.error('请选择一个选项');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/votes/${voteId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice: selectedChoice,
          reason: reason || null,
          operatorType: 'human',
        }),
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success('投票成功！');
        // 重新获取数据
        await refreshData();
        // 重置表单
        setSelectedChoice(null);
        setReason('');
        setAiReason('');
      } else {
        toast.error(data.error || '提交失败');
      }
    } catch (err) {
      console.error('Failed to submit vote:', err);
      toast.error('提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAISuggest() {
    if (!vote) return;

    setAiSuggesting(true);
    try {
      const res = await fetch(`/api/votes/${voteId}/ai-suggest`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.code === 0) {
        setAiReason(data.data.reason || '');
        toast.success('AI 建议生成成功！');
      } else {
        toast.error(data.error || 'AI 建议失败');
      }
    } catch (err) {
      console.error('Failed to AI suggest:', err);
      toast.error('AI 建议失败');
    } finally {
      setAiSuggesting(false);
    }
  }

  async function handleToggleFavorite() {
    setFavoriteLoading(true);
    try {
      const res = await fetch(`/api/votes/${voteId}/favorite`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.code === 0) {
        setIsFavorited(!isFavorited);
        toast.success(isFavorited ? '已取消收藏' : '已收藏');
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (err) {
      console.error('Toggle favorite error:', err);
      toast.error('操作失败，请重试');
    } finally {
      setFavoriteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !vote) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">{error || '投票不存在'}</p>
          <a href="/votes" className="text-primary-600 hover:underline">
            返回投票大厅
          </a>
        </div>
      </div>
    );
  }

  const participantCount = {
    human: Object.values(stats).reduce((sum, s) => sum + s.human, 0),
    ai: Object.values(stats).reduce((sum, s) => sum + s.ai, 0),
  };

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center gap-2 text-sm mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-lg font-medium">
              {vote.type === 'single' ? '单选' : '多选'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
              ✓
            </span>
            {vote.allowChange ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
                允许改票
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">
                ✗ 不可改票
              </span>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
              👤 {participantCount.human} 人类
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium">
              🤖 {participantCount.ai} AI
            </span>
            <span>·</span>
            <span className="font-medium text-gray-900">总计 {totalVotes} 票</span>
            {userVoted && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                已投票
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">{vote.title}</h1>
          {vote.description && (
            <p className="text-gray-700 text-lg leading-relaxed">{vote.description}</p>
          )}
        </div>
      </header>

      {/* Fixed Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 sticky top-16 z-20">
        <div className="max-w-4xl mx-auto flex justify-center gap-1">
          <button
            onClick={() => setActiveTab('participate')}
            className={`px-4 py-2.5 font-medium text-sm transition-all duration-200 ${
              activeTab === 'participate'
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🗳️ 参与投票
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2.5 font-medium text-sm transition-all duration-200 ${
              activeTab === 'results'
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 投票结果
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2.5 font-medium text-sm transition-all duration-200 ${
              activeTab === 'comments'
                ? 'bg-primary-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            💬 评论列表 ({responses.length})
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Main Content Area */}
        <section className="min-h-[500px]">
            {/* Tab Content */}
            {activeTab === 'participate' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {(!vote.allowChange && userHasVotedAsHuman) ? (
                  // 不可改票且已投票
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">已投票，不可改票</h2>
                    <p className="text-gray-600">此投票不允许修改，您已经完成投票。</p>
                  </div>
                ) : (
                  // 可投票或允许改票
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-5">🗳️ 参与投票</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Options */}
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">选择你的答案</label>
                        {vote.options.map((option, index) => (
                          <label
                            key={index}
                            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                              (vote.type === 'single'
                                ? selectedChoice === index
                                : Array.isArray(selectedChoice) && selectedChoice.includes(index))
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type={vote.type === 'single' ? 'radio' : 'checkbox'}
                              name="choice"
                              value={index}
                              checked={
                                vote.type === 'single'
                                  ? selectedChoice === index
                                  : Array.isArray(selectedChoice) && selectedChoice.includes(index)
                              }
                              onChange={(e) => {
                                if (vote.type === 'single') {
                                  setSelectedChoice(index);
                                } else {
                                  const current = Array.isArray(selectedChoice) ? selectedChoice : [];
                                  if (e.target.checked) {
                                    setSelectedChoice([...current, index]);
                                  } else {
                                    setSelectedChoice(current.filter((i) => i !== index));
                                  }
                                }
                              }}
                              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                            <span className="ml-3 font-medium text-gray-900">{option}</span>
                          </label>
                        ))}
                      </div>

                      {/* Reason Input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          投票理由（选填）
                        </label>
                        <div className="flex gap-2 mb-2">
                          <button
                            type="button"
                            onClick={handleAISuggest}
                            disabled={aiSuggesting}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {aiSuggesting ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Bot className="w-3 h-3" />
                                AI 生成理由
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="分享一下你的选择理由..."
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={submitting || selectedChoice === null}
                        className="w-full py-3 px-6 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            提交中...
                          </span>
                        ) : (
                          '提交投票'
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {!userHasVotedAsHuman ? (
                  // 未投票时显示提示
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">完成投票后可查看</h2>
                    <p className="text-gray-600">请先在【参与投票】标签完成投票，然后即可查看投票结果。</p>
                  </div>
                ) : (
                  // 已投票显示结果
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-5">📊 投票结果</h2>
                    <div className="space-y-5 mb-8">
                      {vote.options.map((option, index) => {
                        const stat = stats[index.toString()] || { total: 0, percentage: 0, human: 0, ai: 0 };
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900">{option}</span>
                              <span className="text-sm font-medium text-gray-600 tabular-nums">
                                {stat.total} 票 ({stat.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            {/* Progress Bar with gradient and animation */}
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={stat.percentage} aria-valuemin={0} aria-valuemax={100}>
                              <div
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${stat.percentage}%` }}
                              />
                            </div>
                            {/* Detail */}
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {stat.human} 人类
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                {stat.ai} AI
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 我的投票信息 */}
                    {responses.filter(r => r.operatorType === 'human' || r.operatorType === 'ai').length > 0 && (
                      <div className="border-t border-gray-200 pt-6 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">我的投票</h3>

                        {/* 人类投票 */}
                        {responses.filter(r => r.operatorType === 'human').map((response) => (
                          <div key={response.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                                <User className="w-3 h-3" aria-hidden="true" />
                                我的投票选项和理由
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-primary-500" />
                              <span className="font-medium text-gray-900">
                                投了：{
                                  Array.isArray(response.choice)
                                    ? response.choice.map((i: number) => vote.options[i]).join(', ')
                                    : vote.options[response.choice as number]
                                }
                              </span>
                            </div>
                            {response.reason && (
                              <p className="text-sm text-gray-700">{response.reason}</p>
                            )}
                          </div>
                        ))}

                        {/* AI 投票 */}
                        {responses.filter(r => r.operatorType === 'ai').map((response) => (
                          <div key={response.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                                <Bot className="w-3 h-3" aria-hidden="true" />
                                我的 AI 的投票选项和理由
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="w-4 h-4 text-purple-500" />
                              <span className="font-medium text-gray-900">
                                投了：{
                                  Array.isArray(response.choice)
                                    ? response.choice.map((i: number) => vote.options[i]).join(', ')
                                    : vote.options[response.choice as number]
                                }
                              </span>
                            </div>
                            {response.reason && (
                              <p className="text-sm text-gray-700">{response.reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-5">💬 评论列表 ({responses.length})</h2>
                <div className="space-y-4" role="list">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      role="listitem"
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        response.operatorType === 'ai'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-2 mb-3">
                        {response.operatorType === 'ai' ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                              <Bot className="w-3 h-3" aria-hidden="true" />
                              AI 投票
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {response.user.nickname || '用户'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                              <User className="w-3 h-3" aria-hidden="true" />
                              人类投票
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {response.user.nickname || '用户'}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(response.createdAt).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Choice */}
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-primary-500" />
                        <span className={`font-medium ${
                          response.operatorType === 'ai' ? 'text-purple-900' : 'text-gray-900'
                        }`}>
                          投了：{
                            Array.isArray(response.choice)
                              ? response.choice.map((i: number) => vote.options[i]).join(', ')
                              : vote.options[response.choice as number]
                          }
                        </span>
                      </div>

                      {/* Reason */}
                      {response.reason && (
                        <p className={`text-sm ${
                          response.operatorType === 'ai' ? 'text-purple-800' : 'text-gray-700'
                        }`}>{response.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
      </main>
    </>
  );
}
