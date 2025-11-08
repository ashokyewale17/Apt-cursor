import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Shield, Clock, Eye, EyeOff, Smartphone, Key, History, CheckCircle } from 'lucide-react';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfJoining: user?.dateOfJoining || new Date(),
    ...user
  });
  const [tempProfileData, setTempProfileData] = useState({ ...profileData });
  
  // Security state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showLoginHistory, setShowLoginHistory] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Fetch profile data from database
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        const userData = data.user;
        
        setProfileData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfJoining: userData.dateOfJoining || new Date(),
          position: userData.position || '',
          department: userData.department || '',
          role: userData.role || 'employee',
          _id: userData._id
        });
        
        setTempProfileData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfJoining: userData.dateOfJoining || new Date(),
          position: userData.position || '',
          department: userData.department || '',
          role: userData.role || 'employee',
          _id: userData._id
        });
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
    setTempProfileData({ ...profileData });
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const token = localStorage.getItem('token');
      // Use _id from profileData which comes from the database
      const userId = profileData._id || user._id || user.id;
      
      if (!userId) {
        setError('User ID not found');
        setSaving(false);
        return;
      }
      
      const response = await fetch(`/api/employees/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tempProfileData.name,
          email: tempProfileData.email,
          phone: tempProfileData.phone,
          address: tempProfileData.address
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedEmployee = await response.json();
      
      // Update local state
      setProfileData({
        ...profileData,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        address: updatedEmployee.address
      });
      
      // Update auth context
      updateUser({
        ...user,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: updatedEmployee.phone,
        address: updatedEmployee.address
      });
      
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempProfileData({ ...profileData });
    setIsEditing(false);
    setError('');
  };

  const handleInputChange = (field, value) => {
    setTempProfileData(prev => ({ ...prev, [field]: value }));
  };

  // Security functions
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Please check your password fields');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }

      alert('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (err) {
      alert(err.message || 'Failed to change password. Please try again.');
    }
  };
  
  const toggleTwoFactor = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    alert(twoFactorEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled!');
    setShowTwoFactor(false);
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', background: 'var(--background-alt)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem', background: 'var(--background-alt)', minHeight: '100vh' }}>
      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#dc2626',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '1.25rem',
              padding: '0 0.5rem'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modern Profile Header */}
      <div className="card" style={{ 
        marginBottom: '2rem', 
        background: 'linear-gradient(135deg, var(--primary-color) 0%, #6366f1 100%)',
        border: 'none',
        overflow: 'hidden'
      }}>
        <div className="card-body" style={{ color: 'white', position: 'relative' }}>
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            transform: 'translate(50%, -50%)'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
              border: '4px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '3.5rem',
              fontWeight: 'bold',
              boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {profileData.name}
                </h1>
                <span style={{
                  background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '50px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  border: `1px solid ${user.role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  backdropFilter: 'blur(10px)'
                }}>
                  {user.role === 'admin' ? (
                    <>
                      <Shield size={14} style={{ marginRight: '0.5rem' }} />
                      Administrator
                    </>
                  ) : (
                    <>
                      <User size={14} style={{ marginRight: '0.5rem' }} />
                      Employee
                    </>
                  )}
                </span>
              </div>
              
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                marginBottom: '0.75rem', 
                fontSize: '1.25rem',
                fontWeight: '500'
              }}>
                {user.position} • {user.department}
              </p>
              
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1rem' }}>
                <Clock size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Joined on {formatDate(profileData.dateOfJoining)}
              </p>
            </div>
            
            <div>
              {!isEditing ? (
                <button 
                  onClick={handleEdit} 
                  className="btn"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    backdropFilter: 'blur(10px)',
                    fontWeight: '600'
                  }}
                >
                  <Edit size={16} />
                  Edit Profile
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="btn"
                    style={{
                      background: saving ? 'rgba(107, 114, 128, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: 'white',
                      border: `1px solid ${saving ? 'rgba(107, 114, 128, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                      backdropFilter: 'blur(10px)',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1
                    }}
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Information Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Personal Information */}
        <div className="card" style={{
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          <div className="card-header" style={{
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <h3 className="card-title" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              <div style={{
                padding: '0.5rem',
                background: 'var(--primary-color)',
                borderRadius: '8px',
                color: 'white'
              }}>
                <User size={20} />
              </div>
              Personal Information
            </h3>
          </div>
          <div className="card-body" style={{ padding: '2rem' }}>
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  <User size={16} />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    className="form-control"
                    value={tempProfileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    style={{
                      padding: '0.875rem',
                      fontSize: '1rem',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <p style={{ 
                    margin: 0, 
                    fontWeight: '500', 
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)'
                  }}>
                    {profileData.name}
                  </p>
                )}
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  <Mail size={16} />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    className="form-control"
                    value={tempProfileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={{
                      padding: '0.875rem',
                      fontSize: '1rem',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <p style={{ 
                    margin: 0, 
                    fontWeight: '500', 
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)'
                  }}>
                    {profileData.email}
                  </p>
                )}
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  <Phone size={16} />
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    className="form-control"
                    value={tempProfileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={{
                      padding: '0.875rem',
                      fontSize: '1rem',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <p style={{ 
                    margin: 0, 
                    fontWeight: '500', 
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)'
                  }}>
                    {profileData.phone}
                  </p>
                )}
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  <MapPin size={16} />
                  Address
                </label>
                {isEditing ? (
                  <textarea
                    className="form-control"
                    rows="3"
                    value={tempProfileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    style={{
                      padding: '0.875rem',
                      fontSize: '1rem',
                      border: '2px solid var(--border-color)',
                      borderRadius: '8px',
                      resize: 'vertical'
                    }}
                  />
                ) : (
                  <p style={{ 
                    margin: 0, 
                    fontWeight: '500', 
                    fontSize: '1.1rem',
                    color: 'var(--text-primary)',
                    lineHeight: '1.5'
                  }}>
                    {profileData.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Work Information */}
        <div className="card" style={{
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}>
          <div className="card-header" style={{
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <h3 className="card-title" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              <div style={{
                padding: '0.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '8px',
                color: 'white'
              }}>
                <Shield size={20} />
              </div>
              Work Information
            </h3>
          </div>
          <div className="card-body" style={{ padding: '2rem' }}>
            <div style={{ display: 'grid', gap: '2rem' }}>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
                borderRadius: '12px',
                border: '1px solid #0ea5e9'
              }}>
                <label className="form-label" style={{ 
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#0369a1'
                }}>Employee ID</label>
                <p style={{ 
                  margin: 0, 
                  fontWeight: '700', 
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  color: '#0369a1',
                  letterSpacing: '0.1em'
                }}>
                  EMP-{(user._id || user.id || '').toString().slice(-4).padStart(4, '0')}
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: 'var(--text-primary)'
                }}>Position</label>
                <p style={{ 
                  margin: 0, 
                  fontWeight: '500', 
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)'
                }}>
                  {user.position}
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: 'var(--text-primary)'
                }}>Department</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary-color)',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {user.department}
                  </span>
                </div>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'var(--background-alt)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <label className="form-label" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: 'var(--text-primary)'
                }}>
                  <Calendar size={16} />
                  Date of Joining
                </label>
                <p style={{ 
                  margin: 0, 
                  fontWeight: '500', 
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)'
                }}>
                  {formatDate(profileData.dateOfJoining)}
                </p>
              </div>

              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                borderRadius: '12px',
                border: '1px solid #10b981'
              }}>
                <label className="form-label" style={{ 
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#047857'
                }}>Employment Status</label>
                <span style={{
                  background: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    background: 'white',
                    borderRadius: '50%'
                  }} />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Activity Summary */}
      <div className="card" style={{
        marginTop: '2rem',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div className="card-header" style={{
          background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1.5rem 2rem'
        }}>
          <h3 className="card-title" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0
          }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              borderRadius: '8px',
              color: 'white'
            }}>
              📊
            </div>
            Activity Summary
          </h3>
        </div>
        <div className="card-body" style={{ padding: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #fef3c7, #fbbf24)',
              borderRadius: '16px',
              border: '1px solid #f59e0b',
              textAlign: 'center',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#92400e',
                marginBottom: '0.5rem'
              }}>156</div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#92400e',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Days Worked</div>
            </div>
            
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #ddd6fe, #8b5cf6)',
              borderRadius: '16px',
              border: '1px solid #7c3aed',
              textAlign: 'center',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#581c87',
                marginBottom: '0.5rem'
              }}>1,248h</div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#581c87',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Total Hours</div>
            </div>
            
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #fed7d7, #f56565)',
              borderRadius: '16px',
              border: '1px solid #e53e3e',
              textAlign: 'center',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#9b2c2c',
                marginBottom: '0.5rem'
              }}>8</div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#9b2c2c',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Leaves Taken</div>
            </div>
            
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #c6f6d5, #48bb78)',
              borderRadius: '16px',
              border: '1px solid #38a169',
              textAlign: 'center',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#2f855a',
                marginBottom: '0.5rem'
              }}>97.2%</div>
              <div style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#2f855a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>Attendance Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Quick Actions */}
      <div className="card" style={{
        marginTop: '2rem',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div className="card-header" style={{
          background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1.5rem 2rem'
        }}>
          <h3 className="card-title" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0
          }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '8px',
              color: 'white'
            }}>
              ⚡
            </div>
            Quick Actions
          </h3>
        </div>
        <div className="card-body" style={{ padding: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            <button 
              onClick={() => window.location.href = user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard'}
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Clock size={20} />
              Go to Dashboard
            </button>
            
            <button 
              onClick={() => window.location.href = '/leave-management'}
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Calendar size={20} />
              Manage Leaves
            </button>
            
            {user.role === 'admin' && (
              <button 
                onClick={() => window.location.href = '/attendance-report'}
                style={{
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                📊 View Reports
              </button>
            )}
            
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to logout?')) {
                  logout();
                }
              }}
              style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px -8px rgba(0, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Modern Security Settings */}
      <div className="card" style={{
        marginTop: '2rem',
        marginBottom: '2rem',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div className="card-header" style={{
          background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          borderBottom: '1px solid var(--border-color)',
          padding: '1.5rem 2rem'
        }}>
          <h3 className="card-title" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0
          }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '8px',
              color: 'white'
            }}>
              <Shield size={20} />
            </div>
            Security & Privacy
          </h3>
        </div>
        <div className="card-body" style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2rem',
              background: 'linear-gradient(135deg, #fef3c7, #fbbf24)',
              borderRadius: '16px',
              border: '1px solid #f59e0b',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(146, 64, 14, 0.1)',
                  borderRadius: '12px',
                  color: '#92400e'
                }}>
                  🔐
                </div>
                <div>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#92400e'
                  }}>Password</h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#a16207',
                    marginTop: '0.25rem'
                  }}>
                    Last changed 3 months ago
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowChangePassword(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#92400e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#78350f'}
                onMouseLeave={(e) => e.target.style.background = '#92400e'}>
                Change Password
              </button>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2rem',
              background: 'linear-gradient(135deg, #fed7d7, #f56565)',
              borderRadius: '16px',
              border: '1px solid #e53e3e',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(155, 44, 44, 0.1)',
                  borderRadius: '12px',
                  color: '#9b2c2c'
                }}>
                  🔒
                </div>
                <div>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#9b2c2c'
                  }}>Two-Factor Authentication</h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#c53030',
                    marginTop: '0.25rem'
                  }}>
                    Add an extra layer of security
                  </p>
                </div>
              </div>
              {twoFactorEnabled ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: '#c6f6d5',
                    color: '#2f855a',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: '1px solid #48bb78',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CheckCircle size={14} />
                    Enabled
                  </span>
                  <button onClick={() => setShowTwoFactor(true)} style={{
                    padding: '0.5rem 1rem',
                    background: '#9b2c2c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}>
                    Manage
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowTwoFactor(true)} style={{
                  padding: '0.5rem 1rem',
                  background: '#9b2c2c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}>
                  Enable 2FA
                </button>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2rem',
              background: 'linear-gradient(135deg, #ddd6fe, #8b5cf6)',
              borderRadius: '16px',
              border: '1px solid #7c3aed',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(88, 28, 135, 0.1)',
                  borderRadius: '12px',
                  color: '#581c87'
                }}>
                  📊
                </div>
                <div>
                  <h4 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#581c87'
                  }}>Login History</h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#6b21a8',
                    marginTop: '0.25rem'
                  }}>
                    View your recent login activity
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowLoginHistory(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#581c87',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = '#4c1d95'}
                onMouseLeave={(e) => e.target.style.background = '#581c87'}>
                View History
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security Modals */}
      {showChangePassword && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} /> Change Password
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <input type="password" placeholder="Current Password" value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                style={{ 
                  padding: '0.75rem', 
                  border: '2px solid #e2e8f0', 
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: 'black'
                }} />
              <input type="password" placeholder="New Password" value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                style={{ 
                  padding: '0.75rem', 
                  border: '2px solid #e2e8f0', 
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: 'black'
                }} />
              <input type="password" placeholder="Confirm Password" value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                style={{ 
                  padding: '0.75rem', 
                  border: '2px solid #e2e8f0', 
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  color: 'black'
                }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowChangePassword(false)} className="btn btn-outline">Cancel</button>
              <button onClick={handlePasswordChange} className="btn btn-primary">Change Password</button>
            </div>
          </div>
        </div>
      )}
      
      {showTwoFactor && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '500px' }}>
            <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Smartphone size={20} /> Two-Factor Authentication
            </h3>
            <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <Shield size={48} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
              <p>Two-factor authentication adds an extra layer of security to your account.</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Status: {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTwoFactor(false)} className="btn btn-outline">Cancel</button>
              <button onClick={toggleTwoFactor} className={`btn ${twoFactorEnabled ? 'btn-danger' : 'btn-primary'}`}>
                {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showLoginHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} /> Login History
              </h3>
              <button 
                onClick={() => setShowLoginHistory(false)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-alt)';
                  e.target.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-secondary)';
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {[
                { date: '2024-01-15 09:30 AM', device: 'Windows - Chrome', location: 'New York, NY', status: 'success' },
                { date: '2024-01-14 05:45 PM', device: 'iPhone - Safari', location: 'New York, NY', status: 'success' },
                { date: '2024-01-14 08:15 AM', device: 'Windows - Chrome', location: 'New York, NY', status: 'success' },
                { date: '2024-01-13 11:22 PM', device: 'Unknown Device', location: 'Unknown', status: 'failed' },
                { date: '2024-01-13 06:30 PM', device: 'MacBook - Safari', location: 'Brooklyn, NY', status: 'success' }
              ].map((login, index) => (
                <div key={index} style={{
                  padding: '1rem', background: login.status === 'success' ? '#f0f9ff' : '#fef2f2',
                  border: `1px solid ${login.status === 'success' ? '#0ea5e9' : '#ef4444'}`,
                  borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{login.date}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {login.device} • {login.location}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                    background: login.status === 'success' ? '#dcfce7' : '#fee2e2',
                    color: login.status === 'success' ? '#16a34a' : '#dc2626'
                  }}>
                    {login.status === 'success' ? '✓ Success' : '✗ Failed'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
