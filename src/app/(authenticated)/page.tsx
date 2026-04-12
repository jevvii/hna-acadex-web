'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useIsStudent, useIsTeacher, useAuthStore } from '@/store/auth';
import { useCoursesStore } from '@/store/courses';
import { StudentCourse, TeacherCourse } from '@/lib/types';
import { BookOpen, Users, CheckCircle } from 'lucide-react';
import { StudentCourseCard, TeacherCourseCard } from '@/components/shared/CourseCard';
import { AdvisoryDashboardCard } from '@/components/grades/AdvisoryDashboardCard';
import { ReportCardCard } from '@/components/grades/ReportCardCard';

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

      {/* Report Card Summary */}
      <ReportCardCard />

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
          >
            <StudentCourseCard course={course} index={index} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function TeacherDashboard() {
  const { courses, fetchCourses } = useCoursesStore();
  const user = useAuthStore((state) => state.user);

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

      {/* Advisory Dashboard Card (only for advisers) */}
      {user?.advisory_section_id && (
        <AdvisoryDashboardCard
          sectionId={user.advisory_section_id}
          sectionName={user.advisory_section_name || ''}
        />
      )}

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
          >
            <TeacherCourseCard course={course} index={index} />
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
