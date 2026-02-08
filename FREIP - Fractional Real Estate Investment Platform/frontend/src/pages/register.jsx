
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { FcGoogle } from 'react-icons/fc';

export default function Register() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('investor');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google OAuth configuration
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '965990836891-5ntm0vhkf3vosjku531f0hktppjrcph2.apps.googleusercontent.com';

  useEffect(() => {
    // Load Google Sign-In SDK
    const loadGoogleScript = () => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
          });
        }
      };
    };

    loadGoogleScript();
  }, []);

  const handleGoogleCallback = async (response) => {
    setIsLoading(true);
    setError(null);

    try {
      // Decode the JWT token from Google
      const payload = parseJwt(response.credential);

      // Send to backend for verification and user creation/login
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleToken: response.credential,
          email: payload.email,
          given_name: payload.given_name,
          family_name: payload.family_name,
          sub: payload.sub,
          role_id: selectedRole
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google authentication failed');
      }

      // Store tokens and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'seller') {
        router.push('/seller');
      } else if (data.user.role === 'admin') {
        router.push('/admin');
      } else if (data.user.role === 'operations_manager' || data.user.role === 'staff') {
        router.push('/staff');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to decode JWT
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return {};
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: render the button if popup is blocked
          setError('Popup was blocked. Please allow popups and try again.');
        }
      });
    } else {
      setError('Google Sign-In is not available. Please refresh the page.');
    }
  };

  return (
    <>
      <Head>
        <title>Register | FREIP</title>
        <meta name="description" content="Create your FREIP account and start investing in fractional real estate" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden font-poppins py-10">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-[0_12px_30px_0_rgba(19,21,35,0.1)] w-full max-w-lg z-10 mx-4 border border-gray-100">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h1>
            <p className="text-gray-500">Start your real estate investment journey today.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Investor/Seller Google Signup Only */}
          <div className="space-y-4">
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm text-center mb-6">
              Join as an Investor or Seller using your Google account.
            </div>

            {/* Role Toggle for Google Signup */}
            <div className="flex justify-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="googleRole"
                  checked={selectedRole === 'investor'}
                  onChange={() => setSelectedRole('investor')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm font-medium transition ${selectedRole === 'investor' ? 'text-blue-600' : 'text-gray-600'}`}>
                  Investor
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="googleRole"
                  checked={selectedRole === 'seller'}
                  onChange={() => setSelectedRole('seller')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm font-medium transition ${selectedRole === 'seller' ? 'text-blue-600' : 'text-gray-600'}`}>
                  Seller
                </span>
              </label>
            </div>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  <FcGoogle className="text-xl" />
                  <span>Sign up with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">or</span>
              </div>
            </div>

            {/* Staff/Admin Login Link */}
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-2">Are you a staff member?</p>
              <Link href="/admin/login">
                <span className="text-blue-600 font-medium text-sm hover:underline cursor-pointer">
                  Login with staff credentials →
                </span>
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-gray-600 text-sm">
            Already have an account?{' '}
            <Link href="/login">
              <span className="text-blue-600 font-semibold cursor-pointer hover:underline">Log in</span>
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-4 text-center text-gray-400 text-xs">
            By creating an account, you agree to our{' '}
            <Link href="/terms-and-conditions">
              <span className="text-blue-600 hover:underline cursor-pointer">Terms of Service</span>
            </Link>{' '}
            and{' '}
            <Link href="/privacy-policy">
              <span className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

