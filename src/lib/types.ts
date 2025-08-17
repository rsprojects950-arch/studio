
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

export type ResourceLink = {
  id: string;
  title: string;
  type: string;
};

export type Message = {
  id: string;
  conversationId: string;
  text: string;
  userId: string;
  username: string;
  userAvatar: string | null;
  createdAt: string; // ISO 8601 string format
  replyToId?: string;
  replyToText?: string;
  replyToUsername?: string;
  resourceLinks?: ResourceLink[];
};

export type Note = {
  id: string;
  userId: string;
  topic: string;
  content: string;
  resourceLinks?: ResourceLink[];
  createdAt: string; // ISO 8601 string format
  updatedAt: string; // ISO 8601 string format
};

export type UserProfile = {
  uid: string;
  username: string;
  email: string;
  photoURL: string | null;
  lastRead?: Record<string, string>; // Maps conversationId to ISO timestamp string
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
  createdAt: string; // Changed from Date to string for serialization
  thumbnailUrl?: string;
  title_lowercase?: string;
};
