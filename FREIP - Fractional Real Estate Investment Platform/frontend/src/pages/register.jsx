
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { authApi } from '../utils/api';
import { FcGoogle } from 'react-icons/fc';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role_id: 'investor',
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
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.register(formData);
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-poppins py-10">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_12px_30px_0_rgba(19,21,35,0.1)] w-full max-w-lg z-10 mx-4 border border-daolight">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h1>
          <p className="text-gray-500">Start your real estate investment journey today.</p>
        </div>

        {/* Role Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!formData.isAdminRegister ? 'bg-white text-daoblue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFormData(prev => ({ ...prev, isAdminRegister: false }))}
          >
            Investor / Seller
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.isAdminRegister ? 'bg-white text-daoblue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setFormData(prev => ({ ...prev, isAdminRegister: true }))}
          >
            Admin / Staff
          </button>
        </div>

        {error && <div className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded">{error}</div>}

        {formData.isAdminRegister ? (
          /* Admin/Staff Registration Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  placeholder="John"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  placeholder="Doe"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                placeholder="0300 1234567"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all bg-white"
              >
                <option value="staff">Staff</option>
                <option value="operations_manager">Operations Manager</option>
                <option value="appointment_setter">Appointment Setter</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-daoblue focus:border-transparent transition-all placeholder-gray-400"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-daoblue text-white py-3 rounded-lg font-medium shadow-lg shadow-blue-500/30 hover:bg-blue-800 transition-all duration-300 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : (
          /* Investor/Seller Google Signup Only */
          <div className="space-y-4">
            <div className="bg-blue-50 text-daoblue p-4 rounded-lg text-sm text-center mb-6">
              Join as an Investor or Seller using your Google account.
            </div>

            {/* Role Toggle for Google Signup */}
            <div className="flex justify-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="googleRole"
                  className="text-daoblue focus:ring-daoblue"
                  checked={formData.role_id === 'investor'}
                  onChange={() => setFormData(prev => ({ ...prev, role_id: 'investor' }))}
                />
                <span className="text-sm font-medium text-gray-700">Investor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="googleRole"
                  className="text-daoblue focus:ring-daoblue"
                  checked={formData.role_id === 'seller'}
                  onChange={() => setFormData(prev => ({ ...prev, role_id: 'seller' }))}
                />
                <span className="text-sm font-medium text-gray-700">Seller</span>
              </label>
            </div>

            <button
              onClick={() => {
                // Mock Google Signup for Demo
                localStorage.setItem('token', 'mock-google-token');
                localStorage.setItem('user', JSON.stringify({
                  id: 888,
                  email: 'new.user@freip.com',
                  first_name: 'Google',
                  last_name: 'User',
                  role: formData.role_id // Use selected role
                }));
                if (formData.role_id === 'seller') router.push('/seller');
                else router.push('/dashboard');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-all bg-white shadow-sm"
            >
              <FcGoogle className="text-xl" />
              <span>Sign up with Google</span>
            </button>
          </div>
        )}


        <p className="mt-8 text-center text-gray-600 text-sm">
          Already have an account?{' '}
          <Link href="/login">
            <span className="text-daoblue font-semibold cursor-pointer hover:underline">Log in</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
