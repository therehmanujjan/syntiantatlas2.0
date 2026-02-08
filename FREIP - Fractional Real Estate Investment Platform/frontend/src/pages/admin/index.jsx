import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
    FaUsers, FaBuilding, FaChartLine, FaMoneyBillWave,
    FaUserPlus, FaCheckCircle, FaClock, FaExclamationTriangle,
    FaSignOutAlt, FaCog, FaBell, FaSearch, FaPlus,
    FaUserShield, FaHome, FaClipboardList, FaHistory
} from 'react-icons/fa';
import { MdDashboard, MdPeople, MdBusinessCenter, MdVerifiedUser } from 'react-icons/md';

// Sidebar Navigation Items
const sidebarItems = [
    { icon: MdDashboard, label: 'Dashboard', href: '/admin' },
    { icon: MdPeople, label: 'Users', href: '/admin/users' },
    { icon: MdBusinessCenter, label: 'Properties', href: '/admin/properties' },
    { icon: FaMoneyBillWave, label: 'Transactions', href: '/admin/transactions' },
    { icon: MdVerifiedUser, label: 'KYC Queue', href: '/admin/kyc' },
    { icon: FaClipboardList, label: 'Audit Logs', href: '/admin/audit-logs' },
    { icon: FaCog, label: 'Settings', href: '/admin/settings' },
];

// Stats Card Component
const StatsCard = ({ icon: Icon, title, value, subtitle, color, trend }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="text-white text-xl" />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-sm">
                <span className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>
                <span className="text-gray-400 ml-2">vs last week</span>
            </div>
        )}
    </div>
);

