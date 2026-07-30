import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, ChevronDown } from 'lucide-react';
import { customerService } from '../services/customers';

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA/Canada (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
];

interface CustomerAuthScreenProps {
  shopId?: string;
  onAuthenticated: (token: string, name: string, phone: string) => void;
  onBackToStore?: () => void;
}

export const CustomerAuthScreen: React.FC<CustomerAuthScreenProps> = ({ shopId, onAuthenticated }) => {
  const [step, setStep] = useState<'mobile' | 'otp' | 'name'>('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_calling_code) {
          setCountryCode(data.country_calling_code);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${mobileNumber}`;
      const res = await customerService.verifyMobile(fullPhone, shopId);
      
      if (res.otp_required === false) {
        const token = res.access_token || 'customer_token';
        const customerName = res.customer_name || 'Customer';
        localStorage.setItem('customer_token', token);
        localStorage.setItem('customer_name', customerName);
        localStorage.setItem('customer_phone', fullPhone);
        
        if (!res.is_global_customer && !res.customer_name) {
          setStep('name');
        } else {
          onAuthenticated(token, customerName, fullPhone);
        }
      } else {
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('OTP must be exactly 6 digits');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${mobileNumber}`;
      const res = await customerService.verifyOtp(fullPhone, otpCode, shopId);
      
      const token = res.access_token || localStorage.getItem('customer_token') || 'customer_token';
      const customerName = res.customer_name || localStorage.getItem('customer_name') || 'Customer';
      
      localStorage.setItem('customer_token', token);
      localStorage.setItem('customer_phone', fullPhone);
      if (res.customer_name) {
        localStorage.setItem('customer_name', res.customer_name);
      }

      if (!res.is_global_customer && !res.customer_name) {
        setStep('name');
      } else {
        onAuthenticated(token, customerName, fullPhone);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP code. Try 123456 in dev mode.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const fullPhone = `${countryCode}${mobileNumber}`;
      const res = await customerService.register(name.trim(), fullPhone, shopId, otpCode);
      
      const token = res.access_token || localStorage.getItem('customer_token') || 'customer_token';
      localStorage.setItem('customer_token', token);
      localStorage.setItem('customer_name', name.trim());
      localStorage.setItem('customer_phone', fullPhone);

      onAuthenticated(token, name.trim(), fullPhone);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-6 font-sans">
      {/* Top Menukit Logo & Title */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-2.5">
          <img src="/menukit-logo.svg" alt="Menukit Logo" className="w-10 h-10 object-contain shrink-0" />
          <div className="text-left">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white block leading-none">
              Menukit
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 mt-0.5 block">
              Customer Portal
            </span>
          </div>
        </div>
      </div>

      {/* Compact Authentication Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-[350px] bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg border border-slate-200/80 dark:border-slate-800 relative z-10"
      >
        <AnimatePresence mode="wait">
          {/* STEP 1: MOBILE ENTRY */}
          {step === 'mobile' && (
            <motion.div
              key="mobile-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5">
                {/* Menukit Logo inside card */}
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 p-2 flex items-center justify-center mx-auto shadow-inner">
                  <img src="/menukit-logo.svg" alt="Menukit Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Customer Verification
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug max-w-[260px] mx-auto font-medium">
                  Enter your mobile number to access your completed orders, rewards, and credits.
                </p>
              </div>

              <form onSubmit={handleMobileSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div ref={dropdownRef} className="absolute inset-y-0 left-0 flex items-center pl-1.5">
                      <div 
                        className="flex items-center gap-0.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        <span className="text-slate-800 dark:text-slate-200 font-bold text-xs">{countryCode}</span>
                        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-[110%] left-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden"
                          >
                            <div className="max-h-44 overflow-y-auto p-1">
                              {COUNTRY_CODES.map((c) => (
                                <div 
                                  key={c.code}
                                  className={`px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors ${countryCode === c.code ? 'bg-amber-500/10 font-bold text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}
                                  onClick={() => {
                                    setCountryCode(c.code);
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <span>{c.label}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full pl-20 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-slate-900 dark:text-white transition-all placeholder:font-normal placeholder:text-slate-400"
                      placeholder="9876543210"
                      maxLength={15}
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-[10px] font-semibold mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || mobileNumber.length < 10}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP Code'}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: OTP ENTRY */}
          {step === 'otp' && (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck size={24} />
                </div>
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Enter Verification OTP
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Code sent to <strong className="text-slate-800 dark:text-slate-200">{countryCode} {mobileNumber}</strong>
                </p>
                <div className="inline-block bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                  Hint: Dev mode OTP is <strong>123456</strong>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-3.5">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-center text-xl tracking-[0.25em] font-mono font-black text-slate-900 dark:text-white transition-all"
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    required
                  />
                  {error && <p className="text-red-500 text-[10px] font-semibold mt-1 text-center">{error}</p>}
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('mobile')}
                    className="w-full py-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  >
                    Change Mobile Number
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 3: NAME ENTRY FOR NEW USERS */}
          {step === 'name' && (
            <motion.div
              key="name-step"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                  <User size={24} />
                </div>
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Complete Your Profile
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Please enter your name to personalize your profile.
                </p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold text-slate-900 dark:text-white transition-all"
                    placeholder="e.g. Sivabalan"
                    autoFocus
                    required
                  />
                  {error && <p className="text-red-500 text-[10px] font-semibold mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || name.trim().length < 2}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 active:scale-[0.99] text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Saving Profile...' : 'View Customer Profile'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
