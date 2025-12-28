
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
  DELAYED = 'DELAYED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: '待處理',
  [TaskStatus.IN_PROGRESS]: '進行中',
  [TaskStatus.REVIEW]: '審核中',
  [TaskStatus.DONE]: '已完成',
  [TaskStatus.DELAYED]: '已延遲'
};

export const PriorityLabels: Record<Priority, string> = {
  [Priority.LOW]: '低',
  [Priority.MEDIUM]: '中',
  [Priority.HIGH]: '高',
  [Priority.CRITICAL]: '極高'
};

export interface MoldTrial {
  id: string;
  version: string; // T1, T2, T3...
  date: string;
  condition: string; // 試模狀況紀錄
  result: 'PASS' | 'FAIL' | 'ADJUST' | 'PENDING';
  aiAdvice?: string;
}

export interface Task {
  id: string;
  moldName: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  startDate: string;
  dueDate: string;
  progress: number; // 0 to 100
  tags: string[];
  emailSent?: boolean;
  trials?: MoldTrial[];
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  completionRate: number;
}
