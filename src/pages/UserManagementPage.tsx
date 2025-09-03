import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { User } from '../types/User';
import { useAuth } from '../context/AuthContext';

const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    console.log('UserManagementPage useEffect - user:', user);
    if (user && user.role === 'admin') {
      console.log('User is admin, fetching users...');
      fetchUsers();
    } else {
      console.log('User is not admin or not authenticated:', user);
      setError('Access denied. Admin privileges required.');
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching users...');
      const response = await apiService.getAdminUsers();
      console.log('Response from getAdminUsers:', response);
      if (response && response.users) {
        console.log('Setting users:', response.users);
        setUsers(response.users);
        setFilteredUsers(response.users); // Initialize filtered users
      } else {
        console.log('Invalid response structure:', response);
        setError('Invalid response structure from server');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.error || error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  const filterUsers = (search: string) => {
    if (!search.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => {
      const searchLower = search.toLowerCase();
      return (
        user.email.toLowerCase().includes(searchLower) ||
        (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
        (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
        user.role.toLowerCase().includes(searchLower) ||
        user.status.toLowerCase().includes(searchLower) ||
        user.plan.toLowerCase().includes(searchLower)
      );
    });
    setFilteredUsers(filtered);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterUsers(value);
  };

  const approveUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      setError('');
      await apiService.approveUser(userId);
      
      // Update local state
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, status: 'approved', updatedAt: new Date().toISOString() }
          : user
      ));
      
      setSuccessMessage('User approved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const updateUserPlan = async (userId: string, plan: 'simple' | 'premium') => {
    try {
      setActionLoading(userId);
      setError('');
      await apiService.updateUserPlan(userId, plan);
      
      // Update local state
      setUsers(users.map(user => 
        user._id === userId ? { ...user, plan } : user
      ));
      
      setSuccessMessage(`User plan updated to ${plan}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update user plan');
    } finally {
      setActionLoading(null);
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      setActionLoading(userId);
      setError('');
      await apiService.suspendUser(userId);
      
      // Update local state
      setUsers(users.map(user => 
        user._id === userId 
          ? { ...user, status: 'suspended', updatedAt: new Date().toISOString() }
          : user
      ));
      
      setSuccessMessage('User suspended successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`;
      case 'suspended':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      case 'rejected':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400`;
      case 'user':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  const getPlanBadge = (plan: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (plan) {
      case 'premium':
        return `${baseClasses} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400`;
      case 'simple':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading user management...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin privileges
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">
            You need admin privileges to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Current user: {user ? `${user.email} (${user.role})` : 'Not authenticated'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4">
          <div className="text-sm text-green-700 dark:text-green-400">
            ✅ {successMessage}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="text-sm text-red-700 dark:text-red-400">
            ❌ {error}
          </div>
        </div>
      )}

              {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Search users
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search"
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search users by email, name, role, status, or plan..."
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilteredUsers(users);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Registered Users ({filteredUsers.length})
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Manage user accounts, approve pending users, and update subscription plans.
            </p>
          </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
                         <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
               {filteredUsers.map((userItem) => (
                <tr key={userItem._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                            {userItem.firstName?.[0] || userItem.email[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {userItem.firstName && userItem.lastName 
                            ? `${userItem.firstName} ${userItem.lastName}` 
                            : userItem.email
                          }
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {userItem.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getRoleBadge(userItem.role)}>
                      {userItem.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(userItem.status)}>
                      {userItem.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getPlanBadge(userItem.plan)}>
                      {userItem.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(userItem.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* Approve Button */}
                      {userItem.status === 'pending' && (
                        <button
                          onClick={() => approveUser(userItem._id)}
                          disabled={actionLoading === userItem._id}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {actionLoading === userItem._id ? '...' : 'Approve'}
                        </button>
                      )}

                      {/* Plan Change Dropdown */}
                      <select
                        value={userItem.plan}
                        onChange={(e) => updateUserPlan(userItem._id, e.target.value as 'simple' | 'premium')}
                        disabled={actionLoading === userItem._id}
                        className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="simple">Simple</option>
                        <option value="premium">Premium</option>
                      </select>

                      {/* Suspend Button */}
                      {userItem.status === 'approved' && userItem.role !== 'admin' && (
                        <button
                          onClick={() => suspendUser(userItem._id)}
                          disabled={actionLoading === userItem._id}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {actionLoading === userItem._id ? '...' : 'Suspend'}
                        </button>
                      )}

                      {/* Reactivate Button */}
                      {userItem.status === 'suspended' && (
                        <button
                          onClick={() => approveUser(userItem._id)}
                          disabled={actionLoading === userItem._id}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {actionLoading === userItem._id ? '...' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

                 {filteredUsers.length === 0 && !loading && (
           <div className="text-center py-12">
             <div className="text-gray-400 dark:text-gray-500 text-lg">
               {searchTerm ? 'No users match your search' : 'No users found'}
             </div>
             <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">
               {searchTerm ? 'Try adjusting your search terms' : 'Try refreshing the list or check if the backend is running'}
             </div>
           </div>
         )}
      </div>
    </div>
  );
};

export default UserManagementPage;
