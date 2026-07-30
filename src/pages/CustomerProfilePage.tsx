import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ChevronLeft, 
  Store, 
  Trophy, 
  Gift, 
  ShoppingBag, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2,
  ExternalLink,
  LogOut,
  X,
  Clock,
  CreditCard,
  Search,
  ArrowUpRight,
  Compass,
  SlidersHorizontal,
  Filter,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerAuthScreen } from '../components/CustomerAuthScreen';

export function CustomerProfilePage() {
  const STORE_APP_URL = import.meta.env.VITE_STORE_APP_URL || 'http://localhost:5173';
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('customer_token'));
  const [customerPhone, setCustomerPhone] = useState<string>(() => localStorage.getItem('customer_phone') || '');
  const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('customer_name') || '');
  const [customerCredits, setCustomerCredits] = useState<{ creditLimit: number; availableCredit: number; usedCredit: number }>({
    creditLimit: 0,
    availableCredit: 0,
    usedCredit: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [tabPagination, setTabPagination] = useState<any>({
    page: 1,
    limit: 5,
    total: 0,
    total_pages: 1
  });

  const [headerCounts, setHeaderCounts] = useState<any>({
    visited_shops: 0,
    orders: 0,
    rewards: 0,
    contests: 0
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCreditBenefits, setShowCreditBenefits] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [selectedContest, setSelectedContest] = useState<any>(null);
  const [visitedShops, setVisitedShops] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [myParticipatedContests, setMyParticipatedContests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Main Tabs: 'shops' | 'rewards' | 'orders' | 'contests'
  const [activeTab, setActiveTab] = useState<'shops' | 'rewards' | 'orders' | 'contests'>('shops');
  
  // Contest Sub-Tabs: 'participated' | 'live'
  const [contestSubTab, setContestSubTab] = useState<'participated' | 'live'>('participated');
  const [showDiscover, setShowDiscover] = useState(true);
  const lastScrollY = useRef(0);

  // Tab-dependent Filter States
  const [filters, setFilters] = useState<{
    shops: { minOrders: number; sortBy: string };
    rewards: { discountType: string; sortBy: string };
    orders: { status: string; sortBy: string };
    contests: { status: string; sortBy: string };
  }>({
    shops: { minOrders: 0, sortBy: 'most_orders' },
    rewards: { discountType: 'all', sortBy: 'newest' },
    orders: { status: 'all', sortBy: 'newest' },
    contests: { status: 'all', sortBy: 'newest' }
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Check if current tab has non-default active filters
  const hasActiveFilters = useMemo(() => {
    if (activeTab === 'shops') {
      return filters.shops.minOrders > 0 || filters.shops.sortBy !== 'most_orders';
    } else if (activeTab === 'rewards') {
      return filters.rewards.discountType !== 'all' || filters.rewards.sortBy !== 'newest';
    } else if (activeTab === 'orders') {
      return filters.orders.status !== 'all' || filters.orders.sortBy !== 'newest';
    } else if (activeTab === 'contests') {
      return filters.contests.status !== 'all' || filters.contests.sortBy !== 'newest';
    }
    return false;
  }, [activeTab, filters]);

  const isAnyModalOpen = isFilterModalOpen || Boolean(selectedOrder) || Boolean(selectedReward) || Boolean(selectedContest) || showLogoutConfirm || showCreditBenefits;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 40) {
        // Scrolling DOWN -> smoothly hide Discover button
        setShowDiscover(false);
      } else {
        // Scrolling UP or near TOP -> show Discover button
        setShowDiscover(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset page when tab, subtab, or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, contestSubTab]);

  // Reset page when filters change
  const handleApplyFilters = () => {
    setCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setFilters(prev => ({
      ...prev,
      [activeTab]: activeTab === 'shops'
        ? { minOrders: 0, sortBy: 'most_orders' }
        : activeTab === 'rewards'
        ? { discountType: 'all', sortBy: 'newest' }
        : activeTab === 'orders'
        ? { status: 'all', sortBy: 'newest' }
        : { status: 'all', sortBy: 'newest' }
    }));
    setCurrentPage(1);
    toast.success("Filters reset!");
  };

  const [isBuyingCredits, setIsBuyingCredits] = useState(false);

  // Auto-verify Cashfree credit payment on return URL callback
  useEffect(() => {
    async function verifyCashfreePayment() {
      const query = new URLSearchParams(window.location.search);
      const isSuccess = query.get('payment_success') === 'true';
      const linkId = query.get('link_id');
      const mobileNumber = query.get('mobile_number') || customerPhone;

      if (isSuccess && linkId) {
        try {
          const res = await api.post('/contests/pay/verify', {
            link_id: linkId,
            mobile_number: mobileNumber
          });
          toast.success(`🎉 1 Credit added successfully! Balance: ${res.data.credits} Credits`);
          // Clean URL query params
          window.history.replaceState({}, document.title, window.location.pathname);
          // Refresh customer profile header credits
          const storedToken = localStorage.getItem('customer_token');
          const profileRes = await api.get(`/public/shop/global/customer-profile`, {
            headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
          });
          if (profileRes.data?.customer) {
            setCustomerCredits({
              creditLimit: profileRes.data.customer.credit_limit || 0,
              availableCredit: profileRes.data.customer.available_credit || 0,
              usedCredit: profileRes.data.customer.used_credit || 0
            });
          }
        } catch (e: any) {
          console.error("Cashfree credit verification error", e);
          toast.error(e.response?.data?.detail || "Failed to verify credit payment");
        }
      }
    }
    verifyCashfreePayment();
  }, [customerPhone]);

  const handleBuyCredits = async () => {
    if (!customerPhone) {
      toast.error("Please log in to purchase contest credits");
      return;
    }
    setIsBuyingCredits(true);
    try {
      const res = await api.post('/contests/pay', {
        mobile_number: customerPhone,
        shop_id: id || 'global'
      });
      if (res.data && res.data.link_url) {
        toast.loading("Redirecting to Cashfree Payment (₹5 = 1 Credit)...");
        window.location.href = res.data.link_url;
      } else {
        toast.error("Failed to generate payment link");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to initiate credit payment");
    } finally {
      setIsBuyingCredits(false);
    }
  };

  // 1. Fetch Header Info & Summary Counts
  useEffect(() => {
    async function loadCustomerHeader() {
      if (!token) return;
      try {
        const targetShopId = 'global';
        if (id) {
          try {
            const shopRes = await api.get(`/public/shop/${id}`);
            setShop(shopRes.data);
          } catch (e) {
            console.log("Could not fetch specific shop metadata", e);
          }
        }

        const storedToken = localStorage.getItem('customer_token');
        const profileRes = await api.get(`/public/shop/${targetShopId}/customer-profile`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
        });

        const data = profileRes.data;
        if (data && data.customer) {
          setCustomerName(data.customer.name || localStorage.getItem('customer_name') || 'Customer');
          setCustomerPhone(data.customer.mobile_number || localStorage.getItem('customer_phone') || '');
          setCustomerCredits({
            creditLimit: data.customer.credit_limit || 0,
            availableCredit: data.customer.available_credit || 0,
            usedCredit: data.customer.used_credit || 0
          });
          if (data.customer.counts) {
            setHeaderCounts(data.customer.counts);
          }
        }

        // Fetch Dedicated Counts
        try {
          const countsRes = await api.get('/public/shop/global/customer-counts', {
            headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
          });
          if (countsRes.data && countsRes.data.counts) {
            setHeaderCounts(countsRes.data.counts);
          }
        } catch (cErr) {
          console.error("Failed to fetch dedicated customer counts", cErr);
        }
      } catch (err) {
        console.error("Failed to load customer profile header", err);
      }
    }
    loadCustomerHeader();
  }, [id, token]);

  // 2. Fetch Dedicated Tab Data (Lightweight, Paginated, Searched, Filtered via Backend)
  useEffect(() => {
    async function loadTabData() {
      if (!token) return;
      setIsLoading(true);
      try {
        const targetShopId = 'global';
        const storedToken = localStorage.getItem('customer_token');
        const headers = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};

        if (activeTab === 'shops') {
          const params = {
            search: searchQuery.trim() || undefined,
            min_orders: filters.shops.minOrders || undefined,
            sort_by: filters.shops.sortBy,
            page: currentPage,
            limit: 5
          };
          const res = await api.get(`/public/shop/${targetShopId}/customer-visited-shops`, { params, headers });
          setVisitedShops(res.data.items || []);
          setTabPagination(res.data.pagination || { page: 1, limit: 5, total: 0, total_pages: 1 });
        } else if (activeTab === 'rewards') {
          const params = {
            search: searchQuery.trim() || undefined,
            discount_type: filters.rewards.discountType !== 'all' ? filters.rewards.discountType : undefined,
            sort_by: filters.rewards.sortBy,
            page: currentPage,
            limit: 5
          };
          const res = await api.get(`/public/shop/${targetShopId}/customer-rewards`, { params, headers });
          setDiscounts(res.data.items || []);
          setTabPagination(res.data.pagination || { page: 1, limit: 5, total: 0, total_pages: 1 });
        } else if (activeTab === 'orders') {
          const params = {
            search: searchQuery.trim() || undefined,
            status_filter: filters.orders.status !== 'all' ? filters.orders.status : undefined,
            sort_by: filters.orders.sortBy,
            page: currentPage,
            limit: 5
          };
          const res = await api.get(`/public/shop/${targetShopId}/customer-orders`, { params, headers });
          setOrders(res.data.items || []);
          setTabPagination(res.data.pagination || { page: 1, limit: 5, total: 0, total_pages: 1 });
        } else if (activeTab === 'contests') {
          const params = {
            search: searchQuery.trim() || undefined,
            status_filter: filters.contests.status !== 'all' ? filters.contests.status : undefined,
            sort_by: filters.contests.sortBy,
            type: contestSubTab,
            page: currentPage,
            limit: 5
          };
          const res = await api.get(`/public/shop/${targetShopId}/customer-contests`, { params, headers });
          if (contestSubTab === 'participated') {
            setMyParticipatedContests(res.data.items || []);
          } else {
            setContests(res.data.items || []);
          }
          setTabPagination(res.data.pagination || { page: 1, limit: 5, total: 0, total_pages: 1 });
        }
      } catch (err) {
        console.error("Failed to load tab data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTabData();
  }, [id, token, activeTab, contestSubTab, searchQuery, currentPage, filters]);

  const primaryColor = shop?.theme?.primary_color || '#ea580c';

  // Group orders by shop name
  const ordersGroupedByShop = useMemo(() => {
    const groups: { [shopName: string]: any[] } = {};
    orders.forEach((o) => {
      const sName = o.shop_name || 'Store Network';
      if (!groups[sName]) groups[sName] = [];
      groups[sName].push(o);
    });
    return groups;
  }, [orders]);

  // Group rewards by shop name
  const rewardsGroupedByShop = useMemo(() => {
    const groups: { [shopName: string]: { shopId: string | null; items: any[] } } = {};
    discounts.forEach((r) => {
      const sName = r.shopName || 'Store Network';
      if (!groups[sName]) groups[sName] = { shopId: r.shop_id || null, items: [] };
      groups[sName].items.push(r);
    });
    return groups;
  }, [discounts]);

  // Group my contests by shop name
  const myContestsGroupedByShop = useMemo(() => {
    const groups: { [shopName: string]: { shopId: string | null; items: any[] } } = {};
    myParticipatedContests.forEach((c) => {
      const sName = c.shopName || 'Store Network';
      if (!groups[sName]) groups[sName] = { shopId: c.shop_id || null, items: [] };
      groups[sName].items.push(c);
    });
    return groups;
  }, [myParticipatedContests]);

  // Group live contests by shop name
  const liveContestsGroupedByShop = useMemo(() => {
    const groups: { [shopName: string]: { shopId: string | null; items: any[] } } = {};
    contests.forEach((c) => {
      const sName = c.shopName || 'Store Network';
      if (!groups[sName]) groups[sName] = { shopId: c.shop_id || null, items: [] };
      groups[sName].items.push(c);
    });
    return groups;
  }, [contests]);

  const renderPaginationControls = (totalPages: number, totalItems: number) => {
    if (!totalPages || totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs font-bold mt-4">
        <span className="text-slate-500">
          Page {currentPage} of {totalPages} ({totalItems} total)
        </span>
        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold">
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  };

  const handleBackToStore = () => {
    if (id) {
      window.location.href = `${STORE_APP_URL}/shop/${id}`;
    } else {
      window.history.back();
    }
  };

  const handleUseReward = (r: any) => {
    const targetShop = r.shop_id || id;
    if (targetShop) {
      window.location.href = `${STORE_APP_URL}/shop/${targetShop}`;
    } else {
      toast.error("Shop menu link not available for this reward");
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_refresh_token');
    localStorage.removeItem('customer_phone');
    localStorage.removeItem('customer_name');
    setToken(null);
    setShowLogoutConfirm(false);
    toast.success("Logged out successfully");
  };

  if (!token) {
    return (
      <CustomerAuthScreen
        shopId={id}
        onAuthenticated={(t, name, phone) => {
          setToken(t);
          setCustomerName(name);
          setCustomerPhone(phone);
        }}
        onBackToStore={handleBackToStore}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 font-sans">
      <Toaster position="top-center" />
      {/* Top Sticky Header */}
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={handleBackToStore}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <img src="/menukit-logo.svg" alt="Menukit Logo" className="w-7 h-7 object-contain" />
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">Menukit</span>
          </div>

          <button
            onClick={handleLogoutClick}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors cursor-pointer"
            title="Switch Account / Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* TOP PROFILE HERO CARD */}
        <div 
          className="rounded-3xl p-6 shadow-md border relative overflow-hidden transition-all"
          style={{
            backgroundColor: `${primaryColor}08`,
            borderColor: `${primaryColor}30`
          }}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div 
              className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {customerName ? customerName.charAt(0).toUpperCase() : 'C'}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                {customerName}
              </h2>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 flex items-center gap-1">
                  <Sparkles size={13} /> {customerCredits.availableCredit} Contest Credits
                </span>
                <button
                  onClick={() => setShowCreditBenefits(true)}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-[11px] shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  + Buy Credits
                </button>
                <button
                  onClick={() => setShowCreditBenefits(true)}
                  className="p-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Credit Options & Info"
                >
                  <Info size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono pt-0.5">
                {customerPhone || 'Mobile Not Verified'}
              </p>
            </div>
          </div>

          {/* TOP 4 STAT BOXES */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 text-center relative z-10">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Shops Visited</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {headerCounts.visited_shops ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Total Orders</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {headerCounts.orders ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Rewards Earned</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {headerCounts.rewards ?? 0}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Contests</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {headerCounts.contests ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION TABS (Sticky top below header) */}
        <div className="sticky top-16 z-20 py-2 -mx-4 px-4 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-all">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl shadow-xs">
            <button
              onClick={() => setActiveTab('shops')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'shops'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store size={14} className={activeTab === 'shops' ? 'text-emerald-500' : ''} />
              <span className="truncate">Shops Visited</span>
            </button>

            <button
              onClick={() => setActiveTab('rewards')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'rewards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Gift size={14} className={activeTab === 'rewards' ? 'text-amber-500' : ''} />
              <span className="truncate">Rewards</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag size={14} className={activeTab === 'orders' ? 'text-blue-500' : ''} />
              <span className="truncate">Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('contests')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'contests'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy size={14} className={activeTab === 'contests' ? 'text-purple-500' : ''} />
              <span className="truncate">Contests</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">
          {/* TAB 1: SHOPS VISITED */}
          {activeTab === 'shops' && (
            <motion.div
              key="shops"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">Visited Stores ({headerCounts.visited_shops || tabPagination.total})</h3>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={13} /> Store History
                </span>
              </div>

              {visitedShops.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Store size={36} className="mx-auto text-slate-400 opacity-50" />
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Visited Stores Yet</h4>
                  <p className="text-xs text-slate-500">Scan QR codes or order from partner shops to build your history!</p>
                </div>
              ) : (
                visitedShops.map((vs) => (
                  <div 
                    key={vs.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {vs.logo_url ? (
                          <img src={vs.logo_url} alt={vs.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          vs.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{vs.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{vs.total_orders} Orders</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600">₹{vs.total_spent.toFixed(0)} Spent</span>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`${STORE_APP_URL}/shop/${vs.id}`}
                      className="px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow-sm flex items-center gap-1 shrink-0 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>Menu</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ))
              )}
              {renderPaginationControls(tabPagination.total_pages, tabPagination.total)}
            </motion.div>
          )}

          {/* TAB 2: REWARDS */}
          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Claimable Customer Rewards ({headerCounts.rewards || tabPagination.total})
                </h3>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                  <Sparkles size={12} /> Available Now
                </span>
              </div>

              {Object.keys(rewardsGroupedByShop).length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Gift size={36} className="mx-auto text-slate-400 opacity-60" />
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Claimed Rewards Yet</h4>
                  <p className="text-xs text-slate-500">Join contests or become a store member to earn & claim rewards!</p>
                </div>
              ) : (
                Object.entries(rewardsGroupedByShop).map(([sName, shopGroup]) => (
                  <div key={sName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <Store size={14} className="text-amber-600" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white capitalize">{sName}</h4>
                      <span className="text-[10px] font-semibold text-slate-400 ml-auto">{shopGroup.items.length} Rewards</span>
                    </div>

                    <div className="space-y-3.5">
                      {shopGroup.items.map((r: any) => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedReward(r)}
                          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-400 dark:hover:border-amber-500/70 transition-all cursor-pointer group relative overflow-hidden space-y-4"
                        >
                          {/* Top Structured Store Badge Row */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border border-amber-200/80 dark:border-amber-800/60 inline-flex items-center gap-1.5">
                              <Sparkles size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="truncate max-w-[220px]">{r.rewardType || 'Store Offer'} • {r.shopName}</span>
                            </span>

                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                              Active Reward
                            </span>
                          </div>

                          {/* Main Content Area */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black shadow-md shrink-0 group-hover:scale-105 transition-transform">
                                <Gift size={22} />
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <h4 className="font-black text-lg text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                  {r.title}
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">
                                  {r.description}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUseReward(r);
                              }}
                              className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white shadow-md flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                            >
                              <span>Use in Menu</span>
                              <ExternalLink size={12} />
                            </button>
                          </div>

                          {/* Optional Dashed Coupon Footer */}
                          {r.code && (
                            <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Coupon Code:</span>
                                <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl font-mono font-black text-amber-600 dark:text-amber-400 tracking-widest text-xs">
                                  {r.code}
                                </span>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(r.code);
                                  toast.success(`Coupon code ${r.code} copied!`);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                              >
                                Copy Code
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {renderPaginationControls(tabPagination.total_pages, tabPagination.total)}
            </motion.div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">Shop Orders ({headerCounts.orders || tabPagination.total})</h3>
              </div>

              {Object.keys(ordersGroupedByShop).length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <ShoppingBag size={36} className="mx-auto text-slate-400 opacity-60" />
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Orders Found</h4>
                  <p className="text-xs text-slate-500">Order from store menus to view your history here!</p>
                </div>
              ) : (
                Object.entries(ordersGroupedByShop).map(([sName, shopOrders]) => (
                  <div key={sName} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <Store size={14} className="text-amber-600" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white capitalize">{sName}</h4>
                      <span className="text-[10px] font-bold text-slate-400 ml-auto">{shopOrders.length} Orders</span>
                    </div>

                    <div className="space-y-3">
                      {shopOrders.map((o) => (
                        <div 
                          key={o.id} 
                          onClick={() => setSelectedOrder(o)}
                          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer space-y-3 group relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 font-bold transition-colors">
                                Order #{o.id.slice(0, 8)}
                              </span>
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                                +{Math.floor(o.total_amount / 5)} Credits
                              </span>
                            </div>
                            <span className={`font-black uppercase tracking-wider px-2.5 py-1 rounded-lg text-[10px] ${
                              o.order_status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : o.order_status === 'rejected' || o.order_status === 'cancelled'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {o.order_status}
                            </span>
                          </div>

                          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                            {o.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  ₹{(item.price * item.quantity).toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                            <span className="text-slate-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 text-sm">Total: ₹{o.total_amount}</span>
                              <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
              {renderPaginationControls(tabPagination.total_pages, tabPagination.total)}
            </motion.div>
          )}

          {/* TAB 4: CONTESTS */}
          {activeTab === 'contests' && (
            <motion.div
              key="contests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400">Store Contests</h3>
                <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setContestSubTab('participated')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      contestSubTab === 'participated'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    My Contests ({headerCounts.contests || (contestSubTab === 'participated' ? tabPagination.total : myParticipatedContests.length)})
                  </button>
                  <button
                    onClick={() => setContestSubTab('live')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      contestSubTab === 'live'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Live Contests ({contestSubTab === 'live' ? tabPagination.total : contests.length})
                  </button>
                </div>
              </div>

              {contestSubTab === 'participated' && (
                <div className="space-y-4">
                  {Object.keys(myContestsGroupedByShop).length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <Trophy size={36} className="mx-auto text-slate-400 opacity-60" />
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Participated Contests</h4>
                      <p className="text-xs text-slate-500">Join active contests to win vouchers and discounts!</p>
                    </div>
                  ) : (
                    Object.entries(myContestsGroupedByShop).map(([sName, shopGroup]) => (
                      <div key={sName} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <Store size={16} className="text-purple-600" />
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">{sName}</h4>
                          <span className="text-xs font-semibold text-slate-400 ml-auto">{shopGroup.items.length} Contests</span>
                        </div>

                        <div className="space-y-3">
                          {shopGroup.items.map((c: any) => (
                            <div 
                              key={c.id} 
                              onClick={() => setSelectedContest(c)}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-purple-400 dark:hover:border-purple-500/60 hover:shadow-md transition-all cursor-pointer group"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider">• {c.status}</span>
                                  <h4 className="font-bold text-base text-slate-900 dark:text-white mt-0.5 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{c.title}</h4>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Prominent Contest Rank Badge */}
                                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-xs">
                                    <Trophy size={13} /> Rank #{c.rank || 1}
                                  </span>
                                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                    {c.pointsScore}
                                  </span>
                                </div>
                              </div>

                              {/* Highlighted Unlocked Prize Banner */}
                              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                                    <Gift size={18} />
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                                      Unlocked Prize
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block mt-0.5">
                                      {c.rewardWon}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {renderPaginationControls(tabPagination.total_pages, tabPagination.total)}
                </div>
              )}

              {contestSubTab === 'live' && (
                <div className="space-y-4">
                  {Object.keys(liveContestsGroupedByShop).length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <Trophy size={36} className="mx-auto text-slate-400 opacity-60" />
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Live Contests</h4>
                      <p className="text-xs text-slate-500">Check back later for exciting store challenges!</p>
                    </div>
                  ) : (
                    Object.entries(liveContestsGroupedByShop).map(([sName, shopGroup]) => (
                      <div key={sName} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <Store size={14} className="text-purple-600" />
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">{sName}</h4>
                          <span className="text-xs font-semibold text-slate-400 ml-auto">{shopGroup.items.length} Live</span>
                        </div>

                        <div className="space-y-3">
                          {shopGroup.items.map((c: any) => (
                            <div 
                              key={c.id} 
                              onClick={() => setSelectedContest(c)}
                              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-purple-400 dark:hover:border-purple-500/60 hover:shadow-md transition-all cursor-pointer group"
                            >
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">• {c.shopName || 'Store Network'}</span>
                                <h4 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">{c.title}</h4>
                                <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                              </div>

                              {/* Highlighted Prize Banner */}
                              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-2.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Gift size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span className="font-bold text-amber-900 dark:text-amber-200">Prize: {c.prize_description}</span>
                                </div>
                              </div>

                              <div className="flex justify-end pt-1">
                                <a
                                  href={`${STORE_APP_URL}/shop/${c.shop_id || id || 'global'}/contest/${c.id}`}
                                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs transition-all cursor-pointer shadow-sm"
                                >
                                  Join Contest
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {renderPaginationControls(tabPagination.total_pages, tabPagination.total)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Order Details • {selectedOrder.shop_name || 'Store Network'}
                  </span>
                  <h3 className="font-mono font-black text-lg text-slate-900 dark:text-white">
                    #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status & Credits Banner */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`font-black uppercase tracking-wider px-3 py-1 rounded-xl text-xs ${
                    selectedOrder.order_status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : selectedOrder.order_status === 'rejected' || selectedOrder.order_status === 'cancelled'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {selectedOrder.order_status}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : ''}
                  </span>
                </div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl">
                  +{Math.floor(selectedOrder.total_amount / 5)} Credits
                </span>
              </div>

              {/* Item Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Order Items</h4>
                <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2.5">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Qty: {item.quantity} x ₹{item.price}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 flex justify-between items-center font-black text-sm">
                    <span className="text-slate-700 dark:text-slate-300">Total Paid Amount</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{selectedOrder.total_amount}</span>
                  </div>
                </div>
              </div>

              {/* Action Link */}
              <div className="pt-2">
                <a
                  href={`${STORE_APP_URL}/shop/${selectedOrder.shop_id || id || 'global'}/order/${selectedOrder.id}`}
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Open Full Order View & Tracking</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner">
                <LogOut size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Confirm Logout</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Are you sure you want to log out of your Menukit Customer account?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* REWARD DETAILS POPUP MODAL */}
        {selectedReward && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSelectedReward(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full border border-amber-200 dark:border-slate-800 shadow-2xl space-y-5 relative overflow-hidden"
            >
              {/* Gradient Banner Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
              
              <button
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3.5 pt-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                  <Gift size={28} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
                    {selectedReward.rewardType || 'Store Offer'} • {selectedReward.shopName}
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                    {selectedReward.title}
                  </h3>
                </div>
              </div>

              <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-400 block tracking-wider">Offer Description</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedReward.description}
                </p>
              </div>

              {selectedReward.code && (
                <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3.5 space-y-1.5 text-center border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Coupon Code</span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono font-black text-base text-amber-700 dark:text-amber-300 tracking-widest">
                      {selectedReward.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedReward.code);
                        toast.success(`Coupon code ${selectedReward.code} copied!`);
                      }}
                      className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setSelectedReward(null)}
                  className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleUseReward(selectedReward);
                    setSelectedReward(null);
                  }}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Use in Menu</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CONTEST DETAILS BOTTOM SHEET */}
        {selectedContest && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSelectedContest(null)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full border border-purple-200 dark:border-slate-800 shadow-2xl space-y-5 relative overflow-hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Drag Pill for Mobile */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden mb-1" />

              <button
                onClick={() => setSelectedContest(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3.5 pt-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                  <Trophy size={28} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block truncate">
                    {selectedContest.shopName || selectedContest.shop?.name || 'Store Network'} • Contest Info
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                    {selectedContest.title}
                  </h3>
                </div>
              </div>

              {/* Status & Rank Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200/80">
                  Status: {selectedContest.status || 'Active'}
                </span>
                {selectedContest.rank && (
                  <span className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-xs">
                    <Trophy size={13} /> Rank #{selectedContest.rank}
                  </span>
                )}
                {selectedContest.pointsScore && (
                  <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedContest.pointsScore}
                  </span>
                )}
              </div>

              {/* Description Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">About Contest</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedContest.description || selectedContest.rules || selectedContest.details || 'Participate in store challenges to earn exclusive rewards, discounts, and credit points!'}
                </p>
              </div>

              {/* Reward/Prize Banner */}
              {(selectedContest.prize_description || selectedContest.rewardWon) && (
                <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                    <Gift size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                      Unlocked Prize & Reward
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block mt-0.5">
                      {selectedContest.rewardWon || selectedContest.prize_description}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => setSelectedContest(null)}
                  className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={`${STORE_APP_URL}/shop/${selectedContest.shop_id || id || 'global'}/contest/${selectedContest.id}`}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>View Details</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* TAB-SPECIFIC FILTER BOTTOM SHEET */}
        {isFilterModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsFilterModalOpen(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 relative overflow-hidden"
            >
              {/* Drag Pill for Mobile */}
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto sm:hidden" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Filter size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white capitalize">
                      Filter {activeTab}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Backend-powered search & filters
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* FILTERS FOR SHOPS TAB */}
              {activeTab === 'shops' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Minimum Orders Placed</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 3, 5].map((val) => (
                        <button
                          key={val}
                          onClick={() => setFilters(p => ({ ...p, shops: { ...p.shops, minOrders: val } }))}
                          className={`py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.shops.minOrders === val
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {val === 0 ? 'All' : `${val}+ Orders`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Sort By</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'most_orders', label: 'Most Orders' },
                        { id: 'highest_spent', label: 'Highest Spent' },
                        { id: 'name', label: 'Name A-Z' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilters(p => ({ ...p, shops: { ...p.shops, sortBy: item.id } }))}
                          className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.shops.sortBy === item.id
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FILTERS FOR REWARDS TAB */}
              {activeTab === 'rewards' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Offer / Discount Type</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'all', label: 'All Offers' },
                        { id: 'percentage', label: 'Percentage %' },
                        { id: 'flat', label: 'Flat Amount' },
                        { id: 'bogo_combo', label: 'BOGO & Combos' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilters(p => ({ ...p, rewards: { ...p.rewards, discountType: item.id } }))}
                          className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.rewards.discountType === item.id
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Sort By</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'newest', label: 'Newest First' },
                        { id: 'oldest', label: 'Oldest First' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilters(p => ({ ...p, rewards: { ...p.rewards, sortBy: item.id } }))}
                          className={`py-2 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.rewards.sortBy === item.id
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FILTERS FOR ORDERS TAB */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Order Status</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'all', label: 'All Statuses' },
                        { id: 'completed', label: 'Completed' },
                        { id: 'pending', label: 'Pending' },
                        { id: 'rejected', label: 'Rejected / Cancelled' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilters(p => ({ ...p, orders: { ...p.orders, status: item.id } }))}
                          className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.orders.status === item.id
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Sort By</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'newest', label: 'Newest First' },
                        { id: 'oldest', label: 'Oldest First' },
                        { id: 'amount_high', label: 'Highest Amount' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilters(p => ({ ...p, orders: { ...p.orders, sortBy: item.id } }))}
                          className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.orders.sortBy === item.id
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FILTERS FOR CONTESTS TAB */}
              {activeTab === 'contests' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Contest Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'all', label: 'All Contests' },
                        { id: 'active', label: 'Active' },
                        { id: 'completed', label: 'Completed' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setFilters(p => ({ ...p, contests: { ...p.contests, status: item.id } }))}
                          className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                            filters.contests.status === item.id
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleResetFilters}
                  className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credit Benefits & Rules Bottom Sheet Modal */}
      <AnimatePresence>
        {showCreditBenefits && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      Contest Entry Credits
                    </h3>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                      {customerCredits.availableCredit} Available Credits
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreditBenefits(false)}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Requirement badge */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-purple-500/10 border border-amber-500/20 p-3.5 rounded-2xl flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Trophy size={16} />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-bold leading-relaxed">
                  Participating in any contest requires <span className="text-amber-600 dark:text-amber-400 font-black">1 Contest Credit</span> per entry.
                </p>
              </div>

              {/* Benefits Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Exclusive Member Benefits
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5">
                      <Trophy size={16} />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Contest Participation & Guaranteed Credits</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Use credits to enter live store challenges. <strong>Earn +0.15 Credits back</strong> for every completed contest participation!</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5">
                      <Gift size={16} />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Get Exclusive Rewards</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Win discount coupons, free food items, gift cards & cashback.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white block">Order Cashback Bonus</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Automatically earn +0.15 free credits on orders ≥ ₹100.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Get Credits Options */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  How to Get Contest Credits
                </h4>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {/* Option 1: Direct Purchase */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-xs">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-xs block">Direct Purchase</span>
                        <span className="text-slate-600 dark:text-slate-300 text-[11px] font-semibold">₹5 = 1 Contest Credit via Cashfree</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowCreditBenefits(false);
                        handleBuyCredits();
                      }}
                      disabled={isBuyingCredits}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-black text-xs transition-all cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                    >
                      Buy ₹5
                    </button>
                  </div>

                  {/* Option 2: Place an Order */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 shadow-xs">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <span className="font-black text-slate-900 dark:text-white text-xs block">Place an Order & Earn</span>
                        <span className="text-slate-600 dark:text-slate-300 text-[11px] font-semibold">Earn +0.15 Credits on every order ≥ ₹100</span>
                      </div>
                    </div>
                    <a
                      href={`${STORE_APP_URL}/discover`}
                      onClick={() => setShowCreditBenefits(false)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      Order Now
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Standalone Fixed Bottom Search Bar with Filter Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search size={18} className="absolute left-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'shops' ? 'visited stores' : activeTab === 'rewards' ? 'rewards & discounts' : activeTab === 'orders' ? 'orders' : 'contests'}...`}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 rounded-2xl outline-none text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center relative active:scale-95 ${
              hasActiveFilters
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Filter Options"
          >
            <SlidersHorizontal size={18} />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Floating Animated Bottom-Right Discover Button (Scroll & Modal Hideable) */}
      <AnimatePresence>
        {showDiscover && !isAnyModalOpen && (
          <motion.a
            href={`${STORE_APP_URL}/discover`}
            initial={{ x: 80, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 80, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed right-3.5 bottom-20 z-50 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs py-2.5 px-4 rounded-full shadow-2xl flex items-center gap-1.5 cursor-pointer border border-white/40 hover:scale-105 active:scale-95 transition-transform group"
          >
            <Compass size={15} className="animate-spin-slow" />
            <span>Discover</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
