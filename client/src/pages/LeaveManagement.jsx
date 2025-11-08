import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Plus, Calendar, Clock, Check, X, Eye, Filter } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Add state for detailed leave information modals
  const [showRemainingLeaveModal, setShowRemainingLeaveModal] = useState(false);
  const [showUsedLeaveModal, setShowUsedLeaveModal] = useState(false);
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false);
  const [showApprovedLeavesModal, setShowApprovedLeavesModal] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    reason: ''
  });

  const applyLeaveRef = React.useRef(null);

  const leaveTypes = [
    { value: 'vacation', label: 'Vacation', emoji: '🏖️' },
    { value: 'sick', label: 'Sick Leave', emoji: '🤒' },
    { value: 'personal', label: 'Personal Leave', emoji: '👤' },
    { value: 'emergency', label: 'Emergency Leave', emoji: '🚨' },
    { value: 'maternity', label: 'Maternity/Paternity', emoji: '👶' }
  ];

  useEffect(() => {
    loadLeaveData();
  }, []);

  const loadLeaveData = () => {
    // Mock leave requests data
    const mockLeaveRequests = [
      {
        id: 1,
        employee: { name: 'Jane Employee', department: 'Engineering', id: '2' },
        type: 'vacation',
        startDate: new Date(2024, 2, 15),
        endDate: new Date(2024, 2, 20),
        days: 6,
        reason: 'Family vacation to Hawaii',
        status: 'pending',
        appliedDate: new Date(2024, 2, 1),
        approver: null
      },
      {
        id: 2,
        employee: { name: 'Mike Johnson', department: 'Marketing', id: '3' },
        type: 'sick',
        startDate: new Date(2024, 2, 10),
        endDate: new Date(2024, 2, 12),
        days: 3,
        reason: 'Flu symptoms, doctor advised rest',
        status: 'approved',
        appliedDate: new Date(2024, 2, 9),
        approver: 'John Admin',
        approvedDate: new Date(2024, 2, 9)
      },
      {
        id: 3,
        employee: { name: 'Sarah Wilson', department: 'Design', id: '4' },
        type: 'personal',
        startDate: new Date(2024, 2, 25),
        endDate: new Date(2024, 2, 25),
        days: 1,
        reason: 'Wedding anniversary celebration',
        status: 'rejected',
        appliedDate: new Date(2024, 2, 20),
        approver: 'John Admin',
        approvedDate: new Date(2024, 2, 21),
        rejectionReason: 'Peak project deadline period'
      }
    ];

    setLeaveRequests(mockLeaveRequests);

    // Filter user's leaves if employee
    if (user.role === 'employee') {
      setMyLeaves(mockLeaveRequests.filter(leave => leave.employee.id === user.id));
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    const startDate = new Date(leaveForm.startDate);
    const endDate = new Date(leaveForm.endDate);
    const days = differenceInDays(endDate, startDate) + 1;

    const newLeave = {
      id: Date.now(),
      employee: { name: user.name, department: user.department, id: user.id },
      type: leaveForm.type,
      startDate,
      endDate,
      days,
      reason: leaveForm.reason,
      status: 'pending',
      appliedDate: new Date(),
      approver: null
    };

    setLeaveRequests(prev => [newLeave, ...prev]);
    setMyLeaves(prev => [newLeave, ...prev]);
    
    setShowApplyModal(false);
    setLeaveForm({
      type: 'vacation',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      reason: ''
    });

    alert('Leave request submitted successfully!');
  };

  const handleApplyLeaveClick = () => {
    setShowApplyModal(true);
    // Smooth scroll to the apply form after a short delay to ensure the modal is rendered
    setTimeout(() => {
      if (applyLeaveRef.current) {
        applyLeaveRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleApproveReject = (leaveId, action, rejectionReason = '') => {
    setLeaveRequests(prev => 
      prev.map(leave => 
        leave.id === leaveId 
          ? {
              ...leave,
              status: action,
              approver: user.name,
              approvedDate: new Date(),
              ...(action === 'rejected' && { rejectionReason })
            }
          : leave
      )
    );
    setShowDetailModal(false);
    alert(`Leave request ${action} successfully!`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">🕒 Pending</span>;
      case 'approved':
        return <span className="badge badge-success">✅ Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">❌ Rejected</span>;
      default:
        return <span className="badge">Unknown</span>;
    }
  };

  const getLeaveTypeEmoji = (type) => {
    const leaveType = leaveTypes.find(lt => lt.value === type);
    return leaveType ? leaveType.emoji : '📝';
  };

  const filteredRequests = leaveRequests.filter(leave => {
    if (filterStatus === 'all') return true;
    return leave.status === filterStatus;
  });

  const displayRequests = user.role === 'admin' ? filteredRequests : myLeaves;

  // Function to calculate leave details for modals
  const calculateLeaveDetails = () => {
    const approvedLeaves = displayRequests.filter(l => l.status === 'approved');
    const pendingLeaves = displayRequests.filter(l => l.status === 'pending');
    
    // Calculate remaining leave per month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyLeaveData = months.map((month, index) => {
      const monthLeaves = approvedLeaves.filter(leave => leave.startDate.getMonth() === index);
      const daysUsed = monthLeaves.reduce((acc, leave) => acc + leave.days, 0);
      return {
        month,
        daysUsed,
        remaining: Math.max(0, 2.5 - daysUsed) // Assuming 2.5 days per month (30 annual / 12 months)
      };
    });
    
    // Calculate used leave details
    const usedLeaveDetails = approvedLeaves.map(leave => ({
      ...leave,
      type: leave.type,
      days: leave.days,
      period: `${format(leave.startDate, 'MMM dd')} - ${format(leave.endDate, 'MMM dd')}`,
      month: format(leave.startDate, 'MMM yyyy')
    }));
    
    // Calculate pending requests details
    const pendingRequestsDetails = pendingLeaves.map(leave => ({
      ...leave,
      type: leave.type,
      days: leave.days,
      period: `${format(leave.startDate, 'MMM dd')} - ${format(leave.endDate, 'MMM dd')}`,
      appliedDate: format(leave.appliedDate, 'MMM dd, yyyy')
    }));
    
    // Calculate approved leaves details
    const approvedLeavesDetails = approvedLeaves.map(leave => ({
      ...leave,
      type: leave.type,
      days: leave.days,
      period: `${format(leave.startDate, 'MMM dd')} - ${format(leave.endDate, 'MMM dd')}`,
      approvedDate: format(leave.approvedDate || leave.appliedDate, 'MMM dd, yyyy')
    }));
    
    return {
      monthlyLeaveData,
      usedLeaveDetails,
      pendingRequestsDetails,
      approvedLeavesDetails,
      totalRemaining: user.role === 'employee' ? 18 : Math.round(displayRequests.length / 8 * 18),
      totalUsed: approvedLeaves.reduce((acc, l) => acc + l.days, 0),
      totalPending: pendingLeaves.length,
      totalApproved: approvedLeaves.length
    };
  };

  const leaveDetails = calculateLeaveDetails();

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1rem',
        padding: '2rem',
        marginBottom: '2rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%'
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', background: 'linear-gradient(45deg, #fff, #f0f9ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                📋 Leave Management
              </h1>
              <p style={{ fontSize: '1.125rem', opacity: 0.9 }}>
                {user.role === 'admin' ? 'Manage employee leave requests and track team availability' : 'Apply for leave and track your requests'}
              </p>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={16} />
                  <span>Current Year: {new Date().getFullYear()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} />
                  <span>{displayRequests.filter(l => l.status === 'pending').length} Pending Reviews</span>
                </div>
              </div>
            </div>
            {user.role === 'employee' && (
              <button 
                onClick={handleApplyLeaveClick}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem 2rem',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <Plus size={18} />
                Apply Leave
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Leave Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: user.role === 'admin' 
          ? 'repeat(auto-fit, minmax(400px, 1fr))' 
          : 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {/* Remaining Leave Card - Only for Employees */}
        {user.role === 'employee' && (
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '1rem',
            padding: '2rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowRemainingLeaveModal(true)}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px) scale(1.02)';
            e.target.style.boxShadow = '0 20px 40px rgba(16, 185, 129, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = 'none';
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Calendar size={24} />
                </div>
                <div style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'monospace' }}>
                  18
                </div>
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Days Remaining</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Out of 30 annual days</div>
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
                marginTop: '1rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(18 / 30) * 100}%`,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Used Leave Card - Only for Employees */}
        {user.role === 'employee' && (
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            borderRadius: '1rem',
            padding: '2rem',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onClick={() => setShowUsedLeaveModal(true)}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-5px) scale(1.02)';
            e.target.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = 'none';
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%'
            }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <Check size={24} />
                </div>
                <div style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'monospace' }}>
                  {displayRequests.filter(l => l.status === 'approved').reduce((acc, l) => acc + l.days, 0)}
                </div>
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Days Used</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Approved leave days</div>
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: '1rem',
                fontSize: '0.75rem'
              }}>
                <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '12px' }}>Vacation: {displayRequests.filter(l => l.status === 'approved' && l.type === 'vacation').reduce((acc, l) => acc + l.days, 0)}</span>
                <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '12px' }}>Sick: {displayRequests.filter(l => l.status === 'approved' && l.type === 'sick').reduce((acc, l) => acc + l.days, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Pending Requests Card */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '1rem',
          padding: '2rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setShowPendingRequestsModal(true)}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-5px) scale(1.02)';
          e.target.style.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0) scale(1)';
          e.target.style.boxShadow = 'none';
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.75rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                <Clock size={24} />
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'monospace' }}>
                {displayRequests.filter(l => l.status === 'pending').length}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>Pending Requests</div>
              {displayRequests.filter(l => l.status === 'pending').length > 0 && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.8)',
                  animation: 'pulse 2s infinite'
                }}></div>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Awaiting approval</div>
            {displayRequests.filter(l => l.status === 'pending').length > 0 && (
              <div style={{
                marginTop: '1rem',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}>
                ⚡ Action required
              </div>
            )}
          </div>
        </div>

        {/* Leave Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '1rem',
          padding: '2rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setShowApprovedLeavesModal(true)}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-5px) scale(1.02)';
          e.target.style.boxShadow = '0 20px 40px rgba(139, 92, 246, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0) scale(1)';
          e.target.style.boxShadow = 'none';
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '0.75rem',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                <Plus size={24} />
              </div>
              <div style={{ fontSize: '3rem', fontWeight: '800', fontFamily: 'monospace' }}>
                {displayRequests.filter(l => l.status === 'approved').length}
              </div>
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>Approved Leaves</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>This year</div>
            <div style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem'
            }}>
              <span>Utilization Rate</span>
              <span style={{ fontWeight: '600' }}>
                {Math.round((displayRequests.filter(l => l.status === 'approved').reduce((acc, l) => acc + l.days, 0) / 30) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters for Admin */}
      {user.role === 'admin' && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-body">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Filter size={16} />
              <select
                className="form-control form-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ maxWidth: '200px' }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Grid */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {user.role === 'admin' ? 'All Leave Requests' : 'My Leave Requests'}
          </h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {displayRequests.length} requests
          </span>
        </div>
        <div className="card-body">
          {displayRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <h3>No leave requests found</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                {user.role === 'employee' ? 'You haven\'t applied for any leaves yet.' : 'No leave requests to review.'}
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
              gap: '1.5rem' 
            }}>
              {displayRequests.map(leave => (
                <div 
                  key={leave.id} 
                  className="card" 
                  style={{
                    background: 'var(--background)',
                    border: `2px solid ${leave.status === 'pending' ? '#fbbf24' : leave.status === 'approved' ? '#10b981' : '#ef4444'}`,
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                  }}
                >
                  {/* Status Indicator Strip */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: leave.status === 'pending' ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 
                               leave.status === 'approved' ? 'linear-gradient(90deg, #10b981, #059669)' : 
                               'linear-gradient(90deg, #ef4444, #dc2626)'
                  }} />
                  
                  <div className="card-body" style={{ padding: '1.5rem' }}>
                    {/* Header Section */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          fontSize: '2rem', 
                          padding: '0.5rem',
                          background: 'var(--background-alt)',
                          borderRadius: '8px'
                        }}>
                          {getLeaveTypeEmoji(leave.type)}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                            {leave.type} Leave
                          </div>
                          {user.role === 'admin' && (
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                              <div style={{ fontWeight: '500' }}>{leave.employee.name}</div>
                              <div>{leave.employee.department}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {getStatusBadge(leave.status)}
                      </div>
                    </div>

                    {/* Duration Section */}
                    <div style={{ 
                      background: 'var(--background-alt)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      marginBottom: '1rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Duration</div>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                            {format(leave.startDate, 'MMM dd, yyyy')} → {format(leave.endDate, 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Days</div>
                          <div style={{ 
                            fontWeight: '700', 
                            fontSize: '1.5rem', 
                            color: 'var(--primary-color)'
                          }}>
                            {leave.days}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reason Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '500' }}>Reason</div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        lineHeight: '1.5',
                        color: 'var(--text-primary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {leave.reason}
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Applied on {format(leave.appliedDate, 'MMM dd, yyyy')}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeave(leave);
                            setShowDetailModal(true);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ 
                            padding: '0.375rem 0.75rem',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Eye size={12} />
                          View
                        </button>
                        {user.role === 'admin' && leave.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveReject(leave.id, 'approved');
                              }}
                              className="btn btn-success btn-sm"
                              style={{ 
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const reason = prompt('Rejection reason (optional):');
                                handleApproveReject(leave.id, 'rejected', reason);
                              }}
                              className="btn btn-danger btn-sm"
                              style={{ 
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem'
                              }}
                            >
                              <X size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Approval/Rejection Info */}
                    {leave.approver && (
                      <div style={{ 
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: leave.status === 'approved' ? '#ecfdf5' : '#fef2f2',
                        borderRadius: '6px',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                          {leave.status === 'approved' ? '✅ Approved' : '❌ Rejected'} by {leave.approver}
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          on {format(leave.approvedDate, 'MMM dd, yyyy')}
                        </div>
                        {leave.rejectionReason && (
                          <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                            "{leave.rejectionReason}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="modal-overlay" ref={applyLeaveRef}>
          <div className="modal" style={{
            animation: 'modalSlideIn 0.3s ease-out',
            transform: 'scale(1)',
            opacity: 1
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <h3 className="modal-title" style={{ margin: 0 }}>Apply for Leave</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-alt)';
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Leave Type</label>
                  <select
                    className="form-control form-select"
                    value={leaveForm.type}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Please provide a reason for your leave request..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ 
                  background: 'var(--background-alt)', 
                  padding: '1rem', 
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.875rem'
                }}>
                  <strong>Duration:</strong> {differenceInDays(new Date(leaveForm.endDate), new Date(leaveForm.startDate)) + 1} day(s)
                </div>
              </div>
              <div className="modal-footer" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                padding: '1.5rem',
                borderTop: '1px solid var(--border-color)'
              }}>
                <button 
                  type="button" 
                  onClick={() => setShowApplyModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {showDetailModal && selectedLeave && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Leave Request Details</h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <strong>Employee:</strong> {selectedLeave.employee.name}
                </div>
                <div>
                  <strong>Department:</strong> {selectedLeave.employee.department}
                </div>
                <div>
                  <strong>Leave Type:</strong> {getLeaveTypeEmoji(selectedLeave.type)} {selectedLeave.type}
                </div>
                <div>
                  <strong>Duration:</strong> {format(selectedLeave.startDate, 'MMM dd, yyyy')} to {format(selectedLeave.endDate, 'MMM dd, yyyy')} ({selectedLeave.days} days)
                </div>
                <div>
                  <strong>Status:</strong> {getStatusBadge(selectedLeave.status)}
                </div>
                <div>
                  <strong>Applied On:</strong> {format(selectedLeave.appliedDate, 'MMM dd, yyyy')}
                </div>
                <div>
                  <strong>Reason:</strong>
                  <div style={{ 
                    background: 'var(--background-alt)', 
                    padding: '0.75rem', 
                    borderRadius: 'var(--border-radius-sm)',
                    marginTop: '0.5rem'
                  }}>
                    {selectedLeave.reason}
                  </div>
                </div>
                {selectedLeave.approver && (
                  <div>
                    <strong>Approved/Rejected by:</strong> {selectedLeave.approver}
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      on {format(selectedLeave.approvedDate, 'MMM dd, yyyy')}
                    </div>
                  </div>
                )}
                {selectedLeave.rejectionReason && (
                  <div>
                    <strong>Rejection Reason:</strong>
                    <div style={{ 
                      background: '#fef2f2', 
                      padding: '0.75rem', 
                      borderRadius: 'var(--border-radius-sm)',
                      marginTop: '0.5rem',
                      color: '#991b1b'
                    }}>
                      {selectedLeave.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowDetailModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
              {user.role === 'admin' && selectedLeave.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApproveReject(selectedLeave.id, 'approved')}
                    className="btn btn-success"
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason (optional):');
                      handleApproveReject(selectedLeave.id, 'rejected', reason);
                    }}
                    className="btn btn-danger"
                  >
                    <X size={16} />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remaining Leave Detail Modal */}
      {showRemainingLeaveModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Remaining Leave Details</h3>
              <button
                onClick={() => setShowRemainingLeaveModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-alt)';
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Annual Leave Balance</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      Total remaining: {leaveDetails.totalRemaining} days out of 30 annual days
                    </p>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                    {leaveDetails.totalRemaining}
                  </div>
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(leaveDetails.totalRemaining / 30) * 100}%`,
                    height: '100%',
                    background: '#10b981',
                    borderRadius: '4px'
                  }}></div>
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem' }}>Monthly Breakdown</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '1rem' 
              }}>
                {leaveDetails.monthlyLeaveData.map((monthData, index) => (
                  <div 
                    key={index} 
                    style={{
                      background: 'var(--background-alt)',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{monthData.month}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span>Used: {monthData.daysUsed}</span>
                      <span style={{ color: '#10b981', fontWeight: '600' }}>Left: {monthData.remaining}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: '#e5e7eb',
                      borderRadius: '2px',
                      marginTop: '0.5rem',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(monthData.daysUsed / 2.5) * 100}%`,
                        height: '100%',
                        background: monthData.daysUsed > 2.5 ? '#ef4444' : '#3b82f6',
                        borderRadius: '2px'
                      }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowRemainingLeaveModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Used Leave Detail Modal */}
      {showUsedLeaveModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Used Leave Details</h3>
              <button
                onClick={() => setShowUsedLeaveModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-alt)';
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Total Used Leave</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      {leaveDetails.totalUsed} days used across all leave types
                    </p>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                    {leaveDetails.totalUsed}
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem' }}>Leave History</h4>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {leaveDetails.usedLeaveDetails.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {leaveDetails.usedLeaveDetails.map((leave, index) => (
                      <div 
                        key={index} 
                        style={{
                          background: 'var(--background)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1.5rem' }}>{getLeaveTypeEmoji(leave.type)}</span>
                              <div>
                                <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                  {leave.type} Leave
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                  {leave.period} • {leave.month}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                              {leave.days} {leave.days === 1 ? 'day' : 'days'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Approved
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No approved leave requests found
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowUsedLeaveModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Detail Modal */}
      {showPendingRequestsModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Pending Requests</h3>
              <button
                onClick={() => setShowPendingRequestsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-alt)';
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Pending Requests</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      {leaveDetails.totalPending} request(s) awaiting approval
                    </p>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                    {leaveDetails.totalPending}
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem' }}>Pending Requests Details</h4>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {leaveDetails.pendingRequestsDetails.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {leaveDetails.pendingRequestsDetails.map((leave, index) => (
                      <div 
                        key={index} 
                        style={{
                          background: 'var(--background)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1.5rem' }}>{getLeaveTypeEmoji(leave.type)}</span>
                              <div>
                                <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                  {leave.type} Leave
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                  {leave.period}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem' }}>
                                  Applied on {leave.appliedDate}
                                </div>
                              </div>
                            </div>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              color: 'var(--text-secondary)',
                              marginTop: '0.5rem',
                              fontStyle: 'italic'
                            }}>
                              "{leave.reason}"
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
                              {leave.days} {leave.days === 1 ? 'day' : 'days'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Pending
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No pending leave requests
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowPendingRequestsModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approved Leaves Detail Modal */}
      {showApprovedLeavesModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Approved Leaves</h3>
              <button
                onClick={() => setShowApprovedLeavesModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'var(--background-alt)';
                  e.target.style.color = 'var(--text-primary)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = 'var(--text-secondary)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Approved Leaves</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      {leaveDetails.totalApproved} leave(s) approved this year
                    </p>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                    {leaveDetails.totalApproved}
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem' }}>Approved Leaves Details</h4>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {leaveDetails.approvedLeavesDetails.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {leaveDetails.approvedLeavesDetails.map((leave, index) => (
                      <div 
                        key={index} 
                        style={{
                          background: 'var(--background)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '1rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '1.5rem' }}>{getLeaveTypeEmoji(leave.type)}</span>
                              <div>
                                <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                  {leave.type} Leave
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                  {leave.period}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                                  Approved on {leave.approvedDate}
                                </div>
                              </div>
                            </div>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              color: 'var(--text-secondary)',
                              marginTop: '0.5rem',
                              fontStyle: 'italic'
                            }}>
                              "{leave.reason}"
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                              {leave.days} {leave.days === 1 ? 'day' : 'days'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Approved
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No approved leave requests found
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowApprovedLeavesModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveManagement;
