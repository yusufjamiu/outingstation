import { useState } from 'react';
import { Menu, Calendar, Users, Eye, TrendingUp } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const stats = [
    { 
      label: 'Total Events', 
      value: '248', 
      change: '+12%', 
      icon: Calendar,
      color: 'bg-blue-500'
    },
    { 
      label: 'Total Users', 
      value: '1,234', 
      change: '+8%', 
      icon: Users,
      color: 'bg-green-500'
    },
    { 
      label: 'Page Views', 
      value: '45.2K', 
      change: '+23%', 
      icon: Eye,
      color: 'bg-purple-500'
    },
    { 
      label: 'Revenue', 
      value: '₦2.4M', 
      change: '+15%', 
      icon: TrendingUp,
      color: 'bg-orange-500'
    },
  ];

  const recentEvents = [
    { id: 1, title: 'Tech Meetup 2026', status: 'Published', date: '2026-01-25' },
    { id: 2, title: 'Marathon Race', status: 'Draft', date: '2026-01-26' },
    { id: 3, title: 'Music Festival', status: 'Published', date: '2026-01-27' },
    { id: 4, title: 'Food Fair', status: 'Pending', date: '2026-01-28' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Admin</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-green-600">{stat.change}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Recent Events Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Recent Events</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {event.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          event.status === 'Published' ? 'bg-green-100 text-green-700' :
                          event.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {event.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-cyan-600 hover:text-cyan-700 font-medium">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}