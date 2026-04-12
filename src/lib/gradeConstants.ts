/** DepEd default weight mappings for grade computation by subject category. */

export const DEPED_DEFAULT_WEIGHTS: Record<string, { written_works: number; performance_tasks: number; quarterly_assessment: number }> = {
  languages_ap_esp: { written_works: 30, performance_tasks: 50, quarterly_assessment: 20 },
  science_math: { written_works: 40, performance_tasks: 40, quarterly_assessment: 20 },
  mapeh_epp_tle: { written_works: 20, performance_tasks: 60, quarterly_assessment: 20 },
  shs_core: { written_works: 25, performance_tasks: 50, quarterly_assessment: 25 },
  shs_applied: { written_works: 25, performance_tasks: 50, quarterly_assessment: 25 },
  shs_specialized: { written_works: 25, performance_tasks: 50, quarterly_assessment: 25 },
  shs_tvl: { written_works: 20, performance_tasks: 60, quarterly_assessment: 20 },
  default: { written_works: 25, performance_tasks: 50, quarterly_assessment: 25 },
};

/** DepEd component type display labels */
export const COMPONENT_TYPE_LABELS: Record<string, string> = {
  written_works: 'Written Works',
  performance_task: 'Performance Task',
  quarterly_assessment: 'Quarterly Assessment',
};

/** Exam type display labels */
export const EXAM_TYPE_LABELS: Record<string, string> = {
  monthly: 'Monthly Exam',
  quarterly: 'Quarterly Exam',
};

/** DepEd grading scale descriptions */
export const DEPED_GRADE_SCALE: Record<string, { label: string; range: string }> = {
  outstanding: { label: 'Outstanding', range: '90-100' },
  very_satisfactory: { label: 'Very Satisfactory', range: '85-89' },
  satisfactory: { label: 'Satisfactory', range: '80-84' },
  fairly_satisfactory: { label: 'Fairly Satisfactory', range: '75-79' },
  did_not_meet: { label: 'Did Not Meet Expectations', range: 'Below 75' },
};