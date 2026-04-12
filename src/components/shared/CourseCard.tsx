'use client';

import { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, ChevronRight, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COURSE_GRADIENTS } from '@/lib/constants';
import { StudentCourse, TeacherCourse } from '@/lib/types';

interface StudentCourseCardProps {
  course: StudentCourse;
  index: number;
}

interface TeacherCourseCardProps {
  course: TeacherCourse;
  index: number;
}

export const StudentCourseCard = memo(function StudentCourseCard({ course, index }: StudentCourseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/courses/${course.course_section_id}`}
        className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
      >
        {/* Course Header with Gradient */}
        <div
          className={cn(
            'h-32 bg-gradient-to-r p-6 relative overflow-hidden',
            COURSE_GRADIENTS[index % COURSE_GRADIENTS.length]
          )}
        >
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-student-${course.course_section_id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-student-${course.course_section_id})`} />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              {course.course_code}
            </span>
            <h3 className="text-white font-display text-xl font-semibold mt-1">
              {course.course_title}
            </h3>
          </div>
        </div>

        {/* Course Body */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{course.section_name}</span>
            </div>
            {course.teacher_name && (
              <span className="text-sm text-gray-500">{course.teacher_name}</span>
            )}
          </div>

          {/* Grade Summary */}
          {course.grade_summary && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Progress</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy-600 rounded-full"
                      style={{
                        width: `${(course.grade_summary.graded_items_count / Math.max(course.grade_summary.total_items_count, 1)) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {course.grade_summary.graded_items_count}/{course.grade_summary.total_items_count}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 text-navy-600 group-hover:text-navy-800 transition-colors">
            <span className="text-sm font-medium">View Course</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export const TeacherCourseCard = memo(function TeacherCourseCard({ course, index }: TeacherCourseCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/courses/${course.course_section_id}`}
        className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
      >
        {/* Course Header with Gradient */}
        <div
          className={cn(
            'h-32 bg-gradient-to-r p-6 relative overflow-hidden',
            COURSE_GRADIENTS[index % COURSE_GRADIENTS.length]
          )}
        >
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-teacher-${course.course_section_id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-teacher-${course.course_section_id})`} />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              {course.course_code}
            </span>
            <h3 className="text-white font-display text-xl font-semibold mt-1">
              {course.course_title}
            </h3>
          </div>
        </div>

        {/* Course Body */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{course.student_count} students</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <GraduationCap className="w-4 h-4" />
              <span>{course.semester || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {course.grade_level} | {course.strand}
            </span>
            <div className="flex items-center gap-2 text-navy-600 group-hover:text-navy-800 transition-colors">
              <span className="text-sm font-medium">Manage</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});