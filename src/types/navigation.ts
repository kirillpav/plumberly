import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ChatMessage, IntakeData, UserRole } from './index';

// Onboarding
export type OnboardingStackParamList = {
  RoleSelection: undefined;
  OnboardingSlides: { role: UserRole };
  SignIn: { role: UserRole };
  CreateAccount: { role: UserRole };
  PlumberRegistration: { role: UserRole };
};

// Auth
export type AuthStackParamList = {
  SignIn: { role?: UserRole } | undefined;
  CreateAccount: { role?: UserRole } | undefined;
  PlumberRegistration: { role?: UserRole } | undefined;
};

// Customer
export type CustomerTabParamList = {
  Chatbot: undefined;
  Enquiries: undefined;
  Account: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  NewEnquiry: { transcript?: ChatMessage[]; intakeData?: IntakeData } | undefined;
  EnquiryDetail: { enquiryId: string };
  EditProfile: undefined;
};

// Plumber
export type PlumberTabParamList = {
  Jobs: undefined;
  Dashboard: undefined;
  Account: undefined;
};

export type PlumberStackParamList = {
  PlumberTabs: NavigatorScreenParams<PlumberTabParamList>;
  JobDetail: { jobId: string };
  EnquiryDetail: { enquiryId: string };
  EditProfile: undefined;
  BankDetails: undefined;
};

// Root
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Customer: NavigatorScreenParams<CustomerStackParamList>;
  Plumber: NavigatorScreenParams<PlumberStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
