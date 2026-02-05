export interface User {
  id: string
  email: string
  name: string
  plan?: string
  stripeCustomerId?: string
  subscriptionId?: string
  riskScore?: number
  createdAt: string
}

export interface CreateUserInput {
  email: string
  name: string
  plan?: string
}

export interface GetByIdInput {
  id: string
}

export interface StripeCustomer {
  id: string
  email: string
  name: string
  created: number
}

export interface StripeSubscription {
  id: string
  customer: string
  plan: string
  status: string
  created: number
}

export interface StripeCharge {
  id: string
  customer: string
  amount: number
  currency: string
  status: string
}

export interface CreateCustomerInput {
  email: string
  name: string
}

export interface CreateSubscriptionInput {
  customerId: string
  plan: string
}

export interface ChargeInput {
  customerId: string
  amount: number
  currency?: string
}

export interface AnalyticsScoreInput {
  userId: string
  email: string
  name: string
}

export interface AnalyticsResult {
  userId: string
  riskScore: number
  factors: string[]
  timestamp: string
}

export interface OnboardingMetrics {
  totalUsers: number
  averageRiskScore: number
  planDistribution: Record<string, number>
}

export interface OnboardUserInput {
  email: string
  name: string
  plan: string
}

export interface OnboardingResult {
  user: User
  stripeCustomer: StripeCustomer
  subscription: StripeSubscription
  analytics: AnalyticsResult
}
