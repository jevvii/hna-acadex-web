'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCoursesStore } from '@/store/courses';
import { useIsStudent, useIsTeacher } from '@/store/auth';
import { StudentCourse, TeacherCourse } from '@/lib/types';
import { StudentCourseCard, TeacherCourseCard } from '@/components/shared/CourseCard';

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