
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { authApi } from '../utils/api';
import { FcGoogle } from 'react-icons/fc';

export default function Login() {
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
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-poppins">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_12px_30px_0_rgba(19,21,35,0.1)] w-full max-w-md z-10 mx-4 border border-daolight">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Log in</h1>
          <p className="text-gray-500">Welcome back! Please enter your details.</p>
        </div>

        {/* Role Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!formData.isAdminLogin ? 'bg-white text-daoblue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFormData(prev => ({ ...prev, isAdminLogin: false }))}
          >
            Investor / Seller
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.isAdminLogin ? 'bg-white text-daoblue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFormData(prev => ({ ...prev, isAdminLogin: true }))}
          >
            Admin / Staff
          </button>
        </div>

        {error && <div className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded">{error}</div>}

        {formData.isAdminLogin ? (
          /* Admin/Staff Login Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="admin@freip.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-daoblue focus:ring-daoblue border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-gray-600">Remember for 30 days</label>
              </div>
              <Link href="/forgot-password">
                <span className="text-gray-900 hover:text-daoblue font-medium cursor-pointer">Forgot password?</span>
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-daoblue text-white py-3 rounded-lg font-medium shadow-lg shadow-blue-500/30 hover:bg-blue-800 transition-all duration-300 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        ) : (
          /* Investor/Seller Google Login Only */
          <div className="space-y-4">
            <div className="bg-blue-50 text-daoblue p-4 rounded-lg text-sm text-center mb-6">
              Please sign in with Google to access your Investor or Seller dashboard.
            </div>
            <button
              onClick={() => {
                // Mock Google Login for Demo
                localStorage.setItem('token', 'mock-google-token');
                localStorage.setItem('user', JSON.stringify({
                  id: 999,
                  email: 'investor@freip.com',
                  first_name: 'Google',
                  last_name: 'User',
                  role: 'investor' // Default to investor for demo
                }));
                router.push('/dashboard');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all bg-white shadow-sm"
            >
              <FcGoogle className="text-xl" />
              <span>Continue with Google</span>
            </button>
          </div>
        )}


        <p className="mt-8 text-center text-gray-600 text-sm">
          Don't have an account?{' '}
          <Link href="/register">
            <span className="text-daoblue font-semibold cursor-pointer hover:underline">Sign up</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
