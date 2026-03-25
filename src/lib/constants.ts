// Course card gradient colors
export const COURSE_GRADIENTS = [
  'from-navy-600 to-navy-800',
  'from-blue-600 to-blue-800',
  'from-indigo-600 to-indigo-800',
  'from-slate-600 to-slate-800',
  'from-cyan-600 to-cyan-800',
  'from-teal-600 to-teal-800',
] as const;

// Quiz question types for quiz creation
export const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_in_the_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'matching', label: 'Matching' },
] as const;