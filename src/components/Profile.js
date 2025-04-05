// components/Profile.js
import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile, getUserPurchasedExams } from '../services/profileService';
import { getUserOrders, getOrderStatistics } from '../services/orderService';
import { getAllExams } from '../services/examService';

const Profile = ({ user }) => {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    preferences: {}
  });
  
  const [purchasedExams, setPurchasedExams] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0
  });
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // Get user profile data
        const profileData = await getUserProfile();
        
        // Split name into first and last name
        const nameParts = user.name ? user.name.split(' ') : ['', ''];
        const firstName = profileData.firstName || nameParts[0] || '';
        const lastName = profileData.lastName || nameParts.slice(1).join(' ') || '';
        
        setProfile({
          firstName,
          lastName,
          email: user.email,
          bio: profileData.bio || '',
          preferences: profileData.preferences || {}
        });
        
        // Get purchased exams
        const examIds = await getUserPurchasedExams();
        if (examIds.length > 0) {
          // Get all exams
          const allExams = await getAllExams();
          // Filter to only purchased exams
          const userExams = allExams.filter(exam => examIds.includes(exam.id));
          setPurchasedExams(userExams);
        }
        
        // Get order history and statistics
        const userOrders = await getUserOrders();
        setOrders(userOrders);
        
        const stats = await getOrderStatistics();
        setOrderStats(stats);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setError('Failed to load profile data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePreferenceChange = (e) => {
    const { name, checked } = e.target;
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: checked
      }
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError('');
      
      // Prepare profile data for update
      const profileData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        bio: profile.bio,
        preferences: profile.preferences,
        name: `${profile.firstName} ${profile.lastName}`.trim()
      };
      
      // Update profile in Firebase
      await updateUserProfile(profileData);
      
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading profile data...</div>;
  }
  
  return (
    <div className="profile-container max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      {/* Error and success messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      {/* Profile Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'profile'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'exams'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('exams')}
        >
          My Exams
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'orders'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('orders')}
        >
          Order History
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'settings'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      
      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Personal Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="py-2 px-4 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="block text-gray-700 font-medium mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={profile.firstName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div className="form-group">
                  <label className="block text-gray-700 font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={profile.lastName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
              
              <div className="form-group mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
              
              <div className="form-group mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Tell us about yourself..."
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-sm">First Name</p>
                  <p className="font-medium">{profile.firstName}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Last Name</p>
                  <p className="font-medium">{profile.lastName}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 text-sm">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
              
              <div>
                <p className="text-gray-600 text-sm">Bio</p>
                <p className="mt-1">{profile.bio || 'No bio provided'}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* My Exams Tab Content */}
      {activeTab === 'exams' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">My Exams</h2>
          
          {purchasedExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedExams.map(exam => (
                <div key={exam.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="h-40 bg-gray-200 flex items-center justify-center">
                    <img 
                      src={exam.thumbnail} 
                      alt={exam.title} 
                      className="max-h-full object-cover" 
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{exam.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{exam.category}</p>
                    <div className="flex justify-between">
                      <a 
                        href={`/exams/${exam.id}`} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </a>
                      <a 
                        href={`/exams/${exam.id}/start`} 
                        className="bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700"
                      >
                        Start Exam
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't purchased any exams yet.</p>
              <a 
                href="/exams" 
                className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Browse Exams
              </a>
            </div>
          )}
        </div>
      )}
      
      {/* Order History Tab Content */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Order History</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{orderStats.totalOrders}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold">${orderStats.totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Average Order</p>
              <p className="text-2xl font-bold">${orderStats.averageOrderValue.toFixed(2)}</p>
            </div>
          </div>
          
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th className="py-3 px-4 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="py-3 px-4 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-3 px-4 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="py-3 px-4 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="py-3 px-4 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <a 
                          href={`/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {order.id.substring(0, 8)}...
                        </a>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        {order.items.length} item(s)
                        <div className="text-xs text-gray-500">
                          {order.items.map(item => item.title).join(', ')}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
              <a 
                href="/exams" 
                className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Browse Exams
              </a>
            </div>
          )}
        </div>
      )}
      
      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Account Settings</h2>
          
          <div className="mb-6">
            <h3 className="font-medium text-lg mb-4">Notification Preferences</h3>
            <form>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="emailUpdates"
                    name="emailUpdates"
                    checked={profile.preferences.emailUpdates || false}
                    onChange={handlePreferenceChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="emailUpdates" className="ml-2 text-gray-700">
                    Receive email updates about new exams
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="promotionalEmails"
                    name="promotionalEmails"
                    checked={profile.preferences.promotionalEmails || false}
                    onChange={handlePreferenceChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="promotionalEmails" className="ml-2 text-gray-700">
                    Receive promotional emails and discounts
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="reminderEmails"
                    name="reminderEmails"
                    checked={profile.preferences.reminderEmails || false}
                    onChange={handlePreferenceChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="reminderEmails" className="ml-2 text-gray-700">
                    Receive exam reminder emails
                  </label>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-lg mb-4">Account Security</h3>
            <div className="space-y-4">
              <div>
                <button className="text-blue-600 hover:text-blue-800">
                  Change Password
                </button>
              </div>
              <div>
                <button className="text-blue-600 hover:text-blue-800">
                  Enable Two-Factor Authentication
                </button>
              </div>
              <div>
                <button className="text-red-600 hover:text-red-800">
                  Delete Account
                </button>
                <p className="text-sm text-gray-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;