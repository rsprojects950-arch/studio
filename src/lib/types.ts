

export type Task = {
  id: string;
  userId: string;
  title: string;
  status: 'ongoing' | 'completed';
  dueDate: Date | null;
  createdAt: Date;
};

export type Message = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string; // ISO 8601 string format
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
};
