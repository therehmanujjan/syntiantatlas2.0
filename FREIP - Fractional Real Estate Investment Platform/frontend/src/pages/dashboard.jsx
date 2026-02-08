
import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import StatsCard from '../components/StatsCard';
import { FaWallet, FaBuilding, FaThLarge, FaHome } from 'react-icons/fa';
import { BiBuildingHouse } from 'react-icons/bi';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('ownership');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Portfolio</h2>
        <Link href="/projects">
          <button className="bg-daoblue text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition shadow-lg shadow-blue-500/30">
            Explore Investments
          </button>
        </Link>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatsCard
          title="Amount Invested"
          value="0 PKR"
          icon={FaWallet}
        />
        <StatsCard
          title="Area Owned"
          value="0 sq. ft."
          icon={FaThLarge}
          subValues={[
            { label: 'Area Owned', value: '0 sq. ft.', icon: FaThLarge },
            { label: 'Residential', value: '0 sq. ft.', icon: BiBuildingHouse },
            { label: 'Commercial', value: '0 sq. ft.', icon: FaBuilding }
          ]}
        />
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-start gap-4">
        <div className="text-2xl">💸</div>
        <p className="text-sm text-gray-700">
          This is where you'll see a summary of your investment portfolio. To invest in our highly qualified projects,
          <Link href="/projects">
            <span className="text-daoblue font-semibold cursor-pointer hover:underline ml-1">click here.</span>
          </Link>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('ownership')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all
            ${activeTab === 'ownership'
              ? 'bg-white text-daoblue border-2 border-daoblue shadow-sm'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}
          `}
        >
          <FaHome /> Area Ownership
        </button>
        <button
          onClick={() => setActiveTab('accumulated')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all
            ${activeTab === 'accumulated'
              ? 'bg-white text-daoblue border-2 border-daoblue shadow-sm'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}
          `}
        >
          <FaBuilding /> Accumulated Property
        </button>
      </div>

      {/* Main Content Area (Empty State) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <FaWallet className="text-4xl text-daoblue opacity-50" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Your Wallet is Empty</h3>
        <p className="text-gray-500 max-w-md">
          at this moment. You can share your wallet address to receive area in your account directly here.
        </p>
      </div>

    </DashboardLayout>
  );
}
