import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Phone, ShieldCheck, User, ChevronDown } from 'lucide-react';
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

interface DiscountUnlockPopupProps {
  shopId: string;
  onClose: () => void;
  onUnlock: (customerId: string | null) => void;
  initialStep?: 'intro' | 'mobile';
}

export const DiscountUnlockPopup: React.FC<DiscountUnlockPopupProps> = ({ shopId, onClose, onUnlock, initialStep = 'intro' }) => {
  const [step, setStep] = useState<'intro' | 'mobile' | 'otp' | 'name' | 'success' | 'no_offers'>(initialStep);
  const [mobileNumber, setMobileNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isStrictMember, setIsStrictMember] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
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

  const handleClose = () => {
    if (isVerified) {
      onUnlock(isStrictMember ? 'verified-member' : 'unlocked');
    } else if (step === 'no_offers') {
      onUnlock(null);
    } else {
      onClose();
    }
  };

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length < 10) {
      setError('Please enter a valid mobile number');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      const res = await customerService.verifyMobile(`${countryCode}${mobileNumber}`, shopId);
      if (res.otp_required === false) {
        if (res.access_token) {
          localStorage.setItem('customer_token', res.access_token);
        }
        if (res.customer_name) {
          localStorage.setItem('customer_name', res.customer_name);
        }
        if (res.delivery_address) {
          localStorage.setItem('customer_address', res.delivery_address);
        }
        localStorage.setItem('customer_mobile', `${countryCode}${mobileNumber}`);
        if (!res.is_global_customer) {
          setStep('name');
        } else {
          setIsStrictMember(res.is_strict_member || false);
          setIsVerified(true);
          setStep('success');
        }
      } else {
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await customerService.verifyOtp(`${countryCode}${mobileNumber}`, otpCode, shopId);
      localStorage.setItem('customer_mobile', `${countryCode}${mobileNumber}`);
      if (res.customer_name) {
        localStorage.setItem('customer_name', res.customer_name);
      }
      if (res.delivery_address) {
        localStorage.setItem('customer_address', res.delivery_address);
      }
      if (!res.is_global_customer) {
        setStep('name');
      } else {
        setIsStrictMember(res.is_strict_member);
        setIsVerified(true);
        setStep('success');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid OTP code');
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
      const res = await customerService.register(name, `${countryCode}${mobileNumber}`, shopId, otpCode);
      localStorage.setItem('customer_mobile', `${countryCode}${mobileNumber}`);
      localStorage.setItem('customer_name', name);
      if (res.delivery_address) {
        localStorage.setItem('customer_address', res.delivery_address);
      }
      setIsStrictMember(false);
      setIsVerified(true);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
      >
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 text-center"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                🎉 Customer Profile Verification
              </h2>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Enter your registered mobile number to view your rewards, completed order history, and store credits.
              </p>
              <div className="space-y-2.5">
                <button 
                  onClick={() => setStep('mobile')}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-all shadow-lg text-sm"
                >
                  Verify Mobile Number
                </button>
                <button 
                  onClick={handleClose}
                  className="w-full py-3 text-gray-600 font-medium bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {step === 'mobile' && (
            <motion.div 
              key="mobile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Mobile Number</h2>
                <p className="text-sm text-gray-500">We'll send you a secure OTP to verify.</p>
              </div>

              <form onSubmit={handleMobileSubmit} className="space-y-5">
                <div>
                  <div className="relative">
                    <div ref={dropdownRef} className="absolute inset-y-0 left-0 flex items-center pl-2">
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      >
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 font-medium text-base min-w-[32px]">{countryCode}</span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isDropdownOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-[85%] left-2 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                          >
                            <div className="max-h-48 overflow-y-auto">
                              {COUNTRY_CODES.map((c) => (
                                <div 
                                  key={c.code}
                                  className={`px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors ${countryCode === c.code ? 'bg-amber-500/5' : ''}`}
                                  onClick={() => {
                                    setCountryCode(c.code);
                                    setIsDropdownOpen(false);
                                  }}
                                >
                                  <span className={`text-sm ${countryCode === c.code ? 'font-semibold text-amber-600' : 'text-gray-700'}`}>{c.label}</span>
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
                      className="block w-full pl-[105px] pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none text-base"
                      placeholder="Enter mobile number"
                      maxLength={15}
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || mobileNumber.length < 10}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>

                <p className="text-xs text-center text-gray-500 mt-4">
                  By continuing, you accept our{' '}
                  <a href="https://menukit.debuggerstechnologies.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                    Terms and Conditions
                  </a>
                </p>
              </form>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div 
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Verify OTP</h2>
                <p className="text-sm text-gray-500">Code sent to {countryCode} {mobileNumber}</p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                <div>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none text-center text-2xl tracking-widest font-mono"
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    required
                  />
                  {error && <p className="text-red-500 text-sm mt-1 text-center">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div 
              key="name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Just One More Step!</h2>
                <p className="text-sm text-gray-500">Tell us your name to personalize your profile.</p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-5">
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all outline-none text-base"
                      placeholder="Your Full Name"
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
                
                <button 
                  type="submit"
                  disabled={loading || name.length < 2}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Completing...' : 'Complete Profile'}
                </button>
              </form>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verified Successfully!
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Loading your global profile, rewards, and order history...
              </p>
              <button 
                onClick={handleClose}
                className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg"
              >
                View Profile
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
