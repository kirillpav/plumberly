import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ChatMessage } from './index';

// Auth
export type AuthStackParamList = {
  SignIn: undefined;
  CreateAccount: undefined;
  PlumberRegistration: undefined;
};

// Customer
export type CustomerTabParamList = {
  Chatbot: undefined;
  Enquiries: undefined;
  FindPros: undefined;
  Account: undefined;
};

export type CustomerStackParamList = {
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList>;
  NewEnquiry: { transcript?: ChatMessage[] } | undefined;
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
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Customer: NavigatorScreenParams<CustomerStackParamList>;
  Plumber: NavigatorScreenParams<PlumberStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
