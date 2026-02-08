
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { authApi } from '../utils/api';

export default function InternalLogin() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await authApi.login(formData);
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            const userRole = response.user.role;
            if (userRole === 'admin') router.push('/admin');
            else if (['staff', 'operations_manager', 'appointment_setter'].includes(userRole)) router.push('/staff');
            else {
                // If an investor tries to login here, redirect them
                setError("This portal is for Admin and Staff only.");
                localStorage.clear();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden font-poppins">
            {/* Dark Theme Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900 rounded-full blur-3xl opacity-20"></div>
            </div>

            <div className="bg-gray-800 p-8 md:p-10 rounded-2xl shadow-[0_12px_30px_0_rgba(0,0,0,0.3)] w-full max-w-md z-10 mx-4 border border-gray-700">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-full bg-gray-700 mb-4">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Internal Portal</h1>
                    <p className="text-gray-400">Restricted access for Admin & Staff only.</p>
                </div>

                {error && <div className="text-red-400 text-sm mb-4 text-center bg-red-900/20 p-2 rounded border border-red-900/50">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Internal Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="admin@freip.com"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-[1.02]"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Access Portal'}
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-500 text-sm">
                    Authorized personnel only. All activities are monitored.
                </p>
            </div>
        </div>
    );
}
