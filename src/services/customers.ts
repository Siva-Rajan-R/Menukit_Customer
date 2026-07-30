import { api } from './api';

export interface OTPVerifyResponse {
  is_global_customer: boolean;
  is_member: boolean;
  is_strict_member: boolean;
  customer_name?: string | null;
  access_token?: string | null;
  delivery_address?: string | null;
}

export interface Customer {
  id: string;
  name: string | null;
  mobile_number: string;
  created_at: string;
  delivery_address?: string | null;
}

export interface MobileVerifyResponse {
  otp_required: boolean;
  message?: string;
  is_global_customer?: boolean;
  is_member?: boolean;
  is_strict_member?: boolean;
  customer_name?: string | null;
  access_token?: string | null;
  delivery_address?: string | null;
}

export const customerService = {
  verifyMobile: async (mobile_number: string, shop_id?: string): Promise<MobileVerifyResponse> => {
    const token = localStorage.getItem('customer_token');
    const response = await api.post('/customers/verify-mobile', { mobile_number, token, shop_id });
    return response.data;
  },

  verifyOtp: async (mobile_number: string, code: string, shop_id?: string): Promise<OTPVerifyResponse> => {
    const response = await api.post('/customers/verify-otp', { mobile_number, code, shop_id });
    if (response.data.access_token) {
      localStorage.setItem('customer_token', response.data.access_token);
    }
    return response.data;
  },

  register: async (name: string, mobile_number: string, shop_id?: string, otp_code?: string): Promise<Customer & { access_token?: string }> => {
    const response = await api.post('/customers/register', { name, mobile_number, shop_id, otp_code });
    if (response.data.access_token) {
      localStorage.setItem('customer_token', response.data.access_token);
    }
    return response.data;
  }
};
