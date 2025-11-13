import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  Users, Clock, FileText, TrendingUp, AlertCircle, CheckCircle, Calendar, Timer,
  BarChart3, DollarSign, Target, Award, Activity, Settings, RefreshCw, Download,
  Filter, Search, Plus, ArrowUpRight, ArrowDownRight, Eye, Edit, Trash2,
  MapPin, Phone, Mail, Star, Briefcase, UserPlus, GitBranch, PieChart, TrendingDown, Edit3, X, Save
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isToday, isThisWeek, startOfWeek, endOfWeek, isSameDay, startOfDay, endOfDay } from 'date-fns';


// Add pulse animation styles
const pulseStyle = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
  :root {
    --info-color: #3b82f6;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = pulseStyle;
  document.head.appendChild(styleSheet);
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 7,
    activeToday: 6,
    avgHoursPerDay: '8.2',
    pendingLeaves: 2,
    onLeave: 1,
    absentToday: 0,
    monthlyHours: 1200,
    productivity: 92.5,
    newHires: 2,
    efficiency: 88.7,
    attendanceRate: 95.8
  });

  const [timeFilter, setTimeFilter] = useState('today');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [employeeStatus, setEmployeeStatus] = useState([]);
  const [realEmployees, setRealEmployees] = useState([]);
  const [attendanceChart, setAttendanceChart] = useState([]);
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState(new Map()); // Map of employeeId -> weekly data

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({});
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatusType, setSelectedStatusType] = useState('');
  const [statusEmployees, setStatusEmployees] = useState([]);
  const [settings, setSettings] = useState({
    companyName: 'Your Company',
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    overtimeThreshold: 40,
    lateThreshold: 15,
    autoBackup: true,
    theme: 'light'
  });
  const [showWorkingSaturdaysModal, setShowWorkingSaturdaysModal] = useState(false);
  const [workingSaturdays, setWorkingSaturdays] = useState([]);
  const [selectedSaturdayDate, setSelectedSaturdayDate] = useState('');
  const [saturdayNotes, setSaturdayNotes] = useState('');
  const [loadingWorkingSaturdays, setLoadingWorkingSaturdays] = useState(false);

  // Function to update employee status from database records
  const updateEmployeeStatusFromDatabase = useCallback((attendanceRecords) => {
    console.log('🔄 Updating employee status from database records...');
    console.log('📋 Attendance records received:', attendanceRecords.length);
    
    setRealEmployees(prevEmployees => {
      if (prevEmployees.length === 0) {
        console.warn('⚠️ No employees loaded yet, skipping status update');
        return prevEmployees;
      }
      
      // Create a map of employeeId to attendance record for quick lookup
      // Normalize IDs to strings for comparison
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        // Store with normalized string ID
        attendanceMap.set(String(record.employeeId), record);
      });
      
      console.log('📊 Attendance map created with', attendanceMap.size, 'records');
      console.log('📊 Employee IDs in map:', Array.from(attendanceMap.keys()));
      console.log('📊 Current employees:', prevEmployees.map(e => ({ id: String(e.id), name: e.name })));
      
      // Update each employee based on database records
      const updatedEmployees = prevEmployees.map(emp => {
        const empIdString = String(emp.id);
        const attendanceRecord = attendanceMap.get(empIdString);
        
        if (attendanceRecord) {
          // Employee has checked in today
          const checkInTime = new Date(attendanceRecord.checkInTime);
          const checkInFormatted = format(checkInTime, 'HH:mm');
          
          if (attendanceRecord.checkOutTime) {
            // Employee has checked out
            const checkOutTime = new Date(attendanceRecord.checkOutTime);
            const checkOutFormatted = format(checkOutTime, 'HH:mm');
            return {
              ...emp,
              status: 'completed',
              checkIn: checkInFormatted,
              checkOut: checkOutFormatted,
              location: attendanceRecord.location || 'Office',
              hours: attendanceRecord.hoursWorked
            };
          } else {
            // Employee is currently checked in
            console.log(`✅ Updated ${emp.name} to active status with check-in time ${checkInFormatted}`);
            return {
              ...emp,
              status: 'active',
              checkIn: checkInFormatted,
              checkOut: '-',
              location: attendanceRecord.location || 'Office',
              hours: '0:00'
            };
          }
        } else {
          // Employee hasn't checked in today - mark as absent if they were previously active
          const newStatus = emp.status === 'active' ? 'absent' : emp.status;
          if (newStatus === 'absent' && emp.status === 'active') {
            console.log(`⚠️ ${emp.name} was active but no longer has attendance record - marking as absent`);
          }
          return {
            ...emp,
            status: newStatus,
            checkIn: emp.status === 'active' ? '-' : (emp.checkIn || '-'),
            checkOut: emp.checkOut || '-',
            hours: emp.status === 'active' ? '0:00' : (emp.hours || '0:00')
          };
        }
      });
      
      // Update employee status state (this is what the UI uses)
      setEmployeeStatus(updatedEmployees);
      console.log('✅ Employee status updated. Active employees:', updatedEmployees.filter(e => e.status === 'active').length);
      
      // Filter out admins for stats
      const nonAdminEmployees = updatedEmployees.filter(emp => emp.role !== 'admin');
      
      // Calculate updated stats (excluding admins)
      const activeCount = nonAdminEmployees.filter(emp => emp.status === 'active' || emp.status === 'completed').length;
      const leaveCount = nonAdminEmployees.filter(emp => emp.status === 'leave').length;
      const absentCount = nonAdminEmployees.filter(emp => emp.status === 'absent').length;
      
      setStats(prev => ({
        ...prev,
        totalEmployees: nonAdminEmployees.length,
        activeToday: activeCount,
        onLeave: leaveCount,
        absentToday: absentCount,
        attendanceRate: nonAdminEmployees.length > 0 ? ((activeCount / nonAdminEmployees.length) * 100).toFixed(1) : '0'
      }));
      
      return updatedEmployees;
    });
  }, []);

  // Helper function to check if an employee is an admin (case-insensitive)
  const isAdmin = (employee) => {
    if (!employee || !employee.role) return false;
    const role = employee.role.toLowerCase().trim();
    return role === 'admin' || role.includes('admin');
  };

  // Real-time check for employee check-ins (optimized to prevent spam)
  const checkForEmployeeCheckIns = useCallback(async () => {
    try {
      console.log('🔄 Polling for attendance updates...');
      const timestamp = Date.now();
      let records = [];
      
      // Determine date range based on timeFilter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (timeFilter === 'today') {
        // Fetch today's attendance records
        const response = await fetch(`/api/attendance-records/today/all?_t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          cache: 'no-store'
        });
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.records)) {
          records = data.records;
        }
      } else if (timeFilter === 'yesterday') {
        // Fetch yesterday's attendance records
        const yesterday = subDays(today, 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        console.log('📅 Fetching yesterday\'s attendance for:', yesterdayStr);
        
        // Get the month and year for yesterday (might be different month)
        const yesterdayMonth = yesterday.getMonth() + 1;
        const yesterdayYear = yesterday.getFullYear();
        console.log('📅 Yesterday month/year:', yesterdayMonth, yesterdayYear);
        
        // Get all employees first
        const nonAdminEmployees = realEmployees.filter(emp => !isAdmin(emp));
        console.log('👥 Fetching attendance for', nonAdminEmployees.length, 'employees');
        
        // Fetch attendance for each employee in parallel
        const attendancePromises = nonAdminEmployees.map(async (employee) => {
          try {
            // Fetch attendance for yesterday's month
            const response = await fetch(`/api/attendance-records/employee/${employee.id}/${yesterdayMonth}/${yesterdayYear}`);
            const empRecords = response.ok ? await response.json() : [];
            
            // Find record for yesterday - normalize dates for comparison
            const yesterdayRecord = empRecords.find(r => {
              if (!r.date) return false;
              const recordDate = new Date(r.date);
              recordDate.setHours(0, 0, 0, 0);
              const recordDateStr = format(recordDate, 'yyyy-MM-dd');
              return recordDateStr === yesterdayStr;
            });
            
            if (yesterdayRecord) {
              let hoursWorked = '0:00';
              if (yesterdayRecord.outTime) {
                const checkInTime = new Date(yesterdayRecord.inTime);
                const checkOutTime = new Date(yesterdayRecord.outTime);
                const diffMs = checkOutTime - checkInTime;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                hoursWorked = `${diffHours}:${diffMinutes.toString().padStart(2, '0')}`;
              }
              
              return {
                employeeId: String(employee.id),
                employeeName: employee.name,
                department: employee.department,
                email: employee.email,
                checkInTime: yesterdayRecord.inTime,
                checkOutTime: yesterdayRecord.outTime || null,
                hoursWorked: hoursWorked,
                status: yesterdayRecord.outTime ? 'completed' : 'active',
                location: yesterdayRecord.location || 'Office'
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching attendance for employee ${employee.id}:`, error);
            return null;
          }
        });
        
        const results = await Promise.all(attendancePromises);
        records = results.filter(r => r !== null);
        console.log('✅ Found', records.length, 'attendance records for yesterday');
      } else if (timeFilter === 'week') {
        // Fetch this week's attendance records
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
        weekEnd.setHours(23, 59, 59, 999);
        console.log('📅 Fetching this week\'s attendance from', format(weekStart, 'yyyy-MM-dd'), 'to', format(weekEnd, 'yyyy-MM-dd'));
        
        // Get all employees first
        const nonAdminEmployees = realEmployees.filter(emp => !isAdmin(emp));
        console.log('👥 Fetching attendance for', nonAdminEmployees.length, 'employees');
        
        // Fetch attendance for each employee in parallel
        // We need to fetch data for both months if the week spans across months
        const attendancePromises = nonAdminEmployees.map(async (employee) => {
          try {
            // Get months that the week spans
            const monthsToFetch = new Set();
            const currentDate = new Date(weekStart);
            while (currentDate <= weekEnd) {
              const month = currentDate.getMonth() + 1;
              const year = currentDate.getFullYear();
              monthsToFetch.add(`${year}-${month}`);
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Fetch records for all months in the week
            const allRecords = [];
            for (const monthKey of monthsToFetch) {
              const [year, month] = monthKey.split('-').map(Number);
              try {
                const response = await fetch(`/api/attendance-records/employee/${employee.id}/${month}/${year}`);
                const empRecords = response.ok ? await response.json() : [];
                allRecords.push(...empRecords);
              } catch (err) {
                console.error(`Error fetching attendance for employee ${employee.id} for ${month}/${year}:`, err);
              }
            }
            
            // Find records within this week - normalize dates for comparison
            const weekRecords = allRecords.filter(r => {
              if (!r.date) return false;
              const recordDate = new Date(r.date);
              recordDate.setHours(0, 0, 0, 0);
              return recordDate >= weekStart && recordDate <= weekEnd;
            });
            
            // Get the most recent record for the week (or today's if available)
            if (weekRecords.length > 0) {
              // Sort by date descending to get the most recent
              weekRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
              const latestRecord = weekRecords[0];
              
              let hoursWorked = '0:00';
              if (latestRecord.outTime) {
                const checkInTime = new Date(latestRecord.inTime);
                const checkOutTime = new Date(latestRecord.outTime);
                const diffMs = checkOutTime - checkInTime;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                hoursWorked = `${diffHours}:${diffMinutes.toString().padStart(2, '0')}`;
              }
              
              return {
                employeeId: String(employee.id),
                employeeName: employee.name,
                department: employee.department,
                email: employee.email,
                checkInTime: latestRecord.inTime,
                checkOutTime: latestRecord.outTime || null,
                hoursWorked: hoursWorked,
                status: latestRecord.outTime ? 'completed' : 'active',
                location: latestRecord.location || 'Office'
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching attendance for employee ${employee.id}:`, error);
            return null;
          }
        });
        
        const results = await Promise.all(attendancePromises);
        records = results.filter(r => r !== null);
        console.log('✅ Found', records.length, 'attendance records for this week');
      }
      
      if (records.length > 0) {
        console.log('📊 Fetched', records.length, 'attendance records from database for', timeFilter);
        
        // Update employee status based on database records
        updateEmployeeStatusFromDatabase(records);
        
        // Update recent activity with new check-ins/check-outs (only for today)
        if (timeFilter === 'today') {
          const newActivities = records
            .filter(record => {
              // Only show records from the last hour to avoid cluttering
              const recordTime = new Date(record.checkInTime);
              return Date.now() - recordTime.getTime() < 3600000; // 1 hour
            })
            .map(record => ({
              id: `${record.employeeId}_${record.checkInTime}`,
              type: record.checkOutTime ? 'check-out' : 'check-in',
              employee: record.employeeName,
              department: record.department,
              time: new Date(record.checkOutTime || record.checkInTime),
              status: 'success',
              avatar: record.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            }));
          
          if (newActivities.length > 0) {
            setRecentActivity(prev => {
              // Merge with existing activities, avoiding duplicates
              const existingIds = new Set(prev.map(a => a.id));
              const uniqueNew = newActivities.filter(a => !existingIds.has(a.id));
              return [...uniqueNew, ...prev].slice(0, 15);
            });
          }
        }
      } else {
        // If no records found, reset employee status
        updateEmployeeStatusFromDatabase([]);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  }, [updateEmployeeStatusFromDatabase, timeFilter, realEmployees]);

  // Load weekly attendance data for all employees (excluding admins)
  const loadWeeklyAttendanceData = useCallback(async () => {
    if (realEmployees.length === 0) return;
    
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();
      
      // Filter out admins - admins don't check in/out
      const nonAdminEmployees = realEmployees.filter(emp => !isAdmin(emp));
      
      // Fetch attendance data for non-admin employees in parallel
      const attendancePromises = nonAdminEmployees.map(async (employee) => {
        try {
          const response = await fetch(`/api/attendance-records/employee/${employee.id}/${month}/${year}`);
          const records = response.ok ? await response.json() : [];
          
          // Process last 7 days
          const weeklyData = Array.from({ length: 7 }, (_, i) => {
            const date = subDays(new Date(), 6 - i);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isToday = date.toDateString() === today.toDateString();
            const dateKey = format(date, 'yyyy-MM-dd');
            
            if (isWeekend) {
              return {
                date: format(date, 'EEE'),
                status: 'weekend',
                fullDate: dateKey
              };
            }
            
            // Find record for this date
            const record = records.find(r => {
              const recordDate = new Date(r.date);
              return format(recordDate, 'yyyy-MM-dd') === dateKey;
            });
            
            if (record) {
              const dbStatus = record.status || 'Present';
              let status = 'absent';
              
              if (dbStatus === 'Leave' || dbStatus === 'Holiday' || dbStatus === 'Absent') {
                status = 'absent';
              } else if (record.inTime) {
                // Determine if late (check-in after 9:30 AM)
                const inTimeDate = new Date(record.inTime);
                const lateThreshold = new Date(inTimeDate);
                lateThreshold.setHours(9, 30, 0, 0);
                const isLate = inTimeDate > lateThreshold;
                
                if (record.outTime) {
                  // Completed day
                  status = isLate ? 'late' : 'present';
                } else {
                  // Active day (checked in but not out)
                  if (isToday) {
                    status = isLate ? 'late' : 'present';
                  } else {
                    status = 'present'; // Past day without check-out
                  }
                }
              }
              
              return {
                date: format(date, 'EEE'),
                status,
                fullDate: dateKey,
                isToday
              };
            }
            
            // No record found
            // Check if it's today and employee is active
            if (isToday && (employee.status === 'active' || employee.status === 'completed')) {
              return {
                date: format(date, 'EEE'),
                status: employee.status === 'late' ? 'late' : 'present',
                fullDate: dateKey,
                isToday: true
              };
            }
            
            return {
              date: format(date, 'EEE'),
              status: 'absent',
              fullDate: dateKey,
              isToday
            };
          });
          
          return { employeeId: employee.id, weeklyData };
        } catch (error) {
          console.error(`Error fetching weekly data for employee ${employee.id}:`, error);
          return { employeeId: employee.id, weeklyData: [] };
        }
      });
      
      const results = await Promise.all(attendancePromises);
      const dataMap = new Map();
      results.forEach(({ employeeId, weeklyData }) => {
        dataMap.set(employeeId, weeklyData);
      });
      
      setWeeklyAttendanceData(dataMap);
      console.log('✅ Loaded weekly attendance data for', results.length, 'non-admin employees');
    } catch (error) {
      console.error('Error loading weekly attendance data:', error);
    }
  }, [realEmployees]);

  useEffect(() => {
    loadDashboardData();
    loadWorkingSaturdays(); // Load working Saturdays on mount
    // Load real employees from API
    const fetchEmployees = async (includeInactive = false) => {
      try {
        const token = localStorage.getItem('token');
        const url = includeInactive 
          ? '/api/employees?page=1&limit=100&includeInactive=true'
          : '/api/employees?page=1&limit=100';
        const resp = await fetch(url, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : undefined
          }
        });
        const data = await resp.json();
        if (resp.ok && Array.isArray(data.employees)) {
          // Normalize to match existing UI shape with all fields
          const normalized = data.employees.map(e => ({
            _id: e._id,
            id: e._id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            address: e.address,
            department: e.department,
            position: e.position,
            role: e.role,
            salary: e.salary,
            dateOfJoining: e.dateOfJoining,
            employeeId: e.employeeId,
            birthDate: e.birthDate,
            companyEmail: e.companyEmail,
            isActive: e.isActive,
            status: e.isActive ? 'active' : 'inactive'
          }));
          setRealEmployees(normalized);
          try { localStorage.setItem('realEmployees', JSON.stringify(normalized)); } catch {}
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();
    
    // When employee modal opens, fetch all employees including inactive
    // This will be handled by useEffect below
    generateAnalyticsData();
    
    // Immediately check for any recent check-ins after loading data
    setTimeout(() => {
      checkForEmployeeCheckIns();
    }, 1000);

    // Real-time updates via Socket.io
    let socket;
    try {
      socket = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        withCredentials: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        forceNew: false
      });
      
      socket.on('connect', () => {
        console.log('✅ Socket.io connected:', socket.id);
        socket.emit('join', 'admin');
        // Immediately refresh data when socket connects
        checkForEmployeeCheckIns();
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.io disconnected:', reason);
        // If disconnected, increase polling frequency as fallback
        if (reason === 'io server disconnect') {
          // Server disconnected, reconnect manually
          socket.connect();
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket.io reconnected after', attemptNumber, 'attempts');
        // Refresh data when reconnected
        checkForEmployeeCheckIns();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        // On connection error, ensure polling continues
      });

      socket.on('employeeCheckIn', (evt) => {
        console.log('📥 Received check-in event via Socket.io:', evt);
        console.log('📥 Event details:', {
          employeeId: evt.employeeId,
          employeeName: evt.employeeName,
          department: evt.department,
          checkInTime: evt.checkInTime
        });
        
        // Update recent activity
        setRecentActivity(prev => [
          {
            id: Date.now(),
            type: 'check-in',
            employee: evt.employeeName || 'Unknown',
            department: evt.department || 'Unknown',
            time: new Date(evt.checkInTime || Date.now()),
            status: 'success',
            avatar: (evt.employeeName || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
          },
          ...prev
        ]);
        
        // Immediately refresh data from database to get accurate information
        // This ensures the employee list is updated even if socket event data is incomplete
        console.log('🔄 Triggering immediate data refresh after check-in event');
        checkForEmployeeCheckIns();
      });

      socket.on('employeeCheckOut', (evt) => {
        console.log('📥 Received check-out event via Socket.io:', evt);
        console.log('📥 Event details:', {
          employeeId: evt.employeeId,
          employeeName: evt.employeeName,
          department: evt.department,
          checkOutTime: evt.checkOutTime
        });
        
        setRecentActivity(prev => [
          {
            id: Date.now(),
            type: 'check-out',
            employee: evt.employeeName || 'Unknown',
            department: evt.department || 'Unknown',
            time: new Date(evt.checkOutTime || Date.now()),
            status: 'success',
            avatar: (evt.employeeName || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
          },
          ...prev
        ]);
        
        // Immediately refresh data from database to get accurate information
        console.log('🔄 Triggering immediate data refresh after check-out event');
        checkForEmployeeCheckIns();
      });
    } catch (e) {
      console.warn('Socket initialization failed:', e.message);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [checkForEmployeeCheckIns]);

  

  // Fetch all employees (including inactive) when modal opens
  useEffect(() => {
    if (showEmployeeModal) {
      const fetchAllEmployees = async () => {
        try {
          const token = localStorage.getItem('token');
          const resp = await fetch('/api/employees?page=1&limit=100&includeInactive=true', {
            headers: {
              'Authorization': token ? `Bearer ${token}` : undefined
            }
          });
          const data = await resp.json();
          if (resp.ok && Array.isArray(data.employees)) {
            const normalized = data.employees.map(e => ({
              _id: e._id,
              id: e._id,
              name: e.name,
              email: e.email,
              phone: e.phone,
              address: e.address,
              department: e.department,
              position: e.position,
              role: e.role,
              salary: e.salary,
              dateOfJoining: e.dateOfJoining,
              isActive: e.isActive,
              status: e.isActive ? 'active' : 'inactive'
            }));
            setRealEmployees(normalized);
          }
        } catch (err) {
          console.error('Failed to fetch employees:', err);
        }
      };
      fetchAllEmployees();
    }
  }, [showEmployeeModal]);

  // Load weekly attendance data when employees are loaded (excluding admins)
  useEffect(() => {
    if (realEmployees.length > 0) {
      // Filter out admins before loading attendance data
      const nonAdminEmployees = realEmployees.filter(emp => emp.role !== 'admin');
      if (nonAdminEmployees.length > 0) {
        loadWeeklyAttendanceData();
      }
      
      // Also update the chart data (aggregated view - excluding admins)
      const updateChartData = () => {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = subDays(new Date(), 6 - i);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const dateKey = format(date, 'yyyy-MM-dd');
          
          if (isWeekend) {
            return {
              date: format(date, 'EEE'),
              present: 0,
              absent: 0
            };
          }
          
          // Count present/absent from weeklyAttendanceData (already excludes admins)
          let present = 0;
          let absent = 0;
          
          weeklyAttendanceData.forEach((weeklyData) => {
            const dayData = weeklyData.find(d => d.fullDate === dateKey);
            if (dayData) {
              if (dayData.status === 'present' || dayData.status === 'late') {
                present++;
              } else if (dayData.status === 'absent') {
                absent++;
              }
            } else {
              absent++;
            }
          });
          
          return {
            date: format(date, 'EEE'),
            present,
            absent
          };
        });
        
        setAttendanceChart(last7Days);
      };
      
      // Update chart when weekly data changes
      if (weeklyAttendanceData.size > 0) {
        updateChartData();
      }
    }
  }, [realEmployees, weeklyAttendanceData, loadWeeklyAttendanceData]);

  // Refresh attendance data when timeFilter changes
  useEffect(() => {
    if (realEmployees.length > 0) {
      // Use a small delay to avoid rapid re-renders and glitching
      const timeoutId = setTimeout(() => {
        console.log('🔄 Refreshing attendance data for filter:', timeFilter);
        checkForEmployeeCheckIns();
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [timeFilter, realEmployees.length]); // Depend on timeFilter and employee count

  useEffect(() => {
    // Set up real-time polling once on component mount
    console.log('🔄 Setting up real-time polling system...');
    
    // Initial fetch immediately
    checkForEmployeeCheckIns();
    
    // Check for updates every 2 seconds for more responsive updates
    // Reduced from 3 seconds to ensure faster sync across devices
    const realTimeInterval = setInterval(() => {
      console.log('⏰ Polling interval triggered - fetching attendance data...');
      checkForEmployeeCheckIns();
    }, 2000);
    
    // Handle page visibility changes (important for mobile browsers)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 Page became visible - refreshing attendance data');
        // Immediately refresh when page becomes visible
        checkForEmployeeCheckIns();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle focus events (when user switches back to tab/window)
    const handleFocus = () => {
      console.log('👁️ Window focused - refreshing attendance data');
      checkForEmployeeCheckIns();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      console.log('🧹 Cleaning up real-time polling system');
      clearInterval(realTimeInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForEmployeeCheckIns]); // Include checkForEmployeeCheckIns in dependencies

  useEffect(() => {
    if (realEmployees.length > 0) {
      // Filter out admins before generating attendance
      const nonAdminEmployees = realEmployees.filter(emp => !isAdmin(emp));
      const adminCount = realEmployees.length - nonAdminEmployees.length;
      if (adminCount > 0) {
        console.log('🚫 Filtered out', adminCount, 'admin(s) from monthly attendance generation');
      }
      console.log('📊 Generating monthly attendance for', nonAdminEmployees.length, 'non-admin employees (filtered from', realEmployees.length, 'total)');
      generateMonthlyAttendance(nonAdminEmployees);
    }
  }, [realEmployees, selectedMonth, selectedYear]);

  const generateAnalyticsData = () => {
    const currentDate = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: format(date, 'MMM dd'),
        attendance: Math.floor(Math.random() * 30) + 85,
        productivity: Math.floor(Math.random() * 20) + 80,
      };
    });

    const departmentStats = [
      { name: 'Engineering', employees: 25, attendance: 92, productivity: 88 },
      { name: 'Marketing', employees: 12, attendance: 89, productivity: 91 },
      { name: 'Design', employees: 8, attendance: 94, productivity: 85 },
      { name: 'Sales', employees: 15, attendance: 87, productivity: 93 },
      { name: 'Finance', employees: 6, attendance: 96, productivity: 89 },
      { name: 'HR', employees: 4, attendance: 91, productivity: 87 }
    ];

    const leaveAnalytics = {
      thisMonth: {
        total: 23,
        approved: 18,
        pending: 3,
        rejected: 2
      },
      lastMonth: {
        total: 19,
        approved: 16,
        pending: 0,
        rejected: 3
      },
      types: [
        { type: 'Sick Leave', count: 8, percentage: 35 },
        { type: 'Vacation', count: 10, percentage: 43 },
        { type: 'Personal', count: 3, percentage: 13 },
        { type: 'Emergency', count: 2, percentage: 9 }
      ]
    };

    setAnalyticsData({
      weeklyTrends: last7Days,
      departmentStats,
      leaveAnalytics,
      overallMetrics: {
        avgAttendance: 91.2,
        avgProductivity: 89.1,
        employeeSatisfaction: 4.2
      }
    });
  };
    // Real employee database
  const loadDashboardData = () => {
    // Try to load existing employee data from localStorage first
    const savedEmployees = localStorage.getItem('realEmployees');
    let employees = [];
    
    if (savedEmployees) {
      try {
        employees = JSON.parse(savedEmployees);
        // Update employee status based on today's check-ins
        const today = format(new Date(), 'yyyy-MM-dd');
        employees = employees.map(emp => {
          const checkInKey = `checkIn_${emp.id}_${today}`;
          const checkInData = localStorage.getItem(checkInKey);
          
          if (checkInData) {
            try {
              const data = JSON.parse(checkInData);
              if (data.checkedIn && !data.checkOutTime) {
                return {
                  ...emp,
                  status: 'active',
                  checkIn: format(new Date(data.checkInTime), 'HH:mm'),
                  checkOut: '-',
                  location: data.location || 'Office'
                };
              } else if (data.checkOutTime) {
                // Calculate hours worked
                const checkInTime = new Date(data.checkInTime);
                const checkOutTime = new Date(data.checkOutTime);
                const diffMs = checkOutTime - checkInTime;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const hoursWorked = `${diffHours}:${diffMinutes.toString().padStart(2, '0')}`;
                
                return {
                  ...emp,
                  status: 'completed',
                  checkIn: format(new Date(data.checkInTime), 'HH:mm'),
                  checkOut: format(checkOutTime, 'HH:mm'),
                  location: data.location || 'Office',
                  hours: hoursWorked
                };
              }
            } catch (error) {
              console.error('Error parsing check-in data for employee', emp.id, ':', error);
            }
          }
          
          return emp;
        });
      } catch (error) {
        console.error('Error loading saved employee data:', error);
        // Fall back to default data if there's an error
        employees = getDefaultEmployees();
      }
    } else {
      // Use default data if no saved data exists
      employees = getDefaultEmployees();
    }

    setRealEmployees(employees);
    setEmployeeStatus(employees);
    
    // Save to localStorage for login authentication
    try {
      localStorage.setItem('realEmployees', JSON.stringify(employees));
    } catch (error) {
      console.log('Failed to save employee data to localStorage:', error);
    }

    // Fetch today's attendance from database to update employee status
    // This will override any localStorage-based status
    setTimeout(() => {
      checkForEmployeeCheckIns();
    }, 500);

    // Filter out admins for stats
    const nonAdminEmployees = employees.filter(emp => emp.role !== 'admin');
    
    // Update stats based on real data (excluding admins)
    const activeCount = nonAdminEmployees.filter(emp => emp.status === 'active' || emp.status === 'completed').length;
    const leaveCount = nonAdminEmployees.filter(emp => emp.status === 'leave').length;
    const absentCount = nonAdminEmployees.filter(emp => emp.status === 'absent').length;
    const avgProductivity = nonAdminEmployees.length > 0 
      ? nonAdminEmployees.reduce((sum, emp) => sum + emp.productivity, 0) / nonAdminEmployees.length 
      : 0;
    
    setStats(prev => ({
      ...prev,
      totalEmployees: nonAdminEmployees.length,
      activeToday: activeCount,
      onLeave: leaveCount,
      absentToday: absentCount,
      productivity: avgProductivity.toFixed(1),
      attendanceRate: nonAdminEmployees.length > 0 ? ((activeCount / nonAdminEmployees.length) * 100).toFixed(1) : '0'
    }));

    // Real activity data based on employees
    setRecentActivity([
      {
        id: 1,
        type: 'check-in',
        employee: 'Tushar Mhaskar',
        department: 'Admin',
        time: new Date(Date.now() - 15 * 60 * 1000),
        status: 'success',
        avatar: 'TM'
      },
      {
        id: 2,
        type: 'leave-request',
        employee: 'Harshal Lohar',
        department: 'Software',
        time: new Date(Date.now() - 45 * 60 * 1000),
        status: 'pending',
        avatar: 'HL'
      },
      {
        id: 3,
        type: 'task-completed',
        employee: 'Ashok Yewale',
        department: 'Software',
        time: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'success',
        avatar: 'AY'
      },
      {
        id: 4,
        type: 'check-in',
        employee: 'Pinky Chakrabarty',
        department: 'Operations',
        time: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: 'success',
        avatar: 'PC'
      }
    ]);
  };

  // Helper function to get default employee data
  const getDefaultEmployees = () => {
    return [
      {
        id: 1,
        name: 'Tushar Mhaskar',
        email: 'admin@company.com',
        password: 'admin123', // In real app, this should be hashed
        department: 'Admin',
        role: 'Admin & HR',
        status: 'active',
        checkIn: '08:30',
        checkOut: '-',
        hours: '8:00',
        location: 'Office',
        productivity: 98,
        joinDate: '2023-01-15',
        phone: '+91-9876543210',
        isAdmin: true
      },
      {
        id: 2,
        name: 'Vijay Solanki',
        email: 'vijay.solanki@company.com',
        password: 'test123',
        department: 'Testing',
        role: 'QA Engineer',
        status: 'active',
        checkIn: '09:00',
        checkOut: '-',
        hours: '7:30',
        location: 'Office',
        productivity: 94,
        joinDate: '2023-02-20',
        phone: '+91-9876543211'
      },
      {
        id: 3,
        name: 'Pinky Chakrabarty',
        email: 'pinky.chakrabarty@company.com',
        password: 'ops123',
        department: 'Operations',
        role: 'Operations Manager',
        status: 'active',
        checkIn: '08:45',
        checkOut: '-',
        hours: '8:15',
        location: 'Office',
        productivity: 96,
        joinDate: '2023-01-10',
        phone: '+91-9876543212'
      },
      {
        id: 4,
        name: 'Sanket Pawal',
        email: 'sanket.pawal@company.com',
        password: 'design123',
        department: 'Design',
        role: 'UI/UX Designer',
        status: 'active',
        checkIn: '09:15',
        checkOut: '-',
        hours: '7:45',
        location: 'Remote',
        productivity: 92,
        joinDate: '2023-03-05',
        phone: '+91-9876543213'
      },
      {
        id: 5,
        name: 'Ashok Yewale',
        email: 'ashok.yewale@company.com',
        password: 'soft123',
        department: 'Software',
        role: 'Software Developer',
        status: 'active',
        checkIn: '08:15',
        checkOut: '-',
        hours: '8:30',
        location: 'Office',
        productivity: 95,
        joinDate: '2023-02-01',
        phone: '+91-9876543214'
      },
      {
        id: 6,
        name: 'Harshal Lohar',
        email: 'harshal.lohar@company.com',
        password: 'soft123',
        department: 'Software',
        role: 'Senior Developer',
        status: 'absent',
        checkIn: '-',
        checkOut: '-',
        hours: '0:00',
        location: 'Absent',
        productivity: 0,
        joinDate: '2022-12-15',
        phone: '+91-9876543215'
      },
      {
        id: 7,
        name: 'Prasanna Pandit',
        email: 'prasanna.pandit@company.com',
        password: 'embed123',
        department: 'Embedded',
        role: 'Embedded Engineer',
        status: 'late',
        checkIn: '10:30',
        checkOut: '-',
        hours: '6:30',
        location: 'Office',
        productivity: 85,
        joinDate: '2023-03-20',
        phone: '+91-9876543216'
      }
    ];
  };

  const generateMonthlyAttendance = (employees) => {
    // Filter out admins before generating attendance (case-insensitive check)
    const nonAdminEmployees = employees.filter(emp => !isAdmin(emp));
    
    // Debug: Log filtered results
    if (employees.length !== nonAdminEmployees.length) {
      const admins = employees.filter(emp => isAdmin(emp));
      console.log('🚫 Filtered out', admins.length, 'admin(s) from monthly attendance:', admins.map(a => ({ name: a.name, role: a.role })));
    }
    
    const monthlyData = nonAdminEmployees.map(employee => {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const attendanceRecords = [];
      let presentDays = 0;
      let totalHours = 0;
      let leaveDays = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        if (!isWeekend && date <= new Date()) {
          const isPresent = Math.random() > 0.1; // 90% attendance rate
          const isLate = Math.random() < 0.15; // 15% late rate
          const isOnLeave = Math.random() < 0.05; // 5% leave rate
          
          let status = 'present';
          let inTime = '';
          let outTime = '';
          let hoursWorked = 0;
          
          if (isOnLeave) {
            status = 'leave';
            leaveDays++;
          } else if (isPresent) {
            const baseInHour = isLate ? 9 + Math.floor(Math.random() * 2) : 8 + Math.floor(Math.random() * 2);
            const inMinutes = Math.floor(Math.random() * 60);
            const outHour = baseInHour + 8 + Math.floor(Math.random() * 2);
            const outMinutes = Math.floor(Math.random() * 60);
            
            inTime = `${baseInHour.toString().padStart(2, '0')}:${inMinutes.toString().padStart(2, '0')}`;
            outTime = `${outHour.toString().padStart(2, '0')}:${outMinutes.toString().padStart(2, '0')}`;
            
            const inDate = new Date(date);
            inDate.setHours(baseInHour, inMinutes);

            const outDate = new Date(date);
            outDate.setHours(outHour, outMinutes);
            
            hoursWorked = (outDate - inDate) / (1000 * 60 * 60);
            totalHours += hoursWorked;
            presentDays++;
            
            if (isLate) {
              status = 'late';
            }
          } else {
            status = 'absent';
          }
          
          attendanceRecords.push({
            date: day,
            status,
            inTime,
            outTime,
            hoursWorked: hoursWorked.toFixed(1)
          });
        } else if (isWeekend) {
          attendanceRecords.push({
            date: day,
            status: 'weekend',
            inTime: '',
            outTime: '',
            hoursWorked: '0'
          });
        }
      }
      
      const avgHoursDecimal = presentDays > 0 ? (totalHours / presentDays) : 0;
      const avgHours = presentDays > 0 ? (totalHours / presentDays).toFixed(1) : '0.0';
      
      return {
        employee,
        attendanceRecords,
        summary: {
          presentDays,
          leaveDays,
          totalHours: totalHours.toFixed(1),
          avgHours,
          attendanceRate: ((presentDays / (daysInMonth - 8)) * 100).toFixed(1) // Excluding weekends
        }
      };
    });
    
    setMonthlyAttendance(monthlyData);
  };



  const handleMonthChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    // Regenerate attendance data for new month (excluding admins)
    const nonAdminEmployees = realEmployees.filter(emp => !isAdmin(emp));
    generateMonthlyAttendance(nonAdminEmployees);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">🟢 Active</span>;
      case 'break':
        return <span className="badge badge-warning">☕ Break</span>;
      case 'meeting':
        return <span className="badge badge-info">👥 Meeting</span>;
      case 'late':
        return <span className="badge badge-danger">⏰ Late</span>;
      case 'leave':
        return <span className="badge badge-info">🏖️ On Leave</span>;
      case 'absent':
        return <span className="badge badge-danger">❌ Absent</span>;
      default:
        return <span className="badge">📴 Offline</span>;
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'check-in':
        return '🟢';
      case 'check-out':
        return '🔴';
      case 'leave-request':
        return '📝';
      case 'late-arrival':
        return '⏰';
      case 'task-completed':
        return '✅';
      case 'overtime':
        return '🌙';
      case 'new-hire':
        return '👋';
      default:
        return '📋';
    }
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'check-in':
        return `${activity.employee} checked in`;
      case 'check-out':
        return `${activity.employee} checked out`;
      case 'leave-request':
        return `${activity.employee} requested leave`;
      case 'late-arrival':
        return `${activity.employee} arrived late`;
      case 'task-completed':
        return `${activity.employee} completed a task`;
      case 'overtime':
        return `${activity.employee} working overtime`;
      case 'new-hire':
        return `${activity.employee} joined the team`;
      default:
        return `${activity.employee} activity`;
    }
  };

  // Separate function to update stats and employee status without full reload (kept for backward compatibility)
  const updateEmployeeStats = useCallback(() => {
    // This function now just triggers a database fetch
    checkForEmployeeCheckIns();
  }, [checkForEmployeeCheckIns]);



  // Load working Saturdays
  const loadWorkingSaturdays = async () => {
    setLoadingWorkingSaturdays(true);
    try {
      const token = localStorage.getItem('token');
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // 2 months back
      const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0); // 3 months forward
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      const response = await fetch(
        `/api/working-saturdays?startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: {
            'Authorization': token ? `Bearer ${token}` : undefined
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setWorkingSaturdays(data);
      } else {
        console.error('Failed to load working Saturdays');
        setWorkingSaturdays([]);
      }
    } catch (error) {
      console.error('Error loading working Saturdays:', error);
      setWorkingSaturdays([]);
    } finally {
      setLoadingWorkingSaturdays(false);
    }
  };

  // Add working Saturday
  const addWorkingSaturday = async () => {
    if (!selectedSaturdayDate) {
      alert('Please select a Saturday date');
      return;
    }
    
    const selectedDate = new Date(selectedSaturdayDate);
    if (selectedDate.getDay() !== 6) {
      alert('Please select a Saturday');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/working-saturdays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({
          date: selectedSaturdayDate,
          notes: saturdayNotes
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Working Saturday added successfully');
        setSelectedSaturdayDate('');
        setSaturdayNotes('');
        await loadWorkingSaturdays();
      } else {
        alert(data.error || 'Failed to add working Saturday');
      }
    } catch (error) {
      console.error('Error adding working Saturday:', error);
      alert('Failed to add working Saturday');
    }
  };

  // Remove working Saturday
  const removeWorkingSaturday = async (date) => {
    if (!confirm('Are you sure you want to remove this working Saturday?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/working-saturdays/${date}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Working Saturday removed successfully');
        await loadWorkingSaturdays();
      } else {
        alert(data.error || 'Failed to remove working Saturday');
      }
    } catch (error) {
      console.error('Error removing working Saturday:', error);
      alert('Failed to remove working Saturday');
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      loadDashboardData();
      setIsRefreshing(false);
    }, 1000);
  };



  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <ArrowUpRight size={16} style={{ color: 'var(--success-color)' }} />;
      case 'down': return <ArrowDownRight size={16} style={{ color: 'var(--danger-color)' }} />;
      default: return <div style={{ width: 16, height: 16 }} />;
    }
  };

  const convertDecimalToHoursMinutes = (decimalHours) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    // Handle case where minutes round to 60
    if (minutes === 60) {
      return `${hours + 1}h 0m`;
    }
    return `${hours}h ${minutes}m`;
  };

  // Helper function to filter out admins
  const filterNonAdmins = (employees) => {
    return employees.filter(emp => emp.role !== 'admin');
  };

  const filteredEmployees = filterNonAdmins(employeeStatus).filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Employee management functions
  const handleTotalEmployeesClick = () => {
    setShowEmployeeModal(true);
  };

  const handleEmployeeEdit = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleEmployeeSave = async (updatedEmployee) => {
    // Update local state
    const updatedEmployees = realEmployees.map(emp => {
      const empId = emp._id || emp.id;
      const updatedId = updatedEmployee._id || updatedEmployee.id;
      return empId === updatedId ? { ...emp, ...updatedEmployee } : emp;
    });
    setRealEmployees(updatedEmployees);
    setEmployeeStatus(updatedEmployees);
    setSelectedEmployee(null);
    
    // Save to localStorage for login authentication
    try {
      localStorage.setItem('realEmployees', JSON.stringify(updatedEmployees));
    } catch (error) {
      console.log('Failed to save employee data to localStorage:', error);
    }
    
    // Reload employee data from database to ensure sync
    await loadDashboardData();
  };

  const handleEmployeeDelete = async (employeeId) => {
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const employee = realEmployees.find(emp => (emp._id || emp.id) === employeeId);
      
      if (!employee) {
        alert('Employee not found');
        return;
      }

      // Call API to delete employee
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete employee');
      }

      // Update local state
      const updatedEmployees = realEmployees.filter(emp => (emp._id || emp.id) !== employeeId);
      setRealEmployees(updatedEmployees);
      setEmployeeStatus(updatedEmployees);
      
      // Save to localStorage for login authentication
      try {
        localStorage.setItem('realEmployees', JSON.stringify(updatedEmployees));
      } catch (error) {
        console.log('Failed to save employee data to localStorage:', error);
      }
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalEmployees: updatedEmployees.filter(emp => emp.role !== 'admin').length
      }));

      alert('Employee deleted successfully!');
      
      // Reload employee data from database to ensure sync
      await loadDashboardData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.message || 'Failed to delete employee. Please try again.');
    }
  };

  const handleEmployeeStatusToggle = async (employee) => {
    try {
      const token = localStorage.getItem('token');
      const employeeId = employee._id || employee.id;
      const newStatus = !employee.isActive;
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isActive: newStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee status');
      }

      const updatedEmployee = await response.json();
      
      // Update local state
      const updatedEmployees = realEmployees.map(emp => 
        (emp._id === employeeId || emp.id === employeeId) 
          ? { ...emp, isActive: updatedEmployee.isActive, status: updatedEmployee.isActive ? 'active' : 'inactive' }
          : emp
      );
      
      setRealEmployees(updatedEmployees);
      setEmployeeStatus(updatedEmployees);
      
      // Refresh employee list
      const resp = await fetch('/api/employees?page=1&limit=100&includeInactive=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.employees)) {
        const normalized = data.employees.map(e => ({
          _id: e._id,
          id: e._id,
          name: e.name,
          email: e.email,
          phone: e.phone,
          address: e.address,
          department: e.department,
          position: e.position,
          role: e.role,
          salary: e.salary,
          dateOfJoining: e.dateOfJoining,
          isActive: e.isActive,
          status: e.isActive ? 'active' : 'inactive'
        }));
        setRealEmployees(normalized);
      }
    } catch (err) {
      console.error('Error updating employee status:', err);
      alert(err.message || 'Failed to update employee status');
    }
  };

  const handleAddEmployee = async (newEmployee) => {
    try {
      // Create employee in the database
      const token = localStorage.getItem('token');
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newEmployee.name,
          email: newEmployee.email,
          department: newEmployee.department,
          position: newEmployee.position || newEmployee.role,
          phone: newEmployee.phone || '+1234567890',
          role: newEmployee.isAdmin ? 'admin' : 'employee',
          password: newEmployee.password || 'password123',
          salary: newEmployee.salary || 50000,
          address: newEmployee.address || '123 Main St, City, State'
        }),
      });

      if (response.ok) {
        // Refresh list from API to ensure consistency and include server _id
        await (async () => {
          try {
            const resp = await fetch('/api/employees?page=1&limit=100', {
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
            const data = await resp.json();
            if (resp.ok && Array.isArray(data.employees)) {
              const normalized = data.employees.map(e => ({
                id: e._id,
                name: e.name,
                email: e.email,
                department: e.department,
                role: e.position,
                status: e.isActive ? 'active' : 'inactive',
                phone: e.phone
              }));
              setRealEmployees(normalized);
              setEmployeeStatus(normalized);
              try { localStorage.setItem('realEmployees', JSON.stringify(normalized)); } catch {}
            }
          } catch (e) {
            console.error('Failed to refresh employees:', e);
          }
        })();
        // Update stats
        setStats(prev => ({
          ...prev,
          totalEmployees: (realEmployees?.length || 0) + 1
        }));
      } else {
        const errorData = await response.json();
        console.error('Failed to create employee in database:', errorData.message);
      }
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  };

  const handleStatusCardClick = (statusType) => {
    // Filter out admins first
    const nonAdminEmployees = realEmployees.filter(emp => emp.role !== 'admin');
    let filteredEmployees = [];
    
    switch (statusType) {
      case 'active':
        filteredEmployees = nonAdminEmployees.filter(emp => emp.status === 'active');
        break;
      case 'absent':
        // Modified to show employees who have taken leave on prior days or applied for leave before current day
        filteredEmployees = nonAdminEmployees.filter(emp => {
          // First check if they're absent today
          if (emp.status === 'absent') return true;
          
          // Then check if they have applied for leave that includes today or future dates
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // In a real implementation, this would check actual leave requests
          // For demo purposes, we'll simulate with sample data
          const leaveRequests = [
            {
              employeeId: 2,
              startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
              endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
              status: 'approved'
            },
            {
              employeeId: 6,
              startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
              endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
              status: 'pending'
            }
          ];
          
          const hasLeaveToday = leaveRequests.some(leave => 
            leave.employeeId === emp.id && 
            leave.startDate <= today && 
            leave.endDate >= today && 
            (leave.status === 'approved' || leave.status === 'pending')
          );
          
          return hasLeaveToday;
        });
        break;
      case 'late':
        filteredEmployees = nonAdminEmployees.filter(emp => emp.status === 'late');
        break;
      default:
        filteredEmployees = [];
    }
    
    setSelectedStatusType(statusType);
    setStatusEmployees(filteredEmployees);
    setShowStatusModal(true);
  };

  return (
    <div style={{ padding: '1.5rem', background: 'var(--background-alt)', minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
      {/* Modern Professional Welcome Card */}
      <div className="card" style={{ 
        marginBottom: '2rem', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        maxWidth: '100%',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        border: 'none',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '30%',
          background: 'rgba(255, 255, 255, 0.1)',
          clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
        }}></div>
        <div className="card-body" style={{ color: 'white', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.2)'
                }}>
                  👋
                </span>
                Welcome back, {user.name}
              </h1>
              <p style={{ fontSize: '1rem', opacity: 0.9, margin: '0 0 1.25rem 0', maxWidth: '500px' }}>
                Here's your company overview for {format(new Date(), 'MMMM d, yyyy')}
              </p>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Active Employees</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '0.1rem' }}>{stats.activeToday} of {stats.totalEmployees}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Productivity</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '0.1rem' }}>{stats.productivity}%</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  setShowWorkingSaturdaysModal(true);
                  loadWorkingSaturdays();
                }}
                className="btn" 
                style={{ 
                  background: 'rgba(139, 92, 246, 0.9)', 
                  color: 'white', 
                  border: '1px solid rgba(139, 92, 246, 1)',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(5px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.9)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Calendar size={16} />
                Manage Working Saturdays
              </button>
              <button 
                onClick={refreshData}
                className="btn" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white', 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(5px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                disabled={isRefreshing}
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="btn" 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white', 
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(5px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Settings size={16} />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', width: '100%', maxWidth: '100%' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary-color)', cursor: 'pointer' }} onClick={handleTotalEmployeesClick}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-value">{stats.totalEmployees}</div>
              <div className="stat-label">
                <Users size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Total Employees
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--primary-color)', borderRadius: '0.5rem' }}>
              <Users size={20} style={{ color: 'white' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--success-color)', marginTop: '0.5rem' }}>
            <ArrowUpRight size={14} style={{ display: 'inline' }} /> Click to manage employees
          </div>
        </div>
        
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success-color)', cursor: 'pointer', transition: 'all 0.2s ease' }} 
             onClick={() => handleStatusCardClick('active')}
             onMouseEnter={(e) => {
               e.currentTarget.style.transform = 'translateY(-2px)';
               e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.15)';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.transform = 'translateY(0)';
               e.currentTarget.style.boxShadow = '';
             }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--success-color)' }}>
                {stats.activeToday}
              </div>
              <div className="stat-label">
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Active Today
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--success-color)', borderRadius: '0.5rem' }}>
              <CheckCircle size={20} style={{ color: 'white' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--success-color)', marginTop: '0.5rem' }}>
            <ArrowUpRight size={14} style={{ display: 'inline' }} /> Click to view active employees
          </div>
        </div>
        
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger-color)', cursor: 'pointer', transition: 'all 0.2s ease' }}
             onClick={() => handleStatusCardClick('absent')}
             onMouseEnter={(e) => {
               e.currentTarget.style.transform = 'translateY(-2px)';
               e.currentTarget.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.15)';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.transform = 'translateY(0)';
               e.currentTarget.style.boxShadow = '';
             }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-value" style={{ color: 'var(--danger-color)' }}>
                {realEmployees.filter(emp => emp.role !== 'admin').filter(emp => {
                  // Show count of employees who are absent today or have approved/pending leave for today
                  if (emp.status === 'absent') return true;
                  
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Sample leave data for demonstration
                  const leaveRequests = [
                    {
                      employeeId: 2,
                      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
                      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
                      status: 'approved'
                    },
                    {
                      employeeId: 6,
                      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
                      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
                      status: 'pending'
                    }
                  ];
                  
                  const hasLeaveToday = leaveRequests.some(leave => 
                    leave.employeeId === emp.id && 
                    leave.startDate <= today && 
                    leave.endDate >= today && 
                    (leave.status === 'approved' || leave.status === 'pending')
                  );
                  
                  return hasLeaveToday;
                }).length}
              </div>
              <div className="stat-label">
                <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.25rem' }} />
                On Leave / Absent
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: 'var(--danger-color)', borderRadius: '0.5rem' }}>
              <AlertCircle size={20} style={{ color: 'white' }} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--danger-color)', marginTop: '0.5rem' }}>
            <ArrowUpRight size={14} style={{ display: 'inline' }} /> Employees on leave or absent today
          </div>
        </div>
        
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-body" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '200px' }}>
              <Search size={16} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.875rem',
                  width: '100%'
                }}
              />
            </div>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
            >
              <option value="all">All Departments</option>
              <option value="Electronics">Electronics</option>
              <option value="Operations">Operations</option>
              <option value="Software">Software</option>
              <option value="Mechanical">Mechanical</option>
            </select>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
        {/* Employee Status - Enhanced */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} />
              Employee Status
              <span style={{ 
                background: 'var(--success-color)', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '1rem', 
                fontSize: '0.75rem' 
              }}>
                Live
              </span>
            </h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {filteredEmployees.length} of {stats.totalEmployees} employees
              </span>
              <button className="btn btn-sm btn-outline">
                <Eye size={14} />
                View All
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filteredEmployees.map((employee) => (
                <div key={employee.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background-alt)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      {employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{employee.name}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>
                          <Briefcase size={12} style={{ marginRight: '0.25rem' }} />
                          {employee.department}
                        </span>
                        <span>
                          <MapPin size={12} style={{ marginRight: '0.25rem' }} />
                          {employee.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    {getStatusBadge(employee.status)}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '80px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Check-in
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                        {employee.checkIn !== '-' ? employee.checkIn : '-'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '80px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Check-out
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                        {employee.checkOut && employee.checkOut !== '-' ? employee.checkOut : '-'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '80px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Hours
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                        {employee.hours || '0:00'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Attendance Trends Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} />
              Real-Time Weekly Attendance
              <span style={{ 
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                color: 'white', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '1rem', 
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                Live
              </span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select 
                value="current-week"
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '0.375rem', 
                  border: '1px solid var(--border-color)', 
                  fontSize: '0.75rem',
                  background: 'white'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="current-week">
                  Current Week
                </option>
              </select>
              <button className="btn btn-sm btn-outline" onClick={(e) => e.stopPropagation()}>
                <Download size={12} />
              </button>
            </div>
          </div>
          <div className="card-body">

            {/* Real-Time Employee Weekly Attendance Grid (excluding admins) */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '1.5rem', 
              marginBottom: '1rem'
            }}>
              {realEmployees.filter(emp => emp.role !== 'admin').map((employee) => {
                // Get real weekly attendance data from database
                const weeklyData = weeklyAttendanceData.get(employee.id) || Array.from({ length: 7 }, (_, i) => {
                  // Fallback: generate empty data if not loaded yet
                  const date = subDays(new Date(), 6 - i);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  
                  if (isWeekend) {
                    return {
                      date: format(date, 'EEE'),
                      status: 'weekend',
                      fullDate: format(date, 'yyyy-MM-dd')
                    };
                  }
                  
                  // For today, check employee status
                  if (isToday) {
                    let status = 'absent';
                    if (employee.status === 'active' || employee.status === 'completed') {
                      status = employee.status === 'late' ? 'late' : 'present';
                    } else if (employee.status === 'late') {
                      status = 'late';
                    }
                    return {
                      date: format(date, 'EEE'),
                      status,
                      fullDate: format(date, 'yyyy-MM-dd'),
                      isToday: true
                    };
                  }
                  
                  return {
                    date: format(date, 'EEE'),
                    status: 'absent',
                    fullDate: format(date, 'yyyy-MM-dd'),
                    isToday: false
                  };
                });
                
                const presentCount = weeklyData.filter(d => d.status === 'present').length;
                const lateCount = weeklyData.filter(d => d.status === 'late').length;
                const absentCount = weeklyData.filter(d => d.status === 'absent').length;
                
                // Highlight if employee is active today
                const isActiveToday = employee.status === 'active' || employee.status === 'completed';
                
                return (
                  <div key={employee.id} style={{
                    border: isActiveToday ? '2px solid var(--success-color)' : '1px solid var(--border-color)',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    background: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: isActiveToday ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = isActiveToday ? 'scale(1.04)' : 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = isActiveToday ? 'scale(1.02)' : 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                  >
                    {/* Live Indicator for Active Employees */}
                    {isActiveToday && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'var(--success-color)',
                        boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)',
                        animation: 'pulse 2s infinite'
                      }}></div>
                    )}
                    
                    {/* Employee Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 style={{ 
                          margin: 0, 
                          fontWeight: '600', 
                          fontSize: '1rem',
                          marginBottom: '0.25rem'
                        }}>
                          {employee.name}
                        </h4>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '0.875rem', 
                          color: 'var(--text-secondary)' 
                        }}>
                          {employee.department}
                        </p>
                      </div>
                      <div style={{ 
                        marginLeft: 'auto', 
                        background: isActiveToday ? 'var(--success-color)' : 'var(--text-secondary)', 
                        color: 'white', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {isActiveToday ? 'Active Now' : 'Offline'}
                      </div>
                    </div>
                    
                    {/* Weekly Stats */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '0.75rem', 
                      marginBottom: '1.5rem' 
                    }}>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '0.75rem', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        borderRadius: '0.5rem' 
                      }}>
                        <div style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: '700', 
                          color: 'var(--success-color)',
                          marginBottom: '0.25rem' 
                        }}>
                          {presentCount}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Present</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '0.75rem', 
                        background: 'rgba(245, 158, 11, 0.1)', 
                        borderRadius: '0.5rem' 
                      }}>
                        <div style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: '700', 
                          color: 'var(--warning-color)',
                          marginBottom: '0.25rem' 
                        }}>
                          {lateCount}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Late</div>
                      </div>
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '0.75rem', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        borderRadius: '0.5rem' 
                      }}>
                        <div style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: '700', 
                          color: 'var(--danger-color)',
                          marginBottom: '0.25rem' 
                        }}>
                          {absentCount}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Absent</div>
                      </div>
                    </div>
                    
                    {/* Weekly Attendance Grid with Real-Time Highlight */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)', 
                      gap: '0.5rem' 
                    }}>
                      {weeklyData.map((day, index) => (
                        <div 
                          key={index}
                          style={{
                            textAlign: 'center',
                            padding: '0.5rem 0',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: 
                              day.status === 'present' ? 'rgba(16, 185, 129, 0.2)' :
                              day.status === 'late' ? 'rgba(245, 158, 11, 0.2)' :
                              day.status === 'absent' ? 'rgba(239, 68, 68, 0.2)' :
                              'rgba(156, 163, 175, 0.2)',
                            color: 
                              day.status === 'present' ? 'var(--success-color)' :
                              day.status === 'late' ? 'var(--warning-color)' :
                              day.status === 'absent' ? 'var(--danger-color)' :
                              'var(--text-secondary)',
                            border: day.isToday ? '2px solid var(--primary-color)' : '1px solid ' + 
                              (day.status === 'present' ? 'var(--success-color)' :
                              day.status === 'late' ? 'var(--warning-color)' :
                              day.status === 'absent' ? 'var(--danger-color)' :
                              'var(--border-color)'),
                            position: 'relative'
                          }}
                        >
                          <div style={{ fontSize: '0.625rem', marginBottom: '0.125rem' }}>{day.date}</div>
                          <div>
                            {day.status === 'present' ? '✓' : 
                             day.status === 'late' ? '⏰' : 
                             day.status === 'absent' ? '✗' : '—'}
                          </div>
                          {day.isToday && (
                            <div style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--primary-color)',
                              border: '1px solid white'
                            }}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Activity and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
        {/* Recent Activity Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} />
              Recent Activity
              <span style={{ 
                background: 'var(--success-color)', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '1rem', 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span>Live</span>
              </span>
            </h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Last 24 hours
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '95%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={24} />
                Advanced Analytics Dashboard
              </h2>
              <button 
                onClick={() => setShowAnalyticsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Analytics Content */}
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Key Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>
                      {analyticsData.overallMetrics?.avgAttendance?.toFixed(1)}%
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Average Attendance</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--success-color)' }}>↗ +2.3% from last month</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning-color)', marginBottom: '0.5rem' }}>
                      {analyticsData.overallMetrics?.avgProductivity?.toFixed(1)}%
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Average Productivity</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--success-color)' }}>↗ +1.8% from last month</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success-color)', marginBottom: '0.5rem' }}>
                      {analyticsData.overallMetrics?.employeeSatisfaction}/5
                    </div>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Employee Satisfaction</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--success-color)' }}>↗ +0.2 from last month</div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Weekly Trends Chart */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Weekly Trends</h3>
                  </div>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--primary-color)', borderRadius: '2px' }}></div>
                          <span style={{ fontSize: '0.875rem' }}>Attendance</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--warning-color)', borderRadius: '2px' }}></div>
                          <span style={{ fontSize: '0.875rem' }}>Productivity</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end', gap: '1rem', height: '200px', padding: '1rem 0' }}>
                      {analyticsData.weeklyTrends?.map((day, index) => (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'row', 
                            alignItems: 'end', 
                            gap: '8px', 
                            marginBottom: '0.5rem',
                            height: '140px'
                          }}>
                            {/* Attendance Bar */}
                            <div style={{
                              width: '20px',
                              height: `${(day.attendance / 100) * 120}px`,
                              backgroundColor: 'var(--primary-color)',
                              borderRadius: '4px 4px 0 0',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'end',
                              justifyContent: 'center'
                            }}>
                              <span style={{
                                position: 'absolute',
                                top: '-20px',
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--primary-color)',
                                whiteSpace: 'nowrap'
                              }}>
                                {day.attendance}%
                              </span>
                            </div>
                            {/* Productivity Bar */}
                            <div style={{
                              width: '20px',
                              height: `${(day.productivity / 100) * 120}px`,
                              backgroundColor: 'var(--warning-color)',
                              borderRadius: '4px 4px 0 0',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'end',
                              justifyContent: 'center'
                            }}>
                              <span style={{
                                position: 'absolute',
                                top: '-20px',
                                fontSize: '10px',
                                fontWeight: '600',
                                color: 'var(--warning-color)',
                                whiteSpace: 'nowrap'
                              }}>
                                {day.productivity}%
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{day.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Leave Analytics */}
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Leave Analytics</h3>
                  </div>
                  <div className="card-body">
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem' }}>This Month</span>
                        <span style={{ fontWeight: '600' }}>{analyticsData.leaveAnalytics?.thisMonth?.total}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Approved: {analyticsData.leaveAnalytics?.thisMonth?.approved} | 
                        Pending: {analyticsData.leaveAnalytics?.thisMonth?.pending} | 
                        Rejected: {analyticsData.leaveAnalytics?.thisMonth?.rejected}
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {analyticsData.leaveAnalytics?.types?.map((type, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem' }}>{type.type}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '60px',
                              height: '8px',
                              backgroundColor: 'var(--background-alt)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${type.percentage}%`,
                                height: '100%',
                                backgroundColor: `hsl(${210 + (index * 30)}, 70%, 50%)`,
                                borderRadius: '4px'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{type.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Department Performance */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Department Performance</h3>
                </div>
                <div className="card-body">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--background-alt)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Department</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Employees</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Attendance</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Productivity</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.departmentStats?.map((dept, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>{dept.name}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{dept.employees}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span style={{ 
                                color: dept.attendance >= 90 ? 'var(--success-color)' : 
                                       dept.attendance >= 80 ? 'var(--warning-color)' : 'var(--danger-color)'
                              }}>
                                {dept.attendance}%
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span style={{ 
                                color: dept.productivity >= 90 ? 'var(--success-color)' : 
                                       dept.productivity >= 80 ? 'var(--warning-color)' : 'var(--danger-color)'
                              }}>
                                {dept.productivity}%
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '1rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: dept.attendance >= 90 && dept.productivity >= 85 ? 
                                  'var(--success-color-light)' : 'var(--warning-color-light)',
                                color: dept.attendance >= 90 && dept.productivity >= 85 ? 
                                  'var(--success-color)' : 'var(--warning-color)'
                              }}>
                                {dept.attendance >= 90 && dept.productivity >= 85 ? 'Excellent' : 'Good'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={24} />
                System Settings
              </h2>
              <button 
                onClick={() => setShowSettingsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Settings Content */}
            <div style={{ display: 'grid', gap: '2rem' }}>
              {/* Company Information */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Company Information</h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Company Name</label>
                      <input 
                        type="text" 
                        value={settings.companyName}
                        onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          borderRadius: '0.375rem', 
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'black'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Hours */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Working Hours Configuration</h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Start Time</label>
                      <input 
                        type="time" 
                        value={settings.workingHours.start}
                        onChange={(e) => setSettings({
                          ...settings, 
                          workingHours: {...settings.workingHours, start: e.target.value}
                        })}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          borderRadius: '0.375rem', 
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'black'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>End Time</label>
                      <input 
                        type="time" 
                        value={settings.workingHours.end}
                        onChange={(e) => setSettings({
                          ...settings, 
                          workingHours: {...settings.workingHours, end: e.target.value}
                        })}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          borderRadius: '0.375rem', 
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'black'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Working Days</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={settings.workingDays.includes(day)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSettings({...settings, workingDays: [...settings.workingDays, day]});
                              } else {
                                setSettings({...settings, workingDays: settings.workingDays.filter(d => d !== day)});
                              }
                            }}
                          />
                          <span style={{ fontSize: '0.875rem' }}>{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* System Preferences */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">System Preferences</h3>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={settings.autoBackup}
                        onChange={(e) => setSettings({...settings, autoBackup: e.target.checked})}
                      />
                      <span>Enable Automatic Backup</span>
                    </label>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Theme</label>
                      <select 
                        value={settings.theme}
                        onChange={(e) => setSettings({...settings, theme: e.target.value})}
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          borderRadius: '0.375rem', 
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'white',
                          color: 'black'
                        }}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    // In a real app, you would save settings to backend
                    console.log('Settings saved:', settings);
                    alert('Settings saved successfully!');
                    setShowSettingsModal(false);
                  }}
                  className="btn btn-primary"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Working Saturdays Management Modal */}
      {showWorkingSaturdaysModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={24} />
                Manage Working Saturdays
              </h2>
              <button 
                onClick={() => setShowWorkingSaturdaysModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Add Working Saturday Form */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div className="card-header">
                <h3 className="card-title">Add Working Saturday</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Select Saturday Date
                    </label>
                    <input 
                      type="date" 
                      value={selectedSaturdayDate}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        // Validate it's a Saturday
                        if (date.getDay() !== 6) {
                          alert('Please select a Saturday');
                          return;
                        }
                        setSelectedSaturdayDate(e.target.value);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        color: 'black'
                      }}
                    />
                    <small style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                      Only Saturdays can be selected as working days
                    </small>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={saturdayNotes}
                      onChange={(e) => setSaturdayNotes(e.target.value)}
                      placeholder="Add any notes about this working Saturday..."
                      rows="2"
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        borderRadius: '0.375rem', 
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'white',
                        color: 'black',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <button 
                    onClick={addWorkingSaturday}
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Plus size={16} style={{ marginRight: '0.5rem' }} />
                    Add Working Saturday
                  </button>
                </div>
              </div>
            </div>

            {/* List of Working Saturdays */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Current Working Saturdays</h3>
              </div>
              <div className="card-body">
                {loadingWorkingSaturdays ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div>Loading...</div>
                  </div>
                ) : workingSaturdays.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No working Saturdays configured</p>
                    <p style={{ fontSize: '0.875rem' }}>Add working Saturdays using the form above</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Day</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Notes</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workingSaturdays
                          .filter(ws => ws.isWorking)
                          .sort((a, b) => new Date(a.date) - new Date(b.date))
                          .map((ws) => {
                            const date = new Date(ws.date);
                            return (
                              <tr key={ws._id || ws.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.75rem' }}>
                                  {format(date, 'MMM dd, yyyy')}
                                </td>
                                <td style={{ padding: '0.75rem' }}>
                                  {format(date, 'EEEE')}
                                </td>
                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {ws.notes || '-'}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  <button
                                    onClick={() => removeWorkingSaturday(format(date, 'yyyy-MM-dd'))}
                                    className="btn btn-sm btn-danger"
                                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                                  >
                                    <Trash2 size={12} style={{ marginRight: '0.25rem' }} />
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setShowWorkingSaturdaysModal(false)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Status Detail Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid var(--border-color)',
              background: `linear-gradient(135deg, ${
                selectedStatusType === 'active' ? 'var(--success-color), #059669' :
                selectedStatusType === 'absent' ? 'var(--danger-color), #dc2626' :
                'var(--warning-color), #d97706'
              })`,
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, marginBottom: '0.5rem' }}>
                    {
                      selectedStatusType === 'active' ? '✅ Active Employees Today' :
                      selectedStatusType === 'absent' ? '📋 Employees on Leave / Absent Today' :
                      '⏰ Late Employees Today'
                    }
                  </h2>
                  <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>
                    {statusEmployees.length} employee{statusEmployees.length !== 1 ? 's' : ''} {
                      selectedStatusType === 'absent' ? 'on leave or absent today' :
                      `currently ${selectedStatusType}`
                    }
                  </p>
                </div>
                <button 
                  onClick={() => setShowStatusModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'white',
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Summary Statistics */}
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: 'var(--primary-color)',
                    marginBottom: '0.25rem'
                  }}>
                    {statusEmployees.length}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Total {
                      selectedStatusType === 'absent' ? 'On Leave / Absent' :
                      selectedStatusType.charAt(0).toUpperCase() + selectedStatusType.slice(1)
                    }
                  </div>
                </div>
                {selectedStatusType === 'absent' ? (
                  <>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--warning-color)',
                        marginBottom: '0.25rem'
                      }}>
                        {statusEmployees.filter(emp => emp.status === 'absent').length}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Currently Absent
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--info-color)',
                        marginBottom: '0.25rem'
                      }}>
                        {statusEmployees.filter(emp => emp.status !== 'absent').length}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        On Approved/Pending Leave
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#8b5cf6',
                        marginBottom: '0.25rem'
                      }}>
                        {((statusEmployees.length / stats.totalEmployees) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Percentage of Team
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: selectedStatusType === 'active' ? 'var(--success-color)' : 'var(--warning-color)',
                        marginBottom: '0.25rem'
                      }}>
                        {statusEmployees.length > 0 ? 
                          Math.round(statusEmployees.reduce((sum, emp) => sum + emp.productivity, 0) / statusEmployees.length) : 0}%
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Avg Productivity
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: '#8b5cf6',
                        marginBottom: '0.25rem'
                      }}>
                        {((statusEmployees.length / stats.totalEmployees) * 100).toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Percentage of Team
                      </div>
                    </div>
                    {selectedStatusType === 'active' && (
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: '#06b6d4',
                          marginBottom: '0.25rem'
                        }}>
                          {statusEmployees.filter(emp => emp.hours !== '0:00').length}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Currently Working
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Employee Cards Grid */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              {statusEmployees.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                    {selectedStatusType === 'active' ? '🎉' : 
                     selectedStatusType === 'absent' ? '📋' : '⏰'}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {selectedStatusType === 'active' ? 'No active employees' :
                     selectedStatusType === 'absent' ? 'No employees on leave or absent today' :
                     'No late employees today!'}
                  </h3>
                  <p style={{ margin: 0 }}>
                    {selectedStatusType === 'absent' ? 'All employees are present today! 🎊' :
                     selectedStatusType === 'late' ? 'Everyone arrived on time today! ⭐' :
                     'Check back during work hours.'}
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1rem'
                }}>
                  {statusEmployees.map((employee) => (
                    <div key={employee.id} style={{
                      background: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                      e.currentTarget.style.borderColor = selectedStatusType === 'active' ? 'var(--success-color)' :
                                                         selectedStatusType === 'absent' ? 'var(--danger-color)' :
                                                         'var(--warning-color)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                    >
                      {/* Status Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: selectedStatusType === 'active' ? 'var(--success-color)' :
                                   selectedStatusType === 'absent' ? 
                                     (employee.status === 'absent' ? 'var(--danger-color)' : 'var(--info-color)') :
                                   'var(--warning-color)',
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {selectedStatusType === 'absent' ? 
                           (employee.status === 'absent' ? 'Absent Today' : 'On Leave') :
                         selectedStatusType}
                      </div>

                      {/* Employee Info */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${
                            selectedStatusType === 'active' ? 'var(--success-color), #059669' :
                            selectedStatusType === 'absent' ? 
                              (employee.status === 'absent' ? 'var(--danger-color), #dc2626' : 'var(--info-color), #3b82f6') :
                            'var(--warning-color), #d97706'
                          })`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.25rem',
                          flexShrink: 0
                        }}>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, marginBottom: '0.25rem' }}>
                            {employee.name}
                          </h3>
                          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            {employee.department} • {employee.role}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <Mail size={12} />
                            <span>{employee.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Work Details */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        padding: '1rem',
                        background: 'var(--background-alt)',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}>
                        {selectedStatusType === 'absent' ? (
                          <>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                {employee.status === 'absent' ? 'Absent Status' : 'Leave Type'}
                              </div>
                              <div style={{ fontWeight: '600', color: employee.status === 'absent' ? 'var(--danger-color)' : 'var(--info-color)' }}>
                                {employee.status === 'absent' ? 'Absent Today' : 'Approved Leave'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Leave Dates</div>
                              <div style={{ fontWeight: '600' }}>
                                {employee.status === 'absent' ? 'N/A' : 'Mar 13 - Mar 16, 2024'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Reason</div>
                              <div style={{ fontWeight: '600' }}>
                                {employee.status === 'absent' ? 'Not specified' : 'Family vacation'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Approval Status</div>
                              <div style={{ fontWeight: '600', color: employee.status === 'absent' ? 'var(--danger-color)' : 'var(--info-color)' }}>
                                {employee.status === 'absent' ? 'Not on leave' : 'Approved'}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Check-in Time</div>
                              <div style={{ fontWeight: '600', color: selectedStatusType === 'late' ? 'var(--warning-color)' : 'var(--text-primary)' }}>
                                {employee.checkIn || 'Not checked in'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Hours Today</div>
                              <div style={{ fontWeight: '600' }}>{employee.hours}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Location</div>
                              <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <MapPin size={12} />
                                {employee.location}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowStatusModal(false);
                            setShowEmployeeModal(true);
                          }}
                          className="btn btn-sm"
                          style={{
                            flex: 1,
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Edit size={12} style={{ marginRight: '0.25rem' }} />
                          Edit Details
                        </button>
                        <button 
                          onClick={() => {
                            // In a real app, this would open a contact modal or initiate communication
                            alert(`Contacting ${employee.name} at ${employee.phone || employee.email}`);
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Phone size={12} style={{ marginRight: '0.25rem' }} />
                          Contact
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Employee Management Modal */}
      {showEmployeeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Employee Management</h2>
              <button 
                onClick={() => setShowEmployeeModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Search and Filter */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search employees by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 3rem',
                    border: '2px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  border: '2px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  minWidth: '150px'
                }}
              >
                <option value="all">All Departments</option>
                <option value="Electronics">Electronics</option>
                <option value="Operations">Operations</option>
                <option value="Software">Software</option>
                <option value="Mechanical">Mechanical</option>
              </select>
            </div>
            
            {/* Employee List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--background-alt)' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Employee</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Employee ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Contact</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Position</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Department</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Join Date</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', borderBottom: '2px solid var(--border-color)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {realEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    realEmployees
                      .filter(emp => {
                        const matchesSearch = !searchTerm || 
                          emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.department?.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
                        return matchesSearch && matchesDepartment;
                      })
                      .map((employee) => (
                        <EmployeeRow 
                          key={employee.id || employee._id} 
                          employee={employee} 
                          onEdit={handleEmployeeEdit}
                          onDelete={handleEmployeeDelete}
                          onSave={handleEmployeeSave}
                          onStatusToggle={handleEmployeeStatusToggle}
                          isEditing={selectedEmployee?.id === employee.id || selectedEmployee?._id === employee._id}
                        />
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Attendance Modal */}
      {showAttendanceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: '95%',
            maxWidth: '1400px',
            maxHeight: '95vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '2rem', 
              borderBottom: '1px solid var(--border-color)',
              background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, marginBottom: '0.5rem' }}>
                    📅 Monthly Attendance Report
                  </h2>
                  <p style={{ margin: 0, opacity: 0.9 }}>
                    {format(new Date(selectedYear, selectedMonth, 1), 'MMMM yyyy')} - Detailed attendance tracking
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select 
                    value={`${selectedYear}-${selectedMonth}`}
                    onChange={(e) => {
                      const [year, month] = e.target.value.split('-');
                      handleMonthChange(parseInt(month), parseInt(year));
                    }}
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '0.375rem', 
                      border: 'none',
                      fontSize: '0.875rem',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white'
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date(selectedYear, i, 1);
                      return (
                        <option key={i} value={`${selectedYear}-${i}`} style={{ color: 'black' }}>
                          {format(date, 'MMMM yyyy')}
                        </option>
                      );
                    })}
                  </select>
                  <button 
                    onClick={() => setShowAttendanceModal(false)}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: 'white',
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              {/* Summary Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem', 
                marginBottom: '2rem' 
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {(() => {
                      const nonAdminAttendance = monthlyAttendance.filter(emp => !isAdmin(emp.employee));
                      return nonAdminAttendance.reduce((sum, emp) => sum + emp.summary.presentDays, 0);
                    })()}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Present Days</div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {(() => {
                      const nonAdminAttendance = monthlyAttendance.filter(emp => !isAdmin(emp.employee));
                      return nonAdminAttendance.reduce((sum, emp) => sum + emp.summary.leaveDays, 0);
                    })()}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Leave Days</div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {(() => {
                      const nonAdminAttendance = monthlyAttendance.filter(emp => !isAdmin(emp.employee));
                      return convertDecimalToHoursMinutes(parseFloat(nonAdminAttendance.reduce((sum, emp) => sum + parseFloat(emp.summary.totalHours), 0).toFixed(0)));
                    })()}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Hours Worked</div>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  color: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    {(() => {
                      const nonAdminAttendance = monthlyAttendance.filter(emp => !isAdmin(emp.employee));
                      return convertDecimalToHoursMinutes(nonAdminAttendance.length > 0 ? 
                        (nonAdminAttendance.reduce((sum, emp) => sum + parseFloat(emp.summary.avgHours), 0) / nonAdminAttendance.length)
                        : 0);
                    })()}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Avg Hours/Day</div>
                </div>
              </div>
              
              {/* Table View */}
              <div style={{ 
                overflowX: 'auto',
                maxWidth: '100%',
                position: 'relative'
              }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: '800px' // Ensure minimum width for proper layout
                }}>
                  <thead>
                    <tr style={{ background: 'var(--background-alt)' }}>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        borderBottom: '2px solid var(--border-color)',
                        fontWeight: '600',
                        position: 'sticky',
                        left: 0,
                        background: 'var(--background-alt)',
                        zIndex: 1
                      }}>
                        Employee
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Present Days</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Leave Days</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Avg Hours</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyAttendance.filter(empData => !isAdmin(empData.employee)).map((employeeData, index) => (
                      <tr key={employeeData.employee.id} style={{
                        background: index % 2 === 0 ? 'white' : 'var(--background-alt)',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'white' : 'var(--background-alt)'}
                      >
                        <td style={{
                          padding: '1rem',
                          borderBottom: '1px solid var(--border-color)',
                          position: 'sticky',
                          left: 0,
                          background: 'inherit',
                          zIndex: 1
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.875rem'
                            }}>
                              {employeeData.employee.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                                {employeeData.employee.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {employeeData.employee.department}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ 
                            background: 'var(--success-color)', 
                            color: 'white', 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '1rem', 
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}>
                            {employeeData.summary.presentDays}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ 
                            background: employeeData.summary.leaveDays > 0 ? '#3b82f6' : 'var(--text-secondary)', 
                            color: 'white', 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '1rem', 
                            fontSize: '0.875rem',
                            fontWeight: '600'
                          }}>
                            {employeeData.summary.leaveDays}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontWeight: '600' }}>
                            {convertDecimalToHoursMinutes(parseFloat(employeeData.summary.avgHours))}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '60px',
                              height: '8px',
                              background: 'var(--border-color)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${employeeData.summary.attendanceRate}%`,
                                height: '100%',
                                background: parseFloat(employeeData.summary.attendanceRate) >= 90 ? 'var(--success-color)' : 
                                           parseFloat(employeeData.summary.attendanceRate) >= 75 ? '#f59e0b' : 'var(--danger-color)',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                              {employeeData.summary.attendanceRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Employee Form Component
const EmployeeForm = ({ employee = {}, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: employee.name || '',
    email: employee.email || '',
    password: employee.password || '',
    department: employee.department || '',
    role: employee.role || '',
    phone: employee.phone || '',
    location: employee.location || 'Office'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ name: '', email: '', password: '', department: '', role: '', phone: '', location: 'Office' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        value={formData.name}
        onChange={handleChange}
        required
        className="form-control"
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        required
        className="form-control"
      />
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        required
        className="form-control"
      />
      <select
        name="department"
        value={formData.department}
        onChange={handleChange}
        required
        className="form-control"
      >
        <option value="">Select Department</option>
        <option value="Admin">Admin</option>
        <option value="Software">Software</option>
        <option value="Testing">Testing</option>
        <option value="Operations">Operations</option>
        <option value="Design">Design</option>
        <option value="Embedded">Embedded</option>
      </select>
      <input
        type="text"
        name="role"
        placeholder="Role/Position"
        value={formData.role}
        onChange={handleChange}
        required
        className="form-control"
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={handleChange}
        className="form-control"
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" className="btn btn-primary">Add Employee</button>
        <button type="button" onClick={onCancel} className="btn btn-outline">Cancel</button>
      </div>
    </form>
  );
};

// Employee Row Component
const EmployeeRow = ({ employee, onEdit, onDelete, onSave, onStatusToggle, isEditing }) => {
  const [editData, setEditData] = useState({
    ...employee,
    employeeId: employee.employeeId || '',
    birthDate: employee.birthDate || null,
    companyEmail: employee.companyEmail || '',
    dateOfJoining: employee.dateOfJoining || null
  });
  const [isToggling, setIsToggling] = useState(false);

  // Sync editData when employee prop changes
  useEffect(() => {
    setEditData({
      ...employee,
      employeeId: employee.employeeId || '',
      birthDate: employee.birthDate || null,
      companyEmail: employee.companyEmail || '',
      dateOfJoining: employee.dateOfJoining || null
    });
  }, [employee]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleStatusToggle = async () => {
    if (window.confirm(`Are you sure you want to ${employee.isActive ? 'deactivate' : 'activate'} ${employee.name}?`)) {
      setIsToggling(true);
      try {
        await onStatusToggle(employee);
      } finally {
        setIsToggling(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const employeeId = employee._id || employee.id;
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          phone: editData.phone,
          address: editData.address,
          position: editData.position,
          department: editData.department,
          employeeId: editData.employeeId,
          birthDate: editData.birthDate ? (typeof editData.birthDate === 'string' ? editData.birthDate : (editData.birthDate instanceof Date ? format(editData.birthDate, 'yyyy-MM-dd') : editData.birthDate)) : undefined,
          companyEmail: editData.companyEmail || undefined,
          dateOfJoining: editData.dateOfJoining ? (typeof editData.dateOfJoining === 'string' ? editData.dateOfJoining : (editData.dateOfJoining instanceof Date ? format(editData.dateOfJoining, 'yyyy-MM-dd') : editData.dateOfJoining)) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update employee');
      }

      const updatedEmployee = await response.json();
      onSave(updatedEmployee);
      alert('Employee updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert(error.message || 'Failed to update employee. Please try again.');
    }
  };

  if (isEditing) {
    return (
      <tr style={{ backgroundColor: '#fffbeb' }}>
        <td colSpan="8" style={{ padding: '1.5rem' }}>
          <div style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '2rem',
            border: '2px solid var(--primary-color)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary-color)' }}>
                Editing: {employee.name}
              </h3>
              <button 
                onClick={() => {
                  setEditData({
                    ...employee,
                    employeeId: employee.employeeId || '',
                    birthDate: employee.birthDate || null,
                    companyEmail: employee.companyEmail || '',
                    dateOfJoining: employee.dateOfJoining || null
                  });
                  onEdit(null);
                }} 
                className="btn btn-sm btn-outline"
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Employee Name *
                </label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="form-control"
                  required
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                />
              </div>

              {/* Employee ID */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Employee ID
                </label>
                <input
                  type="text"
                  value={editData.employeeId || ''}
                  onChange={(e) => setEditData({ ...editData, employeeId: e.target.value })}
                  className="form-control"
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                  placeholder="EMP001"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Contact Number *
                </label>
                <input
                  type="tel"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="form-control"
                  required
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="form-control"
                  required
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                />
              </div>

              {/* Company Email */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Company Mail ID
                </label>
                <input
                  type="email"
                  value={editData.companyEmail || ''}
                  onChange={(e) => setEditData({ ...editData, companyEmail: e.target.value })}
                  className="form-control"
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                  placeholder="employee@company.com"
                />
              </div>

              {/* Birth Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Birth Date
                </label>
                <input
                  type="date"
                  value={editData.birthDate ? (editData.birthDate instanceof Date ? format(editData.birthDate, 'yyyy-MM-dd') : format(new Date(editData.birthDate), 'yyyy-MM-dd')) : ''}
                  onChange={(e) => setEditData({ ...editData, birthDate: e.target.value ? e.target.value : null })}
                  className="form-control"
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                />
              </div>

              {/* Joining Date */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Joining Date *
                </label>
                <input
                  type="date"
                  value={editData.dateOfJoining ? (editData.dateOfJoining instanceof Date ? format(editData.dateOfJoining, 'yyyy-MM-dd') : format(new Date(editData.dateOfJoining), 'yyyy-MM-dd')) : ''}
                  onChange={(e) => setEditData({ ...editData, dateOfJoining: e.target.value ? e.target.value : null })}
                  className="form-control"
                  required
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                />
              </div>

              {/* Department */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Department *
                </label>
                <select
                  value={editData.department || ''}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  className="form-control form-select"
                  required
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                >
                  <option value="">Select Department</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Operations">Operations</option>
                  <option value="Software">Software</option>
                  <option value="Mechanical">Mechanical</option>
                </select>
              </div>

              {/* Position */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Position *
                </label>
                <input
                  type="text"
                  value={editData.position || ''}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  className="form-control"
                  required
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                  placeholder="Software Developer"
                />
              </div>

              {/* Address */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
                  Address *
                </label>
                <textarea
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="form-control"
                  required
                  rows={3}
                  style={{ padding: '0.75rem', fontSize: '0.875rem', resize: 'vertical' }}
                  placeholder="Enter address"
                />
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setEditData(employee);
                  onEdit(null);
                }}
                className="btn btn-outline"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                <Save size={16} style={{ marginRight: '0.5rem' }} />
                Save Changes
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  const isActive = employee.isActive !== false; // Default to true if undefined

  return (
    <tr style={{ 
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: !isActive ? '#fef2f2' : 'transparent',
      opacity: !isActive ? 0.7 : 1
    }}>
      {/* Employee */}
      <td style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-color), #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.875rem'
          }}>
            {employee.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'E'}
          </div>
          <div>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{employee.name || 'N/A'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{employee.email || 'N/A'}</div>
            {employee.companyEmail && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                <Mail size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                {employee.companyEmail}
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* Employee ID */}
      <td style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: '600', fontFamily: 'monospace', color: 'var(--primary-color)' }}>
          {employee.employeeId || 'N/A'}
        </div>
        {employee.birthDate && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            DOB: {formatDate(employee.birthDate)}
          </div>
        )}
      </td>
      
      {/* Contact */}
      <td style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.875rem' }}>
          <div style={{ marginBottom: '0.25rem' }}>
            <Phone size={12} style={{ display: 'inline', marginRight: '0.25rem', color: 'var(--text-secondary)' }} />
            {employee.phone || 'N/A'}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', wordBreak: 'break-word' }}>
            {employee.address || 'N/A'}
          </div>
        </div>
      </td>
      
      {/* Position */}
      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
        {employee.position || 'N/A'}
      </td>
      
      {/* Department */}
      <td style={{ padding: '1rem' }}>
        <span style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          fontWeight: '500'
        }}>
          {employee.department || 'N/A'}
        </span>
      </td>
      
      {/* Join Date */}
      <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        {formatDate(employee.dateOfJoining)}
      </td>
      
      {/* Status */}
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <button
          onClick={handleStatusToggle}
          disabled={isToggling}
          style={{
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: isToggling ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: isActive ? '#10b981' : '#6b7280',
            color: 'white',
            opacity: isToggling ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            margin: '0 auto'
          }}
          onMouseEnter={(e) => {
            if (!isToggling) {
              e.target.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          {isToggling ? (
            <>
              <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              {isActive ? 'Deactivating...' : 'Activating...'}
            </>
          ) : (
            <>
              {isActive ? <CheckCircle size={12} /> : <X size={12} />}
              {isActive ? 'Active' : 'Inactive'}
            </>
          )}
        </button>
      </td>
      
      {/* Actions */}
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button 
            onClick={() => onEdit(employee)} 
            className="btn btn-sm btn-outline"
            style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
          >
            <Edit size={12} style={{ marginRight: '0.25rem' }} />
            Edit
          </button>
          <button 
            onClick={() => {
              const employeeId = employee._id || employee.id;
              if (employeeId && onDelete) {
                onDelete(employeeId);
              }
            }}
            className="btn btn-sm"
            style={{ 
              padding: '0.375rem 0.75rem', 
              fontSize: '0.75rem',
              background: '#ef4444',
              color: 'white',
              border: 'none'
            }}
          >
            <Trash2 size={12} style={{ marginRight: '0.25rem' }} />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default AdminDashboard;