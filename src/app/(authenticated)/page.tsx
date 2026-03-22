'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuthStore, useIsStudent, useIsTeacher } from '@/store/auth';
import { useCoursesStore } from '@/store/courses';
import { StudentCourse, TeacherCourse } from '@/lib/types';
import { BookOpen, Calendar, Clock, Users, ChevronRight, CheckCircle } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Color gradients for course cards
const courseGradients = [
  'from-navy-600 to-navy-800',
  'from-blue-600 to-blue-800',
  'from-indigo-600 to-indigo-800',
  'from-slate-600 to-slate-800',
  'from-cyan-600 to-cyan-800',
  'from-teal-600 to-teal-800',
];

function StudentDashboard() {
  const { courses, fetchCourses } = useCoursesStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const studentCourses = courses as StudentCourse[];

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold text-navy-800">My Courses</h1>
        <p className="text-gray-500 mt-1">Access your enrolled courses and materials</p>
      </motion.div>

      {/* Course Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {studentCourses.map((course, index) => (
          <motion.div
            key={course.course_section_id}
            variants={itemVariants}
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
                  courseGradients[index % courseGradients.length]
                )}
              >
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`grid-${index}`} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#grid-${index})`} />
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
        ))}
      </motion.div>
    </div>
  );
}

function TeacherDashboard() {
  const { courses, fetchCourses } = useCoursesStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const teacherCourses = courses as TeacherCourse[];

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold text-navy-800">My Courses</h1>
        <p className="text-gray-500 mt-1">Manage your classes and students</p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-navy-100 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-navy-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-800">{teacherCourses.length}</p>
              <p className="text-sm text-gray-500">Active Courses</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-gold-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-800">
                {teacherCourses.reduce((acc, c) => acc + c.student_count, 0)}
              </p>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-800">{teacherCourses.length}</p>
              <p className="text-sm text-gray-500">Sections This Year</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Course Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {teacherCourses.map((course, index) => (
          <motion.div
            key={course.course_section_id}
            variants={itemVariants}
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
                  courseGradients[index % courseGradients.length]
                )}
              >
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`grid-t-${index}`} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#grid-t-${index})`} />
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
                    <Calendar className="w-4 h-4" />
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
        ))}
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  const isStudent = useIsStudent();
  const isTeacher = useIsTeacher();

  if (isStudent) return <StudentDashboard />;
  if (isTeacher) return <TeacherDashboard />;

  // Loading state
  return (
    <div className="p-8">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
