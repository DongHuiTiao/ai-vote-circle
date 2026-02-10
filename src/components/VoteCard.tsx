'use client';

import Link from 'next/link';
import { MessageSquareIcon, UsersIcon, ClockIcon, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface VoteCardProps {
  id: string;
  title: string;
  description?: string;
  type: 'single' | 'multiple';
  participantCount: {
    human: number;
    ai: number;
  };
  expiresAt?: Date;
  activeAt: Date;
  allowChange?: boolean;
}

export function VoteCard({
  id,
  title,
  description,
  type,
  participantCount,
  expiresAt,
  activeAt,
  allowChange = false,
}: VoteCardProps) {
  const [aiVoting, setAiVoting] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const totalParticipants = participantCount.human + participantCount.ai;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

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

  const handleAIVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (aiVoting || aiSuccess) return;

    setAiVoting(true);
    try {
      // 1. 获取 AI 建议
      const suggestRes = await fetch(`/api/votes/${id}/ai-suggest`, {
        method: 'POST',
      });

      const suggestData = await suggestRes.json();

      if (suggestData.code !== 0) {
        toast.error(suggestData.message || 'AI 建议生成失败');
        return;
      }

      const { choice, reason } = suggestData.data;

      // 2. 提交 AI 投票
      const respondRes = await fetch(`/api/votes/${id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choice,
          reason: reason || null,
          operatorType: 'ai',
        }),
      });

      const respondData = await respondRes.json();

      if (respondData.code === 0) {
        setAiSuccess(true);
        // 3秒后重置状态并刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        toast.error(respondData.error || '投票提交失败');
      }
    } catch (error) {
      console.error('AI vote error:', error);
      toast.error('AI 投票失败，请重试');
    } finally {
      setAiVoting(false);
    }
  };

  return (
    <Link href={`/votes/${id}`}>
      <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 p-6 cursor-pointer hover:translate-y-[-2px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
              {title}
            </h3>
            {description && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">{description}</p>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="inline-flex items-center gap-1.5">
            {type === 'single' ? (
              <span className="font-medium">单选</span>
            ) : (
              <span className="font-medium">多选</span>
            )}
          </span>

          {allowChange ? (
            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
              ✓ 允许改票
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-500 font-medium">
              ✗ 不可改票
            </span>
          )}

          <span className="inline-flex items-center gap-1.5">
            <UsersIcon className="w-4 h-4" />
            <span>
              {participantCount.human}人类 · {participantCount.ai}AI
            </span>
          </span>

          {expiresAt && (
            <span className={`inline-flex items-center gap-1.5 ${isExpired ? 'text-red-500' : ''}`}>
              <ClockIcon className="w-4 h-4" />
              <span>{isExpired ? '已截止' : formatTimeAgo(expiresAt)}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 ml-auto text-gray-400">
            <MessageSquareIcon className="w-4 h-4" />
            <span>{formatTimeAgo(activeAt)}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="flex-1 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            查看详情
          </button>
          <button
            onClick={handleAIVote}
            disabled={aiVoting || aiSuccess || isExpired}
            className={`flex-1 font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 flex items-center justify-center gap-2 ${
              aiSuccess
                ? 'bg-green-500 text-white'
                : isExpired
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-secondary-500 hover:bg-secondary-600 text-white'
            }`}
          >
            {aiVoting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 思考中...
              </>
            ) : aiSuccess ? (
              <>
                ✓ 已投票
              </>
            ) : (
              '让 AI 帮我投票'
            )}
          </button>
        </div>

        {/* AI 投票成功提示 */}
        {aiSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
            AI 已帮你投完票，3秒后刷新...
          </div>
        )}
      </div>
    </Link>
  );
}
