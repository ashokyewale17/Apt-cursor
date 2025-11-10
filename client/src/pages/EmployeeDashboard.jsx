import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import EmployeeAttendance from "./EmployeeAttendance";
import { 
  Clock, PlayCircle, StopCircle, Calendar, Timer, Coffee, TrendingUp, 
  Bell, Settings, Target, Award, Zap, Activity, BarChart3, Users, 
  FileText, CheckCircle, AlertCircle, Star, ArrowUpRight, ArrowDownRight,
  Wifi, WifiOff, Sun, Moon, Thermometer, Droplets, CheckSquare, MapPin
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, subDays } from 'date-fns';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [workingTime, setWorkingTime] = useState('00:00:00');
  const [todayActivity, setTodayActivity] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [productivityScore, setProductivityScore] = useState(85);
  const [recentActivity, setRecentActivity] = useState([]);
  const [weather, setWeather] = useState({ temp: 22, condition: 'Sunny', humidity: 45 });
  const [stats, setStats] = useState({
    todayHours: '0h 0m',
    weekHours: '0h 0m',
    avgDaily: '0h 0m',
    pendingLeaves: 0,
    monthlyHours: '128h 30m',
    tasksCompleted: 8,
    tasksPending: 3
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [siteName, setSiteName] = useState('');
  const [workingSaturdays, setWorkingSaturdays] = useState(new Set());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (isCheckedIn && checkInTime) {
        updateWorkingTime();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isCheckedIn, checkInTime]);

  // Load data on component mount
  useEffect(() => {
    loadTodayData();
    loadWeeklyData();
    loadStats();
    loadRecentActivity();
    loadWorkingSaturdays();
  }, []);

  const loadWorkingSaturdays = async () => {
    try {
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      
      const startDateStr = format(weekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      
      const response = await fetch(
        `/api/working-saturdays?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const workingSaturdaySet = new Set(
          data
            .filter(ws => ws.isWorking)
            .map(ws => format(new Date(ws.date), 'yyyy-MM-dd'))
        );
        setWorkingSaturdays(workingSaturdaySet);
      }
    } catch (error) {
      console.error('Error loading working Saturdays:', error);
    }
  };

  const updateWorkingTime = () => {
    if (checkInTime) {
      const now = new Date();
      const diff = now.getTime() - checkInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setWorkingTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    if (location !== 'site') {
      handleCheckIn(location);
    } else {
      // For site, we need to get the site name
      setSiteName('');
    }
  };

  const handleCheckIn = async (location = selectedLocation) => {
    try {
      const response = await fetch('/api/attendance-records/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: user.id,
          location: location === 'site' ? siteName : location
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const now = new Date();
        setIsCheckedIn(true);
        setCheckInTime(now);
        
        // Add to today's activity
        const newActivity = {
          id: Date.now(),
          type: 'check-in',
          time: now,
          status: 'active'
        };
        setTodayActivity(prev => [...prev, newActivity]);
        
        // Save to localStorage for persistence - using user ID for employee-specific data
        const storageKey = `checkIn_${user.id}_${format(now, 'yyyy-MM-dd')}`;
        localStorage.setItem(storageKey, JSON.stringify({
          checkedIn: true,
          checkInTime: now.toISOString(),
          activities: [...todayActivity, newActivity],
          userId: user.id,
          userName: user.name,
          location: location === 'site' ? siteName : location
        }));
        
        console.log('Check-in successful:', data);
      } else {
        console.error('Check-in failed:', data.error);
        alert(data.error || 'Check-in failed');
      }
    } catch (error) {
      console.error('Error during check-in:', error);
      alert('Failed to check in. Please try again.');
    }
    
    // Close dialogs
    setShowLocationDialog(false);
    setSelectedLocation('');
    setSiteName('');
  };

  const handleCheckOut = () => {
    // Show custom confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmCheckOut = async () => {
    setShowConfirmDialog(false);
    
    try {
      const response = await fetch('/api/attendance-records/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: user.id
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const now = new Date();
        setIsCheckedIn(false);
        
        // Calculate total time worked
        if (checkInTime) {
          const totalMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          
          // Add to today's activity
          const newActivity = {
            id: Date.now(),
            type: 'check-out',
            time: now,
            totalTime: `${hours}h ${minutes}m`,
            status: 'completed'
          };
          
          const updatedActivity = [...todayActivity, newActivity];
          setTodayActivity(updatedActivity);

          // Save to localStorage - using user ID for employee-specific data
          const storageKey = `checkIn_${user.id}_${format(now, 'yyyy-MM-dd')}`;
          localStorage.setItem(storageKey, JSON.stringify({
            checkedIn: false,
            checkInTime: checkInTime.toISOString(),
            checkOutTime: now.toISOString(),
            totalTime: `${hours}h ${minutes}m`,
            activities: updatedActivity,
            userId: user.id,
            userName: user.name
          }));
          
          console.log('Check-out successful:', data);
        }
        
        setCheckInTime(null);
        setWorkingTime('00:00:00');
      } else {
        console.error('Check-out failed:', data.error);
        alert(data.error || 'Check-out failed');
      }
    } catch (error) {
      console.error('Error during check-out:', error);
      alert('Failed to check out. Please try again.');
    }
  };

  const cancelCheckOut = () => {
    setShowConfirmDialog(false);
  };

  const loadTodayData = async () => {
    try {
      const response = await fetch(`/api/attendance-records/today/${user.id}`);
      const data = await response.json();
      
      if (response.ok && data.isCheckedIn) {
        setIsCheckedIn(true);
        if (data.record.inTime) {
          setCheckInTime(new Date(data.record.inTime));
        }
      } else {
        // Fallback to localStorage if API fails
        const today = format(new Date(), 'yyyy-MM-dd');
        const storageKey = `checkIn_${user.id}_${today}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
          const data = JSON.parse(savedData);
          setIsCheckedIn(data.checkedIn);
          if (data.checkInTime) {
            setCheckInTime(new Date(data.checkInTime));
          }
          if (data.activities) {
            setTodayActivity(data.activities);
          }
        }
      }
    } catch (error) {
      console.error('Error loading today data:', error);
      // Fallback to localStorage
      const today = format(new Date(), 'yyyy-MM-dd');
      const storageKey = `checkIn_${user.id}_${today}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const data = JSON.parse(savedData);
        setIsCheckedIn(data.checkedIn);
        if (data.checkInTime) {
          setCheckInTime(new Date(data.checkInTime));
        }
        if (data.activities) {
          setTodayActivity(data.activities);
        }
      }
    }
  };

  const loadWeeklyData = async () => {
    if (!user || (!user.id && !user._id)) {
      console.error('User not found');
      return;
    }
    
    try {
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      // Get current month and year for API call
      const month = today.getMonth() + 1; // API expects 1-12
      const year = today.getFullYear();
      const employeeId = user.id || user._id;
      
      // Fetch attendance records from database for current month
      const response = await fetch(`/api/attendance-records/employee/${employeeId}/${month}/${year}`);
      const records = response.ok ? await response.json() : [];
      
      // Create a map of date string (YYYY-MM-DD) -> attendance record for quick lookup
      const recordsMap = new Map();
      records.forEach(record => {
        const recordDate = new Date(record.date);
        const dateKey = format(recordDate, 'yyyy-MM-dd');
        recordsMap.set(dateKey, record);
      });
      
      // Process each day of the week
      const weekData = weekDays.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const record = recordsMap.get(dateKey);
        const isToday = isSameDay(day, today);
        const isSaturday = day.getDay() === 6;
        const isSunday = day.getDay() === 0;
        const isWorkingSaturday = isSaturday && workingSaturdays.has(dateKey);
        
        // Handle Sunday (always non-working)
        if (isSunday) {
          return {
            date: day,
            worked: '0h 0m',
            status: 'absent'
          };
        }
        
        // Handle non-working Saturdays
        if (isSaturday && !isWorkingSaturday) {
          return {
            date: day,
            worked: '0h 0m',
            status: 'absent'
          };
        }
        
        // Working Saturdays are treated like regular working days (continue processing)
        
        // Handle days with attendance records
        if (record) {
          const dbStatus = record.status || 'Present';
          let worked = '0h 0m';
          let status = 'absent';
          
          if (dbStatus === 'Leave' || dbStatus === 'Holiday' || dbStatus === 'Absent') {
            status = 'absent';
          } else if (record.inTime) {
            if (record.outTime) {
              // Has check-out time - completed day
              const checkIn = new Date(record.inTime);
              const checkOut = new Date(record.outTime);
              const diffMs = checkOut - checkIn;
              const hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60));
              const hours = Math.floor(hoursWorked);
              const minutes = Math.round((hoursWorked - hours) * 60);
              worked = `${hours}h ${minutes}m`;
              status = 'completed';
            } else {
              // Checked in but not checked out yet - active day
              if (isToday) {
                status = 'active';
                // Calculate hours from check-in to now
                const checkIn = new Date(record.inTime);
                const now = new Date();
                const diffMs = now - checkIn;
                const hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60));
                const hours = Math.floor(hoursWorked);
                const minutes = Math.round((hoursWorked - hours) * 60);
                worked = `${hours}h ${minutes}m`;
              } else {
                // Past day without check-out (shouldn't happen, but handle it)
                status = 'completed';
                worked = '0h 0m';
              }
            }
          }
          
          return {
            date: day,
            worked,
            status
          };
        }
        
        // Handle days without records
        // Check localStorage as fallback for today
        if (isToday) {
          const dayKey = format(day, 'yyyy-MM-dd');
          const storageKey = `checkIn_${employeeId}_${dayKey}`;
          const savedData = localStorage.getItem(storageKey);
          
          if (savedData) {
            const data = JSON.parse(savedData);
            if (data.checkedIn && !data.checkOutTime) {
              return {
                date: day,
                worked: data.totalTime || '0h 0m',
                status: 'active'
              };
            } else if (data.totalTime) {
              return {
                date: day,
                worked: data.totalTime,
                status: 'completed'
              };
            }
          }
        }
        
        // Past days without records are absent
        return {
          date: day,
          worked: '0h 0m',
          status: isToday ? 'today' : 'absent'
        };
      });
      
      setWeeklyData(weekData);
      console.log('✅ Loaded weekly data from database');
    } catch (error) {
      console.error('Error loading weekly data:', error);
      // Fallback to localStorage if API fails
      const today = new Date();
      const weekStart = startOfWeek(today);
      const weekEnd = endOfWeek(today);
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const employeeId = user.id || user._id;
      
      const weekData = weekDays.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const storageKey = `checkIn_${employeeId}_${dayKey}`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
          const data = JSON.parse(savedData);
          return {
            date: day,
            worked: data.totalTime || '0h 0m',
            status: data.checkedIn ? 'active' : (data.totalTime ? 'completed' : 'absent')
          };
        }
        
        return {
          date: day,
          worked: '0h 0m',
          status: isSameDay(day, today) ? 'today' : 'absent'
        };
      });
      
      setWeeklyData(weekData);
    }
  };

  const loadStats = () => {
    // Calculate today's hours
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayData = localStorage.getItem(`checkIn_${today}`);
    let todayHours = '0h 0m';
    
    if (todayData) {
      const data = JSON.parse(todayData);
      todayHours = data.totalTime || '0h 0m';
    }

    // Calculate actual monthly hours based on 9-hour workdays
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Get the first and last day of the current month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Count working days (Monday to Friday) in the month
    let workingDays = 0;
    let totalMinutesWorked = 0;
    
    for (let day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
      // Check if it's a weekday (Monday=1 to Friday=5)
      const dayOfWeek = day.getDay();
      if (dayOfWeek > 0 && dayOfWeek < 6) {
        workingDays++;
        
        // Check if there's data for this day
        const dayKey = format(day, 'yyyy-MM-dd');
        const storageKey = `checkIn_${user.id}_${dayKey}`;
        const dayData = localStorage.getItem(storageKey);
        
        if (dayData) {
          const data = JSON.parse(dayData);
          if (data.totalTime) {
            // Parse the time string (e.g., "8h 30m")
            const timeParts = data.totalTime.split(' ');
            let hours = 0;
            let minutes = 0;
            
            for (let i = 0; i < timeParts.length; i++) {
              if (timeParts[i].includes('h')) {
                hours = parseInt(timeParts[i].replace('h', '')) || 0;
              } else if (timeParts[i].includes('m')) {
                minutes = parseInt(timeParts[i].replace('m', '')) || 0;
              }
            }
            
            totalMinutesWorked += hours * 60 + minutes;
          }
        }
      }
    }
    
    // Calculate average daily hours based on 9-hour standard
    const totalMinutesExpected = workingDays * 9 * 60;
    const avgMonthlyHours = totalMinutesExpected > 0 ? 
      ((totalMinutesWorked / totalMinutesExpected) * (workingDays * 9)).toFixed(1) : 0;
    
    // Format as "Xh Ym" or just "Xh" if no minutes
    const hours = Math.floor(avgMonthlyHours);
    const minutes = Math.round((avgMonthlyHours - hours) * 60);
    const monthlyHours = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

    // Calculate week hours (mock data)
    const weekHours = '32h 15m';
    const avgDaily = '6h 27m';
    const pendingLeaves = 2;
    const tasksCompleted = 8;
    const tasksPending = 3;

    setStats({
      todayHours,
      weekHours,
      avgDaily,
      pendingLeaves,
      monthlyHours,
      tasksCompleted,
      tasksPending
    });
  };

  const loadRecentActivity = () => {
    setRecentActivity([
      {
        id: 1,
        type: 'task',
        title: 'Reviewed code for feature branch',
        time: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 2,
        type: 'meeting',
        title: 'Attended team sync meeting',
        time: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 3,
        type: 'break',
        title: 'Lunch break',
        time: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: 'completed'
      }
    ]);
  };

  const takeBreak = () => {
    const now = new Date();
    const breakActivity = {
      id: Date.now(),
      type: 'break',
      time: now,
      status: 'break'
    };
    setTodayActivity(prev => [...prev, breakActivity]);
  };

  return (
    <div style={{ 
      padding: '1rem', 
      background: 'var(--background-alt)', 
      minHeight: '100vh', 
      width: '100%', 
      maxWidth: '100%', 
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Modern Header with Gradient - Mobile Optimized */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1rem',
        padding: '1.5rem 1rem',
        marginBottom: '1.5rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
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
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '180px',
          height: '180px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%'
        }}></div>
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            gap: '1rem',
            textAlign: 'center'
          }}>
            <div>
              <h1 style={{ 
                fontSize: '1.75rem', 
                fontWeight: 'bold', 
                marginBottom: '0.25rem', 
                background: 'linear-gradient(45deg, #fff, #f0f9ff)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                lineHeight: '1.2'
              }}>
                Welcome, {user.name.split(' ')[0]}! 👋
              </h1>
              <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: '0.5rem 0' }}>
                {format(currentTime, 'EEE, MMM d, yyyy')}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                fontFamily: 'monospace', 
                marginBottom: '0.25rem' 
              }}>
                {format(currentTime, 'HH:mm')}
              </div>
              <p style={{ fontSize: '0.75rem', opacity: 0.8, margin: 0 }}>
                Current Time
              </p>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                gap: '0.75rem', 
                marginTop: '0.75rem' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem', 
                  background: isCheckedIn 
                    ? 'rgba(16, 185, 129, 0.3)' 
                    : 'rgba(239, 68, 68, 0.3)', 
                  padding: '0.375rem 0.75rem', 
                  borderRadius: '2rem',
                  border: `1px solid ${isCheckedIn ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                  transition: 'all 0.3s ease'
                }}>
                  {isCheckedIn ? <Wifi size={14} /> : <WifiOff size={14} />}
                  <span style={{ fontWeight: '600', fontSize: '0.75rem' }}>
                    {isCheckedIn ? 'Online' : 'Offline'}
                  </span>
                  {isCheckedIn && (
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10b981',
                      animation: 'pulse 2s infinite'
                    }}></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Check-in/Check-out Section - Mobile Optimized */}
      <div className="card" style={{ 
        marginBottom: '1.5rem', 
        border: 'none', 
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Background Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '180px',
          height: '180px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05))',
          borderRadius: '50%',
          filter: 'blur(25px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          left: '-50px',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
          borderRadius: '50%',
          filter: 'blur(20px)'
        }}></div>
        
        <div className="card-body" style={{ 
          padding: '1.5rem 1rem', 
          position: 'relative', 
          zIndex: 1 
        }}>
          <div style={{ textAlign: 'center' }}>
            {/* Status Display */}
            <div style={{ marginBottom: '1.5rem' }}>

              
              <h2 style={{ 
                marginBottom: '0.5rem', 
                fontSize: '1.25rem', 
                fontWeight: '700',
                background: isCheckedIn 
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #374151, #1f2937)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: '1.3'
              }}>
                {isCheckedIn ? 'You\'re Clocked In! ⚡' : 'Ready to Start? 🚀'}
              </h2>
              
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '0.875rem',
                marginBottom: '0.75rem',
                fontWeight: '500',
                lineHeight: '1.4'
              }}>
                {isCheckedIn 
                  ? `Started at ${checkInTime ? format(checkInTime, 'HH:mm') : ''}`
                  : 'Clock in to begin your day'
                }
              </p>
              
              {/* Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.5rem 1rem',
                background: isCheckedIn 
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(107, 114, 128, 0.1)',
                border: `1px solid ${isCheckedIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`,
                borderRadius: '50px',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: isCheckedIn ? '#059669' : '#374151'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isCheckedIn ? '#10b981' : '#6b7280',
                  animation: isCheckedIn ? 'pulse 2s infinite' : 'none'
                }}></div>
                {isCheckedIn ? 'ACTIVE' : 'STANDBY'}
              </div>
            </div>

            {/* Working Time Display */}
            {isCheckedIn && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '1.25rem',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  width: '60px',
                  height: '60px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(15px)'
                }}></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '800', 
                    fontFamily: 'monospace', 
                    marginBottom: '0.25rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.02em'
                  }}>
                    {workingTime}
                  </div>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#059669',
                    fontWeight: '600',
                    margin: 0
                  }}>Time worked today</p>
                </div>
              </div>
            )}

            {/* Action Buttons - Mobile Optimized */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '0.75rem', 
              alignItems: 'center'
            }}>
              {!isCheckedIn ? (
                <button 
                  onClick={() => setShowLocationDialog(true)} 
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '1rem 2rem',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    maxWidth: '280px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.4), 0 4px 6px -2px rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.3), 0 2px 4px -1px rgba(16, 185, 129, 0.2)';
                  }}
                >
                  <PlayCircle size={20} />
                  <span>Check In</span>
                </button>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '0.75rem', 
                  width: '100%',
                  maxWidth: '280px',
                  margin: '0 auto'
                }}>
                  <button 
                    onClick={handleCheckOut}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '1rem 1.5rem',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3), 0 2px 4px -1px rgba(239, 68, 68, 0.2)',
                      position: 'relative',
                      overflow: 'hidden',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.4), 0 4px 6px -2px rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.3), 0 2px 4px -1px rgba(239, 68, 68, 0.2)';
                    }}
                  >
                    <StopCircle size={20} />
                    <span>Check Out</span>
                  </button>
                  

                </div>
              )}
              

            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Grid - Mobile Optimized */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '0.75rem', 
        marginBottom: '1.5rem' 
      }}>
        {/* Today's Hours */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '0.75rem',
          padding: '1rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '50px',
            height: '50px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <Timer size={16} style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{stats.todayHours}</div>
            <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>Hours Today</div>
          </div>
        </div>

        {/* Avg Monthly Hours */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '0.75rem',
          padding: '1rem',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            width: '50px',
            height: '50px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <Calendar size={16} style={{ opacity: 0.8 }} />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{stats.monthlyHours}</div>
            <div style={{ fontSize: '0.625rem', opacity: 0.8 }}>Avg Monthly (9h/day)</div>
          </div>
        </div>


      </div>

      {/* Bottom Grid - Mobile Optimized */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Today's Activity */}
        <div className="card" style={{ 
          border: 'none', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderRadius: '0.75rem'
        }}>
          <div className="card-header" style={{ 
            borderBottom: '1px solid var(--border-color)', 
            padding: '1rem' 
          }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem' 
            }}>
              <Activity size={16} />
              Today's Activity
            </h3>
          </div>
          <div className="card-body" style={{ padding: '1rem' }}>
            {todayActivity.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: 'var(--text-secondary)', 
                padding: '1.5rem' 
              }}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.875rem' }}>No activity yet today</p>
              </div>
            ) : (
              <div>
                {todayActivity.map((activity) => (
                  <div key={activity.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--border-color)'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: activity.type === 'check-in' ? 'var(--success-color)' : 
                                 activity.type === 'check-out' ? 'var(--danger-color)' : 
                                 'var(--warning-color)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>
                        {activity.type === 'check-in' ? '🟢 Checked In' : 
                         activity.type === 'check-out' ? '🔴 Checked Out' : 
                         '☕ Break Time'}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                        {format(new Date(activity.time), 'HH:mm')}
                        {activity.totalTime && ` • ${activity.totalTime}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Overview */}
      <div className="card" style={{ 
        border: 'none', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: '0.75rem'
      }}>
        <div className="card-header" style={{ 
          borderBottom: '1px solid var(--border-color)', 
          padding: '1rem' 
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            margin: 0, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <Calendar size={16} />
            This Week
          </h3>
        </div>
        <div className="card-body" style={{ padding: '1rem' }}>
          {weeklyData.map((day, index) => (
            <div key={index} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: index < weeklyData.length - 1 ? '1px solid var(--border-color)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: day.status === 'active' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                             day.status === 'completed' ? 'linear-gradient(135deg, #10b981, #059669)' :
                             day.status === 'today' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'var(--background-alt)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: day.status === 'absent' ? 'var(--text-secondary)' : 'white',
                  fontSize: '0.625rem',
                  fontWeight: 'bold'
                }}>
                  {format(day.date, 'dd')}
                </div>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>
                    {format(day.date, 'EEE')}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                    {format(day.date, 'MMM dd')}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '500', fontSize: '0.8125rem' }}>
                  {day.worked}
                </div>
                <span style={{
                  padding: '0.125rem 0.375rem',
                  borderRadius: '1rem',
                  fontSize: '0.625rem',
                  background: day.status === 'active' ? 'rgba(245, 158, 11, 0.1)' :
                             day.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' :
                             day.status === 'today' ? 'rgba(102, 126, 234, 0.1)' : 'var(--background-alt)',
                  color: day.status === 'active' ? 'var(--warning-color)' :
                         day.status === 'completed' ? 'var(--success-color)' :
                         day.status === 'today' ? 'var(--primary-color)' : 'var(--text-secondary)'
                }}>
                  {day.status === 'active' ? 'Active' :
                   day.status === 'completed' ? 'Done' :
                   day.status === 'today' ? 'Today' : 'Off'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Location Selection Dialog */}
      {showLocationDialog && (
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            transform: 'scale(1)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '2px solid #3b82f6'
            }}>
              <MapPin size={24} color="#3b82f6" />
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              Select Location
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              Where are you checking in from today?
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <button
                onClick={() => handleLocationSelect('Office')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#eff6ff';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <MapPin size={20} />
                Office
              </button>
              <button
                onClick={() => handleLocationSelect('Remote')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#eff6ff';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <MapPin size={20} />
                Remote
              </button>
              <button
                onClick={() => handleLocationSelect('site')}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '2px solid #e5e7eb',
                  backgroundColor: 'white',
                  color: '#1f2937',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  fontSize: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#eff6ff';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <MapPin size={20} />
                Specific Site
              </button>
            </div>
            {selectedLocation === 'site' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  placeholder="Enter site name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  onClick={() => handleCheckIn()}
                  disabled={!siteName.trim()}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: siteName.trim() ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    fontWeight: '600',
                    cursor: siteName.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    width: '100%'
                  }}
                >
                  Check In at {siteName || 'Site'}
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setShowLocationDialog(false);
                setSelectedLocation('');
                setSiteName('');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {showConfirmDialog && (
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
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            transform: 'scale(1)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              border: '2px solid #ef4444'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '0.5rem'
            }}>
              Confirm Check Out
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem',
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              Are you sure you want to check out? This will end your current work session.
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={cancelCheckOut}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: 1,
                  maxWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCheckOut}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: 1,
                  maxWidth: '120px',
                  boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(239, 68, 68, 0.3)';
                }}
              >
                Check Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;