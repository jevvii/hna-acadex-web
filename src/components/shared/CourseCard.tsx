'use client';

import { CSSProperties, memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layers, User, Users } from 'lucide-react';
import { COURSE_FALLBACK_BACKGROUNDS, COURSE_OVERLAY_PRESETS } from '@/lib/constants';
import { StudentCourse, TeacherCourse } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

interface StudentCourseCardProps {
  course: StudentCourse;
  index: number;
}

interface TeacherCourseCardProps {
  course: TeacherCourse;
  index: number;
}

type CardBadgeVariant = 'excellent' | 'good' | 'average' | 'pending';

const CARD_OVERLAY = 'linear-gradient(to top, rgba(15, 33, 71, 0.95) 0%, rgba(15, 33, 71, 0.7) 50%, rgba(26, 58, 107, 0.3) 100%)';

function normalizeHex(color: string): string | null {
  const hex = color.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) return null;
  const expanded = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return `#${expanded.toLowerCase()}`;
}

function resolveCardGradient(colorOverlay: string | undefined, index: number): string {
  if (!colorOverlay?.trim()) {
    return COURSE_FALLBACK_BACKGROUNDS[index % COURSE_FALLBACK_BACKGROUNDS.length];
  }

  const colorValue = colorOverlay.trim();
  const preset = COURSE_OVERLAY_PRESETS[colorValue];
  if (preset) {
    return `linear-gradient(135deg, ${preset.from} 0%, ${preset.to} 100%)`;
  }

  const normalizedHex = normalizeHex(colorValue);
  if (normalizedHex) {
    return `linear-gradient(135deg, #1a3a6b 0%, ${normalizedHex} 100%)`;
  }

  return COURSE_FALLBACK_BACKGROUNDS[index % COURSE_FALLBACK_BACKGROUNDS.length];
}

