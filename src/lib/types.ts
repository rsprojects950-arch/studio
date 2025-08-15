export type Task = {
  id: string;
  title: string;
  status: 'ongoing' | 'completed';
  dueDate: Date | null;
};
