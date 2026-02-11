'use client';

import Link from 'next/link';
import { MessageSquareIcon, UsersIcon, ClockIcon } from 'lucide-react';

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
  createdAt: Date;
  allowChange?: boolean;
  userVoted?: boolean;
}

export function VoteCard({
  id,
  title,
  description,
  type,
  participantCount,
  expiresAt,
  activeAt,
  createdAt,
  allowChange = false,
  userVoted = false,
}: VoteCardProps) {
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

  return (
    <Link href={`/votes/${id}`}>
      <div className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 p-6 cursor-pointer hover:translate-y-[-2px]">
        {/* Voted Badge - Top Right */}
        {userVoted && (
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-500 text-white text-sm font-bold rounded-full shadow-md">
              ✓ 已投票
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pr-16">
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

          {expiresAt ? (
            <span className={`inline-flex items-center gap-1.5 ${isExpired ? 'text-red-500' : ''}`}>
              <ClockIcon className="w-4 h-4" />
              <span>过期时间：{isExpired ? '已截止' : formatTimeAgo(expiresAt)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-green-600">
              <ClockIcon className="w-4 h-4" />
              <span>长期收集</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 ml-auto text-gray-400">
            <MessageSquareIcon className="w-4 h-4" />
            <span>最近活跃：{formatTimeAgo(activeAt)}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-gray-400">
            <ClockIcon className="w-4 h-4" />
            <span>发布时间：{formatTimeAgo(createdAt)}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
            查看详情
          </button>
        </div>
      </div>
    </Link>
  );
}
