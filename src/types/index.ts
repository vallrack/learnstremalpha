import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  isPremiumSubscriber?: boolean;
  premiumUpdatedAt?: string | Timestamp;
  createdAt: Timestamp;
  purchasedCourses?: string[];
  purchasedModules?: string[];
  purchasedLessons?: string[];
  purchasedChallenges?: string[];
  purchasedPodcasts?: string[];
  purchasedClasses?: string[];
  isActive?: boolean;
  instructorStatus?: 'pending' | 'active' | 'rejected';
  epaycoMerchantId?: string;
  revenueSharePercentage?: number;
  xp?: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  price: number;
  currency: string;
  isFree: boolean;
  isActive: boolean;
  isArchived?: boolean;
  totalLessons: number;
  instructorRevenueShare?: number;
}

export interface CourseProgress {
  courseId: string;
  userId: string;
  completedLessons: string[];
  progressPercentage: number;
  status: 'enrolled' | 'started' | 'in-progress' | 'completed';
  lastLessonId?: string;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface Transaction {
  id: string;
  userId: string | null;
  userEmail: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  challengeId?: string;
  podcastId?: string;
  virtualClassId?: string;
  type: 'course' | 'module' | 'lesson' | 'challenge' | 'podcast' | 'virtual_class' | 'premium';
  amount: number;
  ref_payco: string;
  status: 'completed' | 'pending' | 'failed';
  instructorId?: string;
  instructorShare?: number;
  adminShare?: number;
  createdAt: Date | Timestamp;
}
