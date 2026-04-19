'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Loader2, Lock, Mail, User, BadgeCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn, getInitials, resolveFileUrl } from '@/lib/utils';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAvatarSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller.');
      setSuccess(null);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await authApi.uploadAvatar(formData);
      setUser({ ...user, avatar_url: response.avatar_url });
      setSuccess('Profile photo updated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload profile photo.';
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const idLabel = user?.role === 'teacher' ? 'Teacher ID' : 'Student ID';
  const idValue = user?.role === 'teacher' ? user.employee_id : user?.student_id;
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-3xl font-bold text-navy-800">Settings</h1>
        <p className="text-gray-500 mt-1">Account configuration</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card p-6"
        >
          <h2 className="font-display text-xl font-semibold text-navy-800 mb-5">
            Profile Photo
          </h2>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-navy-50 border-4 border-navy-100">
                {user?.avatar_url ? (
                  <img
                    src={resolveFileUrl(user.avatar_url)}
                    alt={user.full_name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl font-display font-bold text-navy-300">
                      {getInitials(user?.full_name || 'User')}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  'absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-colors',
                  uploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-navy-600 hover:bg-navy-700'
                )}
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelected}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-4 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload New Photo'}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-card p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-700">
              Admin-assigned account information is read-only.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyField label="Full Name" value={user?.full_name} icon={User} />
            <ReadOnlyField label="Role" value={user?.role} icon={BadgeCheck} capitalize />
            <ReadOnlyField label="School Email" value={user?.email} icon={Mail} />
            <ReadOnlyField label={idLabel} value={idValue} icon={BadgeCheck} />
            {isStudent ? <ReadOnlyField label="Grade Level" value={user?.grade_level} /> : null}
            {isStudent ? <ReadOnlyField label="Strand" value={user?.strand} /> : null}
            {isStudent ? <ReadOnlyField label="Section" value={user?.section} /> : null}
            {isTeacher ? <ReadOnlyField label="Advisory Section" value={user?.advisory_section_name} /> : null}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  icon: Icon,
  capitalize = false,
}: {
  label: string;
  value?: string;
  icon?: React.ComponentType<{ className?: string }>;
  capitalize?: boolean;
}) {
  const textValue = value && String(value).trim().length > 0 ? String(value) : '—';
  return (
    <div className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50/60">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={cn('text-sm font-semibold text-navy-900 flex items-center gap-2', capitalize && 'capitalize')}>
        {Icon ? <Icon className="w-4 h-4 text-slate-400" /> : null}
        <span>{textValue}</span>
      </p>
    </div>
  );
}
