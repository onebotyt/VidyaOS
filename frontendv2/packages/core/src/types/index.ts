/**
 * VidyaOS Core Domain Models & Type Definitions
 */

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN' | 'HOD';
  roles?: string[];
  google_linked?: boolean;
  google_email?: string;
  avatar_url?: string;
  department_name?: string;
  department_id?: number;
  created_at?: string;
}

export interface StudentProfile extends User {
  student_id: number;
  ubter_roll_no: string;
  official_enrollment_no: string;
  registration_no: string;
  class_roll_no: number;
  semester: number;
  year: number;
  academic_year_label?: string;
  attendance_percentage?: number;
  total_classes?: number;
  attended_classes?: number;
  attendance_health_status?: 'ELIGIBLE' | 'SHORTAGE' | 'CRITICAL';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Classroom {
  id: number;
  code: string;
  name: string;
  subject_code?: string;
  subject_name?: string;
  teacher_name?: string;
  teacher_id?: number;
  semester?: number;
  academic_year?: string;
  banner_image?: string;
  theme_color?: string;
  student_count?: number;
  active_tasks_count?: number;
  enrolled_at?: string;
}

export interface ClassworkTask {
  id: number;
  classroom_id: number;
  title: string;
  description?: string;
  unit_number?: number;
  topic_name?: string;
  task_type: 'ASSIGNMENT' | 'MATERIAL' | 'TEST' | 'PROJECT';
  due_date?: string;
  max_marks?: number;
  status?: 'DUE' | 'SUBMITTED' | 'GRADED' | 'LATE';
  submission_status?: string;
  obtained_marks?: number;
}

export interface AttendanceSummary {
  overall_percentage: number;
  total_conducted: number;
  total_attended: number;
  statutory_minimum: number;
  is_eligible: boolean;
  safe_bunk_allowance: number;
  required_catchup_classes: number;
  subjects: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    conducted: number;
    attended: number;
    percentage: number;
  }[];
}

export interface SchedulePeriod {
  period_number: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  room: string;
  faculty_name: string;
  is_active_now?: boolean;
  is_next?: boolean;
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  refresh_token?: string;
  user: User;
  requires_password_link?: boolean;
  message?: string;
}
