'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserIcon, Bot, Clock, FileText, TrendingUp } from 'lucide-react';

interface VoteResponse {
  id: string;
  voteId: string;
  userId: string;
  choice: any;
  reason: string | null;
  createdAt: Date;
  vote: {
    id: string;
    title: string;
    type: string;
    options: any;
  };
}

interface Vote {
  id: string;
  title: string;
  description: string | null;
  type: string;
  options: any;
  createdAt: Date;
  participantCount: {
    human: number;
    ai: number;
  };
}

interface ProfileTabsProps {
  createdVotes: Vote[];
  participatedVotes: VoteResponse[];
  humanParticipations: VoteResponse[];
  aiParticipations: VoteResponse[];
}

export function ProfileTabs({
  createdVotes,
  participatedVotes,
  humanParticipations,
  aiParticipations,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'created' | 'participated'>('created');
  const [participatedSubTab, setParticipatedSubTab] = useState<'all' | 'ai' | 'human'>('all');

  const getVoteTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      single: '单选',
      multiple: '多选',
      rating: '评分',
      ranking: '排序',
      ab_test: 'A/B测试',
    };
    return typeMap[type] || type;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const renderCreatedVotes = () => {
    if (createdVotes.length === 0) {
      return (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">还没有发起过投票</h3>
          <p className="text-gray-600 mb-6">去发起你的第一个投票吧！</p>
          <Link
            href="/votes/create"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            发起投票
          </Link>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {createdVotes.map((vote) => (
          <Link
            key={vote.id}
            href={`/votes/${vote.id}`}
            className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
          >
            {/* Type Badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                {getVoteTypeLabel(vote.type)}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
              {vote.title}
            </h3>

            {/* Description */}
            {vote.description && (
              <p className="text-gray-600 mb-4 line-clamp-2">{vote.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                <span>{vote.participantCount.human} 人类</span>
              </div>
              <div className="flex items-center gap-1">
                <Bot className="w-4 h-4" />
                <span>{vote.participantCount.ai} AI</span>
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <Clock className="w-4 h-4" />
                <span>{formatDate(vote.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const renderParticipatedVotes = () => {
    const getDisplayVotes = () => {
      switch (participatedSubTab) {
        case 'ai':
          return aiParticipations;
        case 'human':
          return humanParticipations;
        default:
          return participatedVotes;
      }
    };

    const displayVotes = getDisplayVotes();

    if (displayVotes.length === 0) {
      return (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {participatedSubTab === 'ai' ? '还没有 AI 参与的投票' : '还没有参与过投票'}
          </h3>
          <p className="text-gray-600">
            {participatedSubTab === 'ai'
              ? '让 AI 帮你参与投票吧！'
              : '去投票大厅参与一些投票吧！'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {displayVotes.map((response) => {
          const choice = response.choice;
          const choiceText = Array.isArray(choice)
            ? choice.map((idx: number) => response.vote.options[idx]).join('、')
            : response.vote.options[choice];

          return (
            <Link
              key={response.id}
              href={`/votes/${response.voteId}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start gap-4">
                {/* Vote Info */}
                <div className="flex-1 min-w-0">
                  {/* Vote Title */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                    {response.vote.title}
                  </h3>

                  {/* Choice */}
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">
                      投了：{choiceText}
                    </span>
                  </div>

                  {/* Reason */}
                  {response.reason && (
                    <p className="text-gray-600 line-clamp-2 mb-2">{response.reason}</p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                      {getVoteTypeLabel(response.vote.type)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(response.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Main Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setActiveTab('created')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'created'
              ? 'bg-primary-500 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          我发起的 ({createdVotes.length})
        </button>
        <button
          onClick={() => setActiveTab('participated')}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'participated'
              ? 'bg-primary-500 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          我参与的 ({participatedVotes.length})
        </button>
      </div>

      {/* Participated Sub-tabs */}
      {activeTab === 'participated' && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setParticipatedSubTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              participatedSubTab === 'all'
                ? 'bg-secondary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            全部 ({participatedVotes.length})
          </button>
          <button
            onClick={() => setParticipatedSubTab('ai')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              participatedSubTab === 'ai'
                ? 'bg-secondary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            AI参与的 ({aiParticipations.length})
          </button>
          <button
            onClick={() => setParticipatedSubTab('human')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              participatedSubTab === 'human'
                ? 'bg-secondary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            我参与的 ({humanParticipations.length})
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'created' ? renderCreatedVotes() : renderParticipatedVotes()}
    </div>
  );
}
