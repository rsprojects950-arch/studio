
export type Task = {
  id: string;
  userId: string;
  title: string;
  status: 'ongoing' | 'completed';
  dueDate: Date | null;
  createdAt: Date;
  source?: 'user' | 'goal';
  goalId?: string;
};

export type ShortTermGoal = {
  id: string;
  userId:string;
  title: string;
  dueDate: Date;
  createdAt: Date;
  isTransferred?: boolean;
}

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

export type Resource = {
  id: string;
  title: string;
  url: string;
  category: 'tech' | 'entrepreneur' | 'selfHelp';
  type: 'Book' | 'Video' | 'Documentation' | 'Online Resource' | 'Podcast';
  description: string;
  submittedByUid: string;
  submittedByUsername: string;
  createdAt: Date;
  thumbnailUrl?: string | null;
};
