'use client';

import Link from 'next/link';
import { UsersIcon, ClockIcon, CheckCircle2, RefreshCw, Calendar, Activity, Star } from 'lucide-react';

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
  userVotedAsHuman?: boolean;
  userVotedAsAI?: boolean;
  creator: {
    id: string;
    nickname: string | null;
    avatar: string | null;
  };
  isFavorited?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
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
  userVotedAsHuman = false,
  userVotedAsAI = false,
  creator,
  isFavorited = false,
  onToggleFavorite,
}: VoteCardProps) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const totalParticipants = participantCount.human + participantCount.ai;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(e);
  };

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

  const getTimeStatus = () => {
    if (isExpired) {
      return { text: '已截止', color: 'text-red-600', bg: 'bg-red-50', icon: ClockIcon };
    }
    if (expiresAt) {
      return { text: formatTimeLeft(expiresAt), color: 'text-orange-600', bg: 'bg-orange-50', icon: ClockIcon };
    }
    return { text: '长期收集', color: 'text-green-600', bg: 'bg-green-50', icon: RefreshCw };
  };

  const timeStatus = getTimeStatus();
  const TimeIcon = timeStatus.icon;

  return (
    <Link href={`/votes/${id}`} className="block">
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden cursor-pointer hover:border-primary-200">
        {/* Status Bar - Top */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
          {/* Left: Status Tags */}
          <div className="flex items-center gap-2">
            {/* Human Voted Status */}
            {userVotedAsHuman && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                本人已投票
              </span>
            )}

            {/* AI Voted Status */}
            {userVotedAsAI && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                SecondMe 已投票
              </span>
            )}

            {/* Vote Type */}
            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
              {type === 'single' ? '单选' : '多选'}
            </span>

            {/* Change Vote Status */}
            {allowChange && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md" title="允许修改投票">
                <RefreshCw className="w-3 h-3" />
                可改
              </span>
            )}
          </div>

          {/* Right: Deadline Status */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${timeStatus.bg} ${timeStatus.color} text-xs font-medium rounded-md`}>
            <TimeIcon className="w-3.5 h-3.5" />
            {timeStatus.text}
          </span>
        </div>

        {/* Main Content */}
        <div className="p-5">
          {/* Title & Description */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-snug group-hover:text-primary-600 transition-colors">
              {title}
            </h3>
            {description && (
              <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{description}</p>
            )}
          </div>

          {/* Bottom: Participant Count */}
          <div className="flex items-center gap-2 pt-4 border-t border-gray-100 text-sm">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 text-gray-700 font-medium rounded-md">
              <UsersIcon className="w-4 h-4 text-gray-400" />
              <span>{totalParticipants} 票</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 font-medium rounded-md">
              <span>人类 {participantCount.human}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 font-medium rounded-md">
              <span>AI {participantCount.ai}</span>
            </div>
          </div>

          {/* Time Information Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-xs">
            {/* Left: Creator + Published Time */}
            <div className="flex items-center gap-2">
              {creator.avatar ? (
                <img
                  src={creator.avatar}
                  alt={creator.nickname || '发布者'}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <UsersIcon className="w-3.5 h-3.5 text-gray-400" />
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>发布 {formatTimeAgo(createdAt)}</span>
              </div>
            </div>

            {/* Right: Favorite + Active Time */}
            <div className="flex items-center gap-2">
              {/* Favorite Button */}
              {onToggleFavorite && (
                <button
                  onClick={handleFavoriteClick}
                  className={`px-3 py-1.5 rounded-md transition-colors duration-200 flex items-center gap-1.5 ${
                    isFavorited
                      ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title={isFavorited ? '取消收藏' : '收藏'}
                >
                  <Star className={`w-3.5 h-3.5 flex-shrink-0 ${isFavorited ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">
                    {isFavorited ? '已收藏' : '收藏'}
                  </span>
                </button>
              )}
              <div className="flex items-center gap-1.5 text-gray-500">
                <Activity className="w-3.5 h-3.5" />
                <span>活跃 {formatTimeAgo(activeAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
