
import DashboardLayout from '../components/DashboardLayout';

export default function Settings() {
    return (
        <DashboardLayout>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
                <h3 className="font-semibold mb-4">Profile Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled value="User" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" disabled value="user@example.com" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
