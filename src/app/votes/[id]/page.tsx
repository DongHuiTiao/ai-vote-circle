'use client';

import { CheckCircle2, User, Bot, Star, RefreshCw, Loader2, Calendar, Activity, Clock, UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useLoginPrompt } from '@/contexts/LoginPromptContext';

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
    userHasFavorited?: boolean;
  };
}

interface UserInfo {
  id: string;
  nickname: string | null;
  avatar: string | null;
  secondmeUserId: string;
}

export default function VoteDetailPage() {
  const params = useParams();
  const voteId = params.id as string;
  const { showLoginPrompt } = useLoginPrompt();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vote, setVote] = useState<Vote | null>(null);
  const [stats, setStats] = useState<Record<string, VoteStats>>({});
  const [responses, setResponses] = useState<VoteResponse[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [userVoted, setUserVoted] = useState(false);
  const [userHasVotedAsHuman, setUserHasVotedAsHuman] = useState(false);
  const [userHasVotedAsAI, setUserHasVotedAsAI] = useState(false);
  const [userHasFavorited, setUserHasFavorited] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  // Form state
  const [selectedChoice, setSelectedChoice] = useState<number | number[] | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI voting state
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiReason, setAiReason] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'results' | 'participate' | 'comments'>('participate');

  // 获取用户信息
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    fetchUser();
  }, []);

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
        setUserHasFavorited(data.data.userHasFavorited || false);
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
          setUserHasFavorited(data.data.userHasFavorited || false);
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
        const generatedReason = data.data.reason || '';
        const generatedChoice = data.data.choice;
        setAiReason(generatedReason);
        setReason(generatedReason); // 同步到表单
        setSelectedChoice(generatedChoice); // 同步选项
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
    // 检查用户是否登录
    if (!user) {
      showLoginPrompt();
      return;
    }

    // 乐观更新 UI
    const newStatus = !userHasFavorited;
    setUserHasFavorited(newStatus);

    try {
      const method = newStatus ? 'POST' : 'DELETE';
      const res = await fetch(`/api/votes/${voteId}/favorite`, {
        method,
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success(newStatus ? '已收藏' : '已取消收藏');
      } else {
        // 失败时回滚
        setUserHasFavorited(!newStatus);
        toast.error(data.message || data.error || '操作失败');
      }
    } catch (err) {
      // 出错时回滚
      setUserHasFavorited(!newStatus);
      console.error('Toggle favorite error:', err);
      toast.error('操作失败，请重试');
    }
  }

  // 时间格式化函数
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  };

  const formatTimeLeft = (date: Date) => {
    const timeLeft = new Date(date).getTime() - new Date().getTime();
    const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));

    if (daysLeft >= 1) {
      return `${daysLeft}天后截止`;
    }

    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    if (hoursLeft >= 1) {
      return `${hoursLeft}小时后截止`;
    }

    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    if (minutesLeft >= 1) {
      return `${minutesLeft}分钟后截止`;
    }

    return '即将截止';
  };

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

  // 参与人数 = 不重复的 (userId, operatorType) 组合数
  const participantSet = new Set<string>();
  responses.forEach((r) => {
    participantSet.add(`${r.userId}-${r.operatorType}`);
  });
  const participantCount = {
    human: responses.filter(r => r.operatorType === 'human')
      .reduce((set, r) => set.add(r.userId), new Set<string>()).size,
    ai: responses.filter(r => r.operatorType === 'ai')
      .reduce((set, r) => set.add(r.userId), new Set<string>()).size,
  };

  // 计算截止时间状态
  const isExpired = vote.expiresAt && new Date(vote.expiresAt) < new Date();
  const getTimeStatus = () => {
    if (isExpired) {
      return { text: '已截止', color: 'text-red-600', bg: 'bg-red-50', icon: Clock };
    }
    if (vote.expiresAt) {
      return { text: formatTimeLeft(vote.expiresAt), color: 'text-orange-600', bg: 'bg-orange-50', icon: Clock };
    }
    return { text: '长期收集', color: 'text-green-600', bg: 'bg-green-50', icon: RefreshCw };
  };
  const timeStatus = getTimeStatus();
  const TimeIcon = timeStatus.icon;

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Status Tags Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm mb-3 sm:mb-4">
            {/* Left: Status Tags */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 bg-primary-100 text-primary-700 rounded-lg font-medium">
                {vote.type === 'single' ? '单选' : '多选'}
              </span>
              {vote.allowChange ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md" title="允许修改投票">
                  <RefreshCw className="w-3 h-3 sm:w-3 sm:h-3" />
                  可改
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
                  不可改
                </span>
              )}
              {userHasVotedAsHuman && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  本人已投
                </span>
              )}
              {userHasVotedAsAI && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  AI已投
                </span>
              )}
            </div>

            {/* Right: Participant Count + Deadline Status */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-gray-50 text-gray-700 font-medium rounded-md">
                <UsersIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{totalVotes} 票</span>
              </div>
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-md">
                <span>人类 {participantCount.human}</span>
              </div>
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-purple-50 text-purple-700 font-medium rounded-md">
                <span>AI {participantCount.ai}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 ${timeStatus.bg} ${timeStatus.color} text-xs font-medium rounded-md`}>
                <TimeIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {timeStatus.text}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">{vote.title}</h1>
            {vote.description && (
              <p className="text-gray-700 text-sm sm:text-base lg:text-lg leading-relaxed">{vote.description}</p>
            )}
          </div>

          {/* Creator & Time Information Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-50 text-xs sm:text-sm">
            {/* Left: Creator + Operator Type + Published Time */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {vote.creator.avatar ? (
                <img
                  src={vote.creator.avatar}
                  alt={vote.creator.nickname || '发布者'}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                </div>
              )}

              {/* Operator Type Badge */}
              {vote.operatorType && (
                <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-md ${
                  vote.operatorType === 'ai'
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {vote.operatorType === 'ai' ? 'AI' : '本人'}
                </span>
              )}

              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3.5" />
                <span className="hidden sm:inline">发布 </span>
                <span>{formatTimeAgo(vote.createdAt)}</span>
              </div>
            </div>

            {/* Right: Favorite + Active Time */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Favorite Button */}
              <button
                onClick={handleToggleFavorite}
                className={`px-2 sm:px-3 py-1.5 rounded-md transition-colors duration-200 flex items-center gap-1 sm:gap-1.5 ${
                  userHasFavorited
                    ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                title={userHasFavorited ? '取消收藏' : '收藏'}
              >
                <Star className={`w-3.5 h-3.5 flex-shrink-0 ${userHasFavorited ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline text-sm font-medium">
                  {userHasFavorited ? '已收藏' : '收藏'}
                </span>
              </button>
              <div className="flex items-center gap-1 text-gray-500">
                <Activity className="w-3 h-3.5" />
                <span className="hidden sm:inline">活跃 </span>
                <span>{formatTimeAgo(vote.activeAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setActiveTab('participate')}
            className={`flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
              activeTab === 'participate'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            🗳️ 参与投票
          </button>
          <button
            onClick={() => {
              if (!user) {
                showLoginPrompt();
                return;
              }
              if (!userHasVotedAsHuman) {
                toast.warning('本人投票后才能查看哦');
                return;
              }
              setActiveTab('results');
            }}
            className={`flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
              activeTab === 'results'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            📊 投票结果
          </button>
          <button
            onClick={() => {
              if (!user) {
                showLoginPrompt();
                return;
              }
              if (!userHasVotedAsHuman) {
                toast.warning('本人投票后才能查看哦');
                return;
              }
              setActiveTab('comments');
            }}
            className={`flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
              activeTab === 'comments'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            💬 评论列表 ({responses.length})
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Main Content Area */}
        <section className="min-h-[400px] sm:min-h-[500px]">
            {/* Tab Content */}
            {activeTab === 'participate' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                {/* 未登录提示横幅 */}
                {!user && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">请先登录</h3>
                        <p className="text-sm text-blue-700">登录后即可参与投票，分享你的观点</p>
                      </div>
                    </div>
                  </div>
                )}
                {(!vote.allowChange && userHasVotedAsHuman) ? (
                  // 不可改票且已投票
                  <div className="text-center py-8 sm:py-12">
                    <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">已投票，不可改票</h2>
                    <p className="text-gray-600 text-sm sm:text-base">此投票不允许修改，您已经完成投票。</p>
                  </div>
                ) : (
                  // 可投票或允许改票
                  <>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-5">🗳️ 参与投票</h2>
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                      {/* Options */}
                      <div className="space-y-2 sm:space-y-3">
                        <label className="text-sm font-medium text-gray-700">选择你的答案</label>
                        {vote.options.map((option, index) => (
                          <label
                            key={index}
                            className={`flex items-center p-3 sm:p-4 border-2 rounded-lg transition-all duration-200 ${
                              !user
                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75'
                                : (vote.type === 'single'
                                    ? selectedChoice === index
                                    : Array.isArray(selectedChoice) && selectedChoice.includes(index))
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-200 hover:border-gray-300 cursor-pointer'
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
                                if (!user) {
                                  showLoginPrompt();
                                  return;
                                }
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
                              disabled={!user}
                              className="w-5 h-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                            />
                            <span className="ml-3 text-sm sm:text-base font-medium text-gray-900">{option}</span>
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
                            disabled={aiSuggesting || !user}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                              !user
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            {aiSuggesting ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                <Bot className="w-3.5 h-3.5" />
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
                          disabled={!user}
                          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg resize-none ${
                            !user
                              ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                          }`}
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        onClick={(e) => {
                          if (!user) {
                            e.preventDefault();
                            showLoginPrompt();
                            return;
                          }
                        }}
                        disabled={submitting || selectedChoice === null || !user}
                        className={`w-full py-3 px-6 font-medium rounded-lg transition-colors ${
                          !user
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            提交中...
                          </span>
                        ) : !user ? (
                          '登录后投票'
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                {!userHasVotedAsHuman ? (
                  // 未投票时显示提示
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">完成投票后可查看</h2>
                    <p className="text-gray-600 text-sm sm:text-base">请先在【参与投票】标签完成投票，然后即可查看投票结果。</p>
                  </div>
                ) : (
                  // 已投票显示结果
                  <>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-5">📊 投票结果</h2>
                    <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
                      {vote.options.map((option, index) => {
                        const stat = stats[index.toString()] || { total: 0, percentage: 0, human: 0, ai: 0 };
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm sm:text-base">
                              <span className="font-semibold text-gray-900 text-sm sm:text-base">{option}</span>
                              <span className="text-xs sm:text-sm font-medium text-gray-600 tabular-nums">
                                {stat.total} 票 ({stat.percentage.toFixed(1)}%)
                              </span>
                            </div>
                            {/* Progress Bar with gradient and animation */}
                            <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden" role="progressbar" aria-valuenow={stat.percentage} aria-valuemin={0} aria-valuemax={100}>
                              <div
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${stat.percentage}%` }}
                              />
                            </div>
                            {/* Detail */}
                            <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-600">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-5">💬 评论列表 ({responses.length})</h2>
                <div className="space-y-3 sm:space-y-4" role="list">
                  {responses.map((response) => (
                    <div
                      key={response.id}
                      role="listitem"
                      className={`p-3 sm:p-4 rounded-lg border transition-all duration-200 ${
                        response.operatorType === 'ai'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        {response.operatorType === 'ai' ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                              <Bot className="w-3 h-3" aria-hidden="true" />
                              <span className="hidden sm:inline">AI 投票</span>
                              <span className="sm:hidden">AI</span>
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
                              {response.user.nickname || '用户'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2 sm:py-0.5 bg-primary-100 text-primary-700 text-xs font-bold rounded-full">
                              <User className="w-3 h-3" aria-hidden="true" />
                              <span className="hidden sm:inline">人类投票</span>
                              <span className="sm:hidden">人类</span>
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-gray-900">
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
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-500 flex-shrink-0" />
                        <span className={`text-sm sm:text-base font-medium ${
                          response.operatorType === 'ai' ? 'text-purple-900' : 'text-gray-900'
                        }`}>
                          {
                            Array.isArray(response.choice)
                              ? response.choice.map((i: number) => vote.options[i]).join(', ')
                              : vote.options[response.choice as number]
                          }
                        </span>
                      </div>

                      {/* Reason */}
                      {response.reason && (
                        <p className={`text-xs sm:text-sm ${
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
