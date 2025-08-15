
export type Task = {
  id: string;
  userId?: string; // Add userId to associate task with a user
  title: string;
  status: 'ongoing' | 'completed';
  dueDate: Date | null;
};
