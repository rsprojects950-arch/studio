
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
  username: string;
  userAvatar: string | null;
  createdAt: string; // ISO 8601 string format
  replyToId?: string;
  replyToText?: string;
  replyToUsername?: string;
};

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  photoURL: string | null;
};
