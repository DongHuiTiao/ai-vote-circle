'use client';

import { CheckCircle2, User, Bot, Loader2 } from 'lucide-react';
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

  // Form state
  const [selectedChoice, setSelectedChoice] = useState<number | number[] | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI voting state
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiReason, setAiReason] = useState('');

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

  async function handleSubmit(e: React.FormEvent) {
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
        setTimeout(() => window.location.reload(), 1000);
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
        const { choice, reason } = data.data;
        setSelectedChoice(choice);
        setAiReason(reason);
        setReason(reason);
      } else {
        toast.error(data.message || 'AI 建议生成失败');
      }
    } catch (error) {
      console.error('AI suggest error:', error);
      toast.error('AI 建议生成失败，请重试');
    } finally {
      setAiSuggesting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !vote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 text-primary-700 rounded-md font-medium">
              {vote.type === 'single' ? '单选' : '多选'}
            </span>
            <span>·</span>
            {vote.allowChange ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                ✓ 允许改票
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
                ✗ 不可改票
              </span>
            )}
            <span>·</span>
            <span>{participantCount.human} 人类</span>
            <span>·</span>
            <span>{participantCount.ai} AI</span>
            <span>·</span>
            <span>参与</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">{vote.title}</h1>
          {vote.description && (
            <p className="text-gray-600 text-lg">{vote.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Vote & Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voting Results */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">投票结果</h2>
              <div className="space-y-4">
                {vote.options.map((option, index) => {
                  const stat = stats[index.toString()] || { total: 0, percentage: 0, human: 0, ai: 0 };
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{option}</span>
                        <span className="text-sm text-gray-600">
                          {stat.total} 票 ({stat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all duration-300"
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      {/* Detail */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>👤 {stat.human} 人类</span>
                        <span>🤖 {stat.ai} AI</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voting Form */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">参与投票</h2>
                {vote.allowChange && (
                  <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    可随时修改
                  </span>
                )}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Options */}
                <div className="space-y-3">
                  {vote.options.map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    >
                      <input
                        type={vote.type === 'single' ? 'radio' : 'checkbox'}
                        name="vote"
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
                            const checked = e.target.checked;
                            setSelectedChoice((prev) => {
                              const arr = Array.isArray(prev) ? prev : [];
                              return checked
                                ? [...arr, index]
                                : arr.filter((i) => i !== index);
                            });
                          }
                        }}
                        className="w-5 h-5 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                      />
                      <span className="font-medium text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    理由（可选）
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                    placeholder="说说你的想法..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    {submitting ? '提交中...' : '提交投票'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAISuggest}
                    disabled={aiSuggesting || submitting}
                    className="flex-1 bg-secondary-500 hover:bg-secondary-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    {aiSuggesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI 思考中...
                      </>
                    ) : aiReason ? (
                      '✓ AI 已建议'
                    ) : (
                      '让 AI 帮我投票'
                    )}
                  </button>
                </div>

                {/* AI Reason Display */}
                {aiReason && (
                  <div className="mt-4 p-4 bg-secondary-50 border border-secondary-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Bot className="w-5 h-5 text-secondary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-secondary-900 mb-1">AI 建议</p>
                        <p className="text-sm text-secondary-700">{aiReason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Responses List */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                理由列表 ({responses.length})
              </h2>
              <div className="space-y-4">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-4 rounded-lg border ${
                      response.operatorType === 'ai'
                        ? 'bg-secondary-50 border-secondary-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-2 mb-2">
                      {response.operatorType === 'ai' ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-100 text-secondary-700 text-xs font-bold rounded-full">
                            <Bot className="w-3 h-3" />
                            AI 投票
                          </span>
                          <span className="text-sm font-medium text-secondary-900">
                            {response.user.nickname || '用户'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                            <User className="w-3 h-3" />
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
                        response.operatorType === 'ai' ? 'text-secondary-900' : 'text-gray-900'
                      }`}>
                        投了：{
                          Array.isArray(response.choice)
                            ? response.choice.map(i => vote.options[i]).join(', ')
                            : vote.options[response.choice]
                        }
                      </span>
                    </div>

                    {/* Reason */}
                    {response.reason && (
                      <p className={`text-sm ${
                        response.operatorType === 'ai' ? 'text-secondary-800' : 'text-gray-700'
                      }`}>{response.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">参与统计</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">人类参与</span>
                  <span className="font-semibold text-gray-900">
                    {participantCount.human} 人
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AI 参与</span>
                  <span className="font-semibold text-gray-900">
                    {participantCount.ai} 个
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">总计</span>
                    <span className="font-bold text-gray-900 text-lg">
                      {totalVotes}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-gray-700">
                  分享投票
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-gray-700">
                  收藏投票
                </button>
                <button className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-gray-700">
                  举报
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
