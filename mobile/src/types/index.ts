// Types for Sadaka Mobile App

export interface User {
  id: string;
  phoneNumber: string;
  fullName: string;
  email?: string;
  isVerified: boolean;
  avatarUrl?: string;
  language: 'tj' | 'ru' | 'en';
  createdAt: string;
}

export interface Mosque {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string;
  imamName: string;
  imamPhone?: string;
  logoUrl?: string;
  photoUrls: string[];
  qrCodeUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  rating: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  mosqueId: string;
  mosqueName?: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  progressPercentage?: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled';
  category: string;
  donationCount?: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  campaignId: string;
  mosqueId: string;
  amount: number;
  paymentMethod: 'card' | 'mobile_wallet' | 'qr' | 'bank_transfer';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  currency: string;
  createdAt: string;
}

export interface Report {
  id: string;
  campaignId: string;
  mosqueId: string;
  title: string;
  description: string;
  totalCollected: number;
  expenses: Expense[];
  photoUrls: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  createdAt: string;
}

export interface Expense {
  item: string;
  cost: number;
}

export interface SavobPoints {
  userId: string;
  currentPoints: number;
  totalPoints: number;
  rank: string;
  history: SavobHistory[];
}

export interface SavobHistory {
  transactionId: string;
  pointsEarned: number;
  multiplier: number;
  eventType: 'regular' | 'ramadan' | 'kurban' | 'special_event';
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Donation {
  donorName: string;
  amount: number;
  createdAt: string;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