function getCardBackgroundLayers(coverImageUrl: string | undefined, gradient: string): {
  baseStyle: CSSProperties;
  tintStyle: CSSProperties | null;
} {
  const hasCoverImage = Boolean(coverImageUrl?.trim());
  return {
    baseStyle: hasCoverImage
      ? {
          backgroundImage: `url("${coverImageUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {
          background: gradient,
        },
    tintStyle: hasCoverImage
      ? {
          background: gradient,
          mixBlendMode: 'multiply',
          opacity: 0.88,
        }
      : null,
  };
}

function getBadgeStyles(variant: CardBadgeVariant): string {
  if (variant === 'excellent') {
    return 'bg-[rgba(16,185,129,0.2)] text-[#6ee7b7] border border-[rgba(16,185,129,0.3)]';
  }
  if (variant === 'good') {
    return 'bg-[rgba(59,130,246,0.2)] text-[#93c5fd] border border-[rgba(59,130,246,0.3)]';
  }
  if (variant === 'average') {
    return 'bg-[rgba(245,158,11,0.2)] text-[#fcd34d] border border-[rgba(245,158,11,0.3)]';
  }
  return 'bg-[rgba(255,255,255,0.15)] text-white/80 border border-[rgba(255,255,255,0.2)]';
}

function getStudentBadge(course: StudentCourse): { text: string; variant: CardBadgeVariant } {
  if (typeof course.final_grade === 'number') {
    const rounded = Math.round(course.final_grade);
    const letter = course.final_grade_letter ? ` ${course.final_grade_letter}` : '';
    if (rounded >= 90) return { text: `${rounded}%${letter}`, variant: 'excellent' };
    if (rounded >= 85) return { text: `${rounded}%${letter}`, variant: 'good' };
    if (rounded >= 75) return { text: `${rounded}%${letter}`, variant: 'average' };
    return { text: `${rounded}%${letter}`, variant: 'pending' };
  }

  const summary = course.grade_summary;
  if (!summary || summary.total_items_count === 0) {
    return { text: 'Pending', variant: 'pending' };
  }

  const progress = Math.round((summary.graded_items_count / Math.max(summary.total_items_count, 1)) * 100);
  if (progress >= 90) return { text: `${progress}% Ready`, variant: 'excellent' };
  if (progress >= 75) return { text: `${progress}% Ready`, variant: 'good' };
  if (progress > 0) return { text: `${progress}% Ready`, variant: 'average' };
  return { text: 'Pending', variant: 'pending' };
}

function getStudentSecondaryMeta(course: StudentCourse): string {
  const periodMode = course.semester ? `${course.semester} Semester` : 'Quarterly';
  return `${periodMode} • ${course.school_year}`;
}

function formatTeacherMetaName(name?: string): string {
  const cleaned = (name ?? 'Subject Teacher')
    .replace(/\s+/g, ' ')
    .replace(/,+\s*$/, '')
    .trim();
  return cleaned || 'Subject Teacher';
}

function getTeacherSecondaryMeta(course: TeacherCourse): string {
  const strandLabel = course.strand && course.strand !== 'NONE' ? ` • ${course.strand}` : '';
  return `${course.grade_level}${strandLabel}`;
}

function getTeacherGradingMeta(course: TeacherCourse): string {
  const progress = course.grade_progress;
  if (!progress || progress.total_items_count <= 0) {
    return 'No gradable work yet';
  }
  return `${progress.graded_items_count}/${progress.total_items_count} graded • ${progress.pending_items_count} pending`;
}

export const StudentCourseCard = memo(function StudentCourseCard({ course, index }: StudentCourseCardProps) {
  const gradient = resolveCardGradient(course.color_overlay, index);
  const backgroundLayers = getCardBackgroundLayers(course.cover_image_url, gradient);
  const badge = getStudentBadge(course);

  return (
    <motion.div whileHover={{ y: -4 }}>
      <Link
        href={`/courses/${course.course_section_id}`}
        className="block relative h-[200px] rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200"
      >
        <div className="absolute inset-0" style={backgroundLayers.baseStyle} />
        {backgroundLayers.tintStyle && <div className="absolute inset-0" style={backgroundLayers.tintStyle} />}
        <div className="absolute inset-0" style={{ background: CARD_OVERLAY }} />

        <div
          className={`absolute top-4 right-4 px-3.5 py-2 rounded-full text-[13px] font-semibold backdrop-blur-[10px] ${getBadgeStyles(badge.variant)}`}
        >
          {badge.text}
        </div>

        <div className="relative h-full p-6 flex flex-col justify-end text-white">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.05em] mb-2 opacity-90">
            <span className="text-gold-400">{course.course_code}</span>
            <span className="text-white/50">@</span>
            <span className="text-white">{course.section_name}</span>
          </div>

          <h3 className="font-display text-white text-xl font-semibold leading-[1.3] mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            {course.course_title}
          </h3>

          <div className="flex items-center gap-4 text-[13px] opacity-80">
            <div className="flex items-center gap-1.5 truncate max-w-[160px]">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{formatTeacherMetaName(course.teacher_name)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{getStudentSecondaryMeta(course)}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export const TeacherCourseCard = memo(function TeacherCourseCard({ course, index }: TeacherCourseCardProps) {
  const gradient = resolveCardGradient(course.color_overlay, index);
  const backgroundLayers = getCardBackgroundLayers(course.cover_image_url, gradient);
  const advisorySectionId = useAuthStore((state) => state.user?.advisory_section_id);
  const advisorySectionName = useAuthStore((state) => state.user?.advisory_section_name);
  const hasAdvisory = Boolean(advisorySectionId);
  const isAdvisorySubject = hasAdvisory && (
    (course.section_id && course.section_id === advisorySectionId)
    || (advisorySectionName && course.section_name === advisorySectionName)
  );
  const teacherBadgeLabel = isAdvisorySubject ? 'Advisory Subject' : 'Teacher Subject';
  const teacherBadgeVariant: CardBadgeVariant = isAdvisorySubject ? 'good' : 'pending';

  return (
    <motion.div whileHover={{ y: -4 }}>
      <Link
        href={`/courses/${course.course_section_id}`}
        className="block relative h-[200px] rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-200"
      >
        <div className="absolute inset-0" style={backgroundLayers.baseStyle} />
        {backgroundLayers.tintStyle && <div className="absolute inset-0" style={backgroundLayers.tintStyle} />}
        <div className="absolute inset-0" style={{ background: CARD_OVERLAY }} />

        <div
          className={`absolute top-4 right-4 px-3.5 py-2 rounded-full text-[13px] font-semibold backdrop-blur-[10px] ${getBadgeStyles(teacherBadgeVariant)}`}
        >
          {teacherBadgeLabel}
        </div>

        <div className="relative h-full p-6 flex flex-col justify-end text-white">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.05em] mb-2 opacity-90">
            <span className="text-gold-400">{course.course_code}</span>
            <span className="text-white/50">@</span>
            <span className="text-white">{course.section_name}</span>
          </div>

          <h3 className="font-display text-white text-xl font-semibold leading-[1.3] mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            {course.course_title}
          </h3>

          <div className="flex items-center gap-4 text-[13px] opacity-80">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{course.student_count} students</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{getTeacherSecondaryMeta(course)}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-white/80">
            {getTeacherGradingMeta(course)}
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