// Create Staff Modal Component
const CreateStaffModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        role_id: 'staff'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [credentials, setCredentials] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create staff account');
            }

            setCredentials(data.credentials);
            onSuccess && onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl">
                {credentials ? (
                    // Show generated credentials
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaCheckCircle className="text-green-500 text-3xl" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Staff Account Created!</h3>
                        <p className="text-gray-500 text-sm mb-6">Share these credentials securely with the staff member.</p>

                        <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
                            <div className="mb-3">
                                <label className="text-xs text-gray-500">Email</label>
                                <p className="text-gray-900 font-mono">{credentials.email}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Temporary Password</label>
                                <p className="text-gray-900 font-mono bg-yellow-50 p-2 rounded">{credentials.temporaryPassword}</p>
                            </div>
                        </div>

                        <p className="text-amber-600 text-xs mb-4">
                            ⚠️ {credentials.note}
                        </p>

                        <button
                            onClick={() => {
                                setCredentials(null);
                                setFormData({ email: '', first_name: '', last_name: '', phone: '', role_id: 'staff' });
                                onClose();
                            }}
                            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    // Show form
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Create Staff Account</h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={formData.role_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="staff">Staff Member</option>
                                    <option value="operations_manager">Operations Manager</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {isLoading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [recentUsers, setRecentUsers] = useState([]);
    const [pendingProperties, setPendingProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        checkAuth();
        fetchDashboardData();
    }, []);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/admin/login');
            return;
        }

        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'admin') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.push('/admin/login');
            return;
        }

        setUser(parsedUser);
    };

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const headers = { 'Authorization': `Bearer ${token}` };
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

            // Fetch dashboard stats
            const statsRes = await fetch(`${baseUrl}/api/admin/dashboard`, { headers });
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            // Fetch recent users
            const usersRes = await fetch(`${baseUrl}/api/admin/users?limit=5`, { headers });
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setRecentUsers(usersData.users || []);
            }

            // Fetch pending properties
            const propsRes = await fetch(`${baseUrl}/api/admin/properties/pending`, { headers });
            if (propsRes.ok) {
                const propsData = await propsRes.json();
                setPendingProperties(propsData.properties || []);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/admin/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Admin Dashboard | FREIP</title>
                <meta name="description" content="FREIP Admin Dashboard" />
            </Head>

            <div className="min-h-screen bg-gray-50 flex">
                {/* Sidebar */}
                <aside className={`fixed inset-y-0 left-0 bg-slate-900 text-white transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-center border-b border-slate-700">
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            {sidebarCollapsed ? 'F' : 'FREIP Admin'}
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="mt-6 px-3">
                        {sidebarItems.map((item) => {
                            const isActive = router.pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}>
                                    <div className={`flex items-center px-4 py-3 mb-1 rounded-lg cursor-pointer transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`}
                                    >
                                        <item.icon className="text-xl" />
                                        {!sidebarCollapsed && <span className="ml-3 font-medium">{item.label}</span>}
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="absolute bottom-4 left-0 right-0 px-3">
                        <button
                            onClick={handleLogout}
                            className={`flex items-center w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors
                ${sidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            <FaSignOutAlt className="text-xl" />
                            {!sidebarCollapsed && <span className="ml-3 font-medium">Logout</span>}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                    {/* Header */}
                    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative">
                                <FaBell className="text-xl" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                    <FaUserShield className="text-white" />
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-gray-800">{user?.first_name} {user?.last_name}</p>
                                    <p className="text-xs text-gray-500">Administrator</p>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Dashboard Content */}
                    <div className="p-6">
                        {/* Welcome Banner */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.first_name}!</h2>
                                    <p className="text-blue-100">Here's what's happening with your platform today.</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
                                >
                                    <FaPlus />
                                    <span>Create Staff Account</span>
                                </button>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <StatsCard
                                icon={FaUsers}
                                title="Total Users"
                                value={stats?.users?.total || 0}
                                subtitle={`${stats?.users?.newThisWeek || 0} new this week`}
                                color="bg-blue-500"
                                trend={12}
                            />
                            <StatsCard
                                icon={FaBuilding}
                                title="Properties"
                                value={stats?.properties?.total || 0}
                                subtitle={`${stats?.properties?.active || 0} active listings`}
                                color="bg-green-500"
                                trend={8}
                            />
                            <StatsCard
                                icon={FaMoneyBillWave}
                                title="Total Invested"
                                value={`PKR ${((stats?.investments?.totalValue || 0) / 1000000).toFixed(1)}M`}
                                subtitle={`${stats?.investments?.newThisWeek || 0} investments this week`}
                                color="bg-purple-500"
                                trend={23}
                            />
                            <StatsCard
                                icon={FaClock}
                                title="Pending KYC"
                                value={stats?.kyc?.pendingVerifications || 0}
                                subtitle="Awaiting verification"
                                color="bg-amber-500"
                            />
                        </div>

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Users */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Recent Users</h3>
                                    <Link href="/admin/users">
                                        <span className="text-blue-600 text-sm hover:underline cursor-pointer">View All</span>
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {recentUsers.length > 0 ? recentUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                                                    {u.first_name?.[0]}{u.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                                                    <p className="text-sm text-gray-500">{u.email}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${u.role_id === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                    u.role_id === 'investor' ? 'bg-blue-100 text-blue-700' :
                                                        u.role_id === 'seller' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-700'
                                                }`}>
                                                {u.role_id}
                                            </span>
                                        </div>
                                    )) : (
                                        <p className="text-gray-500 text-center py-4">No users found</p>
                                    )}
                                </div>
                            </div>

                            {/* Pending Properties */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Pending Approvals</h3>
                                    <span className="bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium rounded-full">
                                        {pendingProperties.length} pending
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {pendingProperties.length > 0 ? pendingProperties.slice(0, 5).map((prop) => (
                                        <div key={prop.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <FaBuilding className="text-gray-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800">{prop.title}</p>
                                                    <p className="text-sm text-gray-500">{prop.city} • PKR {(prop.total_value / 1000000).toFixed(1)}M</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition">
                                                    <FaCheckCircle />
                                                </button>
                                                <button className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">
                                                    <FaExclamationTriangle />
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-gray-500 text-center py-4">No pending approvals</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h4 className="text-gray-500 text-sm font-medium mb-2">User Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Investors</span>
                                        <span className="font-semibold">{stats?.users?.investors || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${((stats?.users?.investors || 0) / (stats?.users?.total || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-gray-600">Sellers</span>
                                        <span className="font-semibold">{stats?.users?.sellers || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${((stats?.users?.sellers || 0) / (stats?.users?.total || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-gray-600">Staff</span>
                                        <span className="font-semibold">{stats?.users?.staff || 0}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${((stats?.users?.staff || 0) / (stats?.users?.total || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h4 className="text-gray-500 text-sm font-medium mb-2">Property Status</h4>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <p className="text-2xl font-bold text-green-600">{stats?.properties?.active || 0}</p>
                                        <p className="text-xs text-gray-500">Active</p>
                                    </div>
                                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                                        <p className="text-2xl font-bold text-amber-600">{stats?.properties?.pending || 0}</p>
                                        <p className="text-xs text-gray-500">Pending</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h4 className="text-gray-500 text-sm font-medium mb-2">Quick Actions</h4>
                                <div className="space-y-2 mt-4">
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="w-full py-2 px-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                        <FaUserPlus /> Create Staff Account
                                    </button>
                                    <Link href="/admin/properties">
                                        <button className="w-full py-2 px-4 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium flex items-center justify-center gap-2">
                                            <FaBuilding /> Review Properties
                                        </button>
                                    </Link>
                                    <Link href="/admin/kyc">
                                        <button className="w-full py-2 px-4 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition text-sm font-medium flex items-center justify-center gap-2">
                                            <MdVerifiedUser /> Verify KYC
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Staff Modal */}
            <CreateStaffModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={fetchDashboardData}
            />
        </>
    );
}
