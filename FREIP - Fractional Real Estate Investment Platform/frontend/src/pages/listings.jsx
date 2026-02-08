
import DashboardLayout from '../components/DashboardLayout';

export default function Listings() {
    return (
        <DashboardLayout>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">DAO Listings <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full ml-2">Beta</span></h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
                <p className="text-gray-500">Listing marketplace is under development.</p>
            </div>
        </DashboardLayout>
    );
}
