export interface Project {
  id: string;
  name: string;
  description?: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  project_id: string;
  name: string;
  email?: string;
  worker_code: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  worker_id: string;
  project_id: string;
  clock_in: string;
  clock_out?: string;
  work_description?: string;
  total_hours?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryWithWorker extends TimeEntry {
  workers?: {
    name: string;
    worker_code: string;
  };
}

export interface AuthState {
  user: any;
  userType: 'admin' | 'worker' | null;
  projectId?: string;
  workerId?: string;
}

export interface InNoutProject {
  id: string;
  name: string;
  description?: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}