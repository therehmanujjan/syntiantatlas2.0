
import DashboardLayout from '../components/DashboardLayout';

export default function Transactions() {
    return (
        <DashboardLayout>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Transactions</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-gray-500">No transaction history.</p>
            </div>
        </DashboardLayout>
    );
}
