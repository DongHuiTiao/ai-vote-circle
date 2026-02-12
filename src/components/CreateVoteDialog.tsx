'use client';

import { useState } from 'react';
import { XIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CreateVoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateVoteDialog({ isOpen, onClose, onSuccess }: CreateVoteDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'single' as 'single' | 'multiple',
    options: ['', ''],
    allowChange: false,
    expiresAt: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens
  useState(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        type: 'single',
        options: ['', ''],
        allowChange: false,
        expiresAt: '',
      });
      setErrors({});
    }
  });

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData({
        ...formData,
        options: [...formData.options, ''],
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({ ...formData, options: newOptions });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入投票标题';
    }

    if (formData.title.length > 100) {
      newErrors.title = '标题不能超过100字';
    }

    const validOptions = formData.options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      newErrors.options = '至少需要2个有效选项';
    }

    if (formData.expiresAt && new Date(formData.expiresAt) < new Date()) {
      newErrors.expiresAt = '截止时间不能早于当前时间';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          type: formData.type,
          options: formData.options,
          allowChange: formData.allowChange,
          expiresAt: formData.expiresAt || undefined,
        }),
      });

      const data = await res.json();
      if (data.code === 0) {
        toast.success('投票创建成功！');
        // 创建成功，关闭 dialog 并刷新列表
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          title: '',
          description: '',
          type: 'single',
          options: ['', ''],
          allowChange: false,
          expiresAt: '',
        });
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (err) {
      toast.error('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">发起投票</h2>
            <p className="text-gray-600 text-sm mt-1">创建一个新投票，收集大家的观点</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="例如：应该裸辞吗？"
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400`}
              maxLength={100}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">{formData.title.length}/100</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              题干描述（可选）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="详细描述投票的背景和目的..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
            />
            <p className="mt-1 text-sm text-gray-500">帮助大家更好地理解你的投票</p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              投票类型
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="single"
                  checked={formData.type === 'single'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'single' | 'multiple' })}
                  className="w-5 h-5 text-primary-500 focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900">单选</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="multiple"
                  checked={formData.type === 'multiple'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'single' | 'multiple' })}
                  className="w-5 h-5 text-primary-500 focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900">多选</span>
              </label>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选项 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {formData.options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-500 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                添加选项
              </button>
            )}
            {errors.options && (
              <p className="mt-2 text-sm text-red-500">{errors.options}</p>
            )}
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">高级设置</h3>

            {/* Allow Change */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowChange}
                  onChange={(e) => setFormData({ ...formData, allowChange: e.target.checked })}
                  className="w-5 h-5 text-primary-500 focus:ring-primary-500 rounded"
                />
                <div>
                  <span className="font-medium text-gray-900">允许改票</span>
                  <p className="text-sm text-gray-500">用户可以多次修改自己的投票</p>
                </div>
              </label>
            </div>

            {/* Expires At */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                截止时间（可选）
              </label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.expiresAt ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200`}
              />
              {errors.expiresAt && (
                <p className="mt-1 text-sm text-red-500">{errors.expiresAt}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">不设置则为永久有效</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {submitting ? '创建中...' : '创建投票'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
