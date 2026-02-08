
import DashboardLayout from '../components/DashboardLayout';

export default function ActiveInvestments() {
    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Active Investments</h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-gray-500">You have no active investments yet.</p>
            </div>
        </DashboardLayout>
    );
}
