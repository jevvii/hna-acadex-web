'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCoursesStore } from '@/store/courses';
import { useAuthStore, useIsStudent, useIsTeacher } from '@/store/auth';
import { StudentCourse, TeacherCourse } from '@/lib/types';
import { Users, ChevronRight, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const courseGradients = [
  'from-navy-600 to-navy-800',
  'from-blue-600 to-blue-800',
  'from-indigo-600 to-indigo-800',
  'from-slate-600 to-slate-800',
  'from-cyan-600 to-cyan-800',
  'from-teal-600 to-teal-800',
];

function StudentCourseCard({ course, index }: { course: StudentCourse; index: number }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/courses/${course.course_section_id}`}
        className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
      >
        <div
          className={cn(
            'h-32 bg-gradient-to-r p-6 relative overflow-hidden',
            courseGradients[index % courseGradients.length]
          )}
        >
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-list-${index}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-list-${index})`} />
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

          {course.grade_summary && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current Grade</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    course.final_grade && course.final_grade >= 90 ? 'text-green-600' :
                    course.final_grade && course.final_grade >= 80 ? 'text-blue-600' :
                    course.final_grade && course.final_grade >= 75 ? 'text-yellow-600' :
                    'text-gray-600'
                  )}>
                    {course.final_grade_letter || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
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
}

function TeacherCourseCard({ course, index }: { course: TeacherCourse; index: number }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link
        href={`/courses/${course.course_section_id}`}
        className="block bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-card-hover transition-all duration-300"
      >
        <div
          className={cn(
            'h-32 bg-gradient-to-r p-6 relative overflow-hidden',
            courseGradients[index % courseGradients.length]
          )}
        >
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`grid-t-list-${index}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#grid-t-list-${index})`} />
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
              {course.grade_level} • {course.strand}
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
}

export default function CoursesPage() {
  const { courses, fetchCourses, isLoading } = useCoursesStore();
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold text-navy-800">
          {isStudent ? 'My Courses' : 'My Teaching Load'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isStudent ? 'Access your enrolled courses and materials' : 'Manage your classes and students'}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {isStudent && (courses as StudentCourse[]).map((course, index) => (
          <StudentCourseCard key={course.course_section_id} course={course} index={index} />
        ))}
        {isTeacher && (courses as TeacherCourse[]).map((course, index) => (
          <TeacherCourseCard key={course.course_section_id} course={course} index={index} />
        ))}
      </motion.div>
    </div>
  );
}
