import React, { useEffect, useState } from "react";
import { 
  Calendar, Clock, Users, TrendingUp, BarChart3, Download, Filter, 
  Search, ArrowLeft, ArrowRight, Eye, CheckCircle, AlertCircle, 
  Timer, Activity, Target, RefreshCw, ChevronDown, X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend } from 'date-fns';

const AttendanceReport = () => {
  const [realEmployees, setRealEmployees] = useState([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState({ employee: null, records: [], title: '' });

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (realEmployees.length > 0) {
      generateMonthlyAttendance(realEmployees);
    }
  }, [realEmployees, selectedMonth, selectedYear]);

  const loadEmployeeData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/employees?page=1&limit=100', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined
        }
      });
      const data = await resp.json();
      if (resp.ok && Array.isArray(data.employees)) {
        // Normalize to match existing UI shape
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
        console.log('✅ Loaded', normalized.length, 'employees from database');
      } else {
        console.error('Failed to fetch employees:', data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyAttendance = async (employees) => {
    if (!employees || employees.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Fetch attendance data and leave requests for all employees in parallel
      const attendancePromises = employees.map(async (employee) => {
        try {
          const month = selectedMonth + 1; // API expects 1-12, not 0-11
          const attendanceResponse = await fetch(`/api/attendance-records/employee/${employee.id}/${month}/${selectedYear}`);
          const records = attendanceResponse.ok ? await attendanceResponse.json() : [];
          
          // Fetch approved leave requests for this employee
          const token = localStorage.getItem('token');
          const leavesResponse = await fetch('/api/leaves', {
            headers: {
              'Authorization': token ? `Bearer ${token}` : undefined
            }
          });
          const allLeaves = leavesResponse.ok ? await leavesResponse.json() : [];
          
          // Filter approved leaves for this employee in the selected month
          const employeeLeaves = allLeaves.filter(leave => {
            if (leave.employee.id.toString() !== employee.id.toString() || leave.status !== 'approved') {
              return false;
            }
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            const monthStart = new Date(selectedYear, selectedMonth, 1);
            const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
            
            // Check if leave overlaps with the selected month
            return (leaveStart <= monthEnd && leaveEnd >= monthStart);
          });
          
          return { employee, records: Array.isArray(records) ? records : [], leaves: employeeLeaves };
        } catch (error) {
          console.error(`Error fetching attendance for employee ${employee.id}:`, error);
          return { employee, records: [], leaves: [] };
        }
      });
      
      const attendanceData = await Promise.all(attendancePromises);
      
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const monthlyData = attendanceData.map(({ employee, records, leaves }) => {
        const attendanceRecords = [];
        let presentDays = 0;
        let totalHours = 0;
        let leaveDays = 0;
        let earlyLeaveDays = 0;
        let halfDays = 0;
        let workingDays = 0;
        
        // Create a map of date -> attendance record for quick lookup
        const recordsMap = new Map();
        records.forEach(record => {
          const recordDate = new Date(record.date);
          const day = recordDate.getDate();
          recordsMap.set(day, record);
        });
        
        // Create a set of dates that are covered by approved leave requests
        const leaveDatesSet = new Set();
        leaves.forEach(leave => {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);
          const monthStart = new Date(selectedYear, selectedMonth, 1);
          const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
          
          // Get the range of dates that overlap with the selected month
          const startDate = leaveStart < monthStart ? monthStart : leaveStart;
          const endDate = leaveEnd > monthEnd ? monthEnd : leaveEnd;
          
          // Add all dates in the leave range to the set
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfMonth = d.getDate();
            const dateInMonth = new Date(selectedYear, selectedMonth, dayOfMonth);
            // Only include if it's the same month (to handle edge cases)
            if (dateInMonth.getMonth() === selectedMonth) {
              leaveDatesSet.add(dayOfMonth);
            }
          }
        });
        
        // Process each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(selectedYear, selectedMonth, day);
          const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
          const record = recordsMap.get(day);
          
          if (isWeekendDay) {
            attendanceRecords.push({
              date: day,
              status: 'weekend',
              inTime: '',
              outTime: '',
              hoursWorked: '0'
            });
          } else if (date <= new Date()) {
            workingDays++;
            
            let status = 'absent';
            let inTime = '';
            let outTime = '';
            let hoursWorked = 0;
            
            if (record) {
              // Map database status to UI status
              const dbStatus = record.status || 'Present';
              
              if (dbStatus === 'Leave' || dbStatus === 'Holiday') {
                status = 'leave';
                leaveDays++;
              } else if (dbStatus === 'Absent') {
                status = 'absent';
              } else if (record.inTime) {
                // Has check-in time
                const inTimeDate = new Date(record.inTime);
                inTime = format(inTimeDate, 'HH:mm');
                
                // Determine if late (check-in after 9:30 AM)
                const lateThreshold = new Date(inTimeDate);
                lateThreshold.setHours(9, 30, 0, 0);
                const isLate = inTimeDate > lateThreshold;
                
                if (record.outTime) {
                  // Has check-out time
                  const outTimeDate = new Date(record.outTime);
                  outTime = format(outTimeDate, 'HH:mm');
                  
                  // Calculate hours worked with proper precision
                  const diffMs = outTimeDate - inTimeDate;
                  hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60));
                  
                  // Round to 2 decimal places for consistency (then we'll round to 1 decimal for display)
                  hoursWorked = Math.round(hoursWorked * 100) / 100;
                  
                  // Determine if early leave (check-out before 5:00 PM and worked less than 6 hours)
                  const earlyThreshold = new Date(outTimeDate);
                  earlyThreshold.setHours(17, 0, 0, 0);
                  const isEarlyLeave = outTimeDate < earlyThreshold && hoursWorked < 6;
                  
                  // Determine if half day (worked less than 4.5 hours)
                  const isHalfDay = hoursWorked < 4.5 && hoursWorked >= 2;
                  
                  if (isHalfDay) {
                    status = 'half';
                    halfDays++;
                    presentDays++;
                  } else if (isEarlyLeave) {
                    status = 'early';
                    earlyLeaveDays++;
                    presentDays++;
                  } else if (isLate) {
                    status = 'late';
                    presentDays++;
                  } else {
                    status = 'present';
                    presentDays++;
                  }
                  
                  // Add rounded hours to total to ensure consistency
                  totalHours += hoursWorked;
                } else {
                  // Checked in but not checked out yet
                  status = isLate ? 'late' : 'present';
                  presentDays++;
                  // Don't count hours if not checked out
                }
              } else {
                // Present status but no inTime (shouldn't happen, but handle it)
                status = 'present';
                presentDays++;
              }
            } else {
              // No attendance record - check if there's an approved leave request for this day
              // Only count as leave if it's not a weekend
              if (leaveDatesSet.has(day) && !isWeekendDay) {
                status = 'leave';
                leaveDays++;
              } else {
                status = 'absent';
              }
            }
            
            attendanceRecords.push({
              date: day,
              status,
              inTime,
              outTime,
              hoursWorked: hoursWorked.toFixed(1)
            });
          } else {
            // Future date - no data yet
            attendanceRecords.push({
              date: day,
              status: 'future',
              inTime: '',
              outTime: '',
              hoursWorked: '0'
            });
          }
        }
        
        // Recalculate total from stored rounded values to ensure consistency
        // This ensures the total matches the sum of individual day hours
        let recalculatedTotal = 0;
        attendanceRecords.forEach(record => {
          if (record.hoursWorked && record.hoursWorked !== '0') {
            recalculatedTotal += parseFloat(record.hoursWorked);
          }
        });
        
        // Round to 2 decimal places for consistency, then to 1 decimal for display
        const roundedTotalHours = Math.round(recalculatedTotal * 100) / 100;
        const avgHours = presentDays > 0 ? (Math.round((roundedTotalHours / presentDays) * 100) / 100).toFixed(1) : '0.0';
        const attendanceRate = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : '0.0';
        
        return {
          employee,
          attendanceRecords,
          summary: {
            presentDays,
            leaveDays,
            earlyLeaveDays,
            halfDays,
            totalHours: roundedTotalHours.toFixed(1),
            avgHours,
            attendanceRate
          }
        };
      });
      
      setMonthlyAttendance(monthlyData);
      console.log('✅ Generated monthly attendance for', monthlyData.length, 'employees');
    } catch (error) {
      console.error('Error generating monthly attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      case 'leave': return '#3b82f6';
      case 'early': return '#f59e0b';
      case 'half': return '#8b5cf6';
      case 'weekend': return '#9ca3af';
      default: return '#e5e7eb';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return '✓';
      case 'late': return '⏰';
      case 'absent': return '✗';
      case 'leave': return '🏖️';
      case 'early': return '🚪';
      case 'half': return '🌗';
      case 'weekend': return '🌴';
      default: return '-';
    }
  };

  const convertDecimalToHoursMinutes = (decimalHours) => {
    // Handle string inputs and ensure we have a number
    const hours = parseFloat(decimalHours);
    if (isNaN(hours) || hours === 0) {
      return '0h 0m';
    }
    
    // Calculate hours and minutes with proper rounding
    const totalHours = Math.floor(hours);
    const decimalPart = hours - totalHours;
    // Round minutes to nearest integer, but handle edge cases
    const totalMinutes = Math.round(decimalPart * 60);
    
    // Handle case where minutes round to 60
    if (totalMinutes === 60) {
      return `${totalHours + 1}h 0m`;
    }
    
    return `${totalHours}h ${totalMinutes}m`;
  };

  const handleExportReport = () => {
    try {
      // Generate comprehensive report data
      const reportData = generateReportData();
      
      // Create CSV for now (will be Excel-compatible)
      const csvContent = createExcelCompatibleCSV(reportData);
      const filename = `Attendance_Report_${format(new Date(selectedYear, selectedMonth), 'MMM_yyyy')}.csv`;
      
      downloadFile(csvContent, filename, 'text/csv');
      
      // Show success message
      alert(`Report exported successfully!

File: ${filename}

Note: You can open this CSV file in Excel for full functionality.`);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error exporting report. Please try again.');
    }
  };

  const generateReportData = () => {
    const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    return {
      reportTitle: `Monthly Attendance Report - ${monthName}`,
      summary: {
        totalEmployees: overallStats.totalEmployees,
        avgAttendanceRate: overallStats.avgAttendanceRate,
        totalPresentDays: overallStats.totalPresentDays,
        totalHours: overallStats.totalHours,
        generatedOn: format(new Date(), 'dd/MM/yyyy HH:mm:ss')
      },
      employeeData: filteredAttendance,
      daysInMonth
    };
  };

  const createExcelCompatibleCSV = (reportData) => {
    const rows = [];
    
    // Report Header
    rows.push([reportData.reportTitle]);
    rows.push([`Generated on: ${reportData.summary.generatedOn}`]);
    rows.push(['']); // Empty row
    
    // Summary Section
    rows.push(['SUMMARY']);
    rows.push(['Total Employees', reportData.summary.totalEmployees]);
    rows.push(['Average Attendance Rate', `${reportData.summary.avgAttendanceRate}%`]);
    rows.push(['Total Present Days', reportData.summary.totalPresentDays]);
    rows.push(['']); // Empty row
    
    // Employee Summary Table
    rows.push(['EMPLOYEE SUMMARY']);
    const summaryHeaders = [
      'Employee Name',
      'Department',
      'Role',
      'Present Days',
      'Leave Days',
      'Early Leave Days',
      'Half Days',
      'Average Hours/Day',
      'Attendance Rate (%)'
    ];
    rows.push(summaryHeaders);
    
    // Employee summary data
    reportData.employeeData.forEach(employeeData => {
      rows.push([
        employeeData.employee.name,
        employeeData.employee.department,
        employeeData.employee.role,
        employeeData.summary.presentDays,
        employeeData.summary.leaveDays,
        employeeData.summary.earlyLeaveDays,
        employeeData.summary.halfDays,
        convertDecimalToHoursMinutes(parseFloat(employeeData.summary.avgHours)),
        employeeData.summary.attendanceRate
      ]);
    });
    
    rows.push(['']); // Empty row
    
    // Daily Attendance Details
    rows.push(['DAILY ATTENDANCE DETAILS']);
    
    // Create daily headers
    const dailyHeaders = ['Employee', 'Department'];
    for (let day = 1; day <= reportData.daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dayName = format(date, 'EEE');
      dailyHeaders.push(`${day} ${dayName}`);
    }
    rows.push(dailyHeaders);
    
    // Add daily data for each employee
    reportData.employeeData.forEach(employeeData => {
      const row = [employeeData.employee.name, employeeData.employee.department];
      
      for (let day = 1; day <= reportData.daysInMonth; day++) {
        const dayRecord = employeeData.attendanceRecords.find(r => r.date === day);
        if (dayRecord) {
          let cellValue = '';
          if (dayRecord.status === 'present' || dayRecord.status === 'late' || dayRecord.status === 'early' || dayRecord.status === 'half') {
            cellValue = `${dayRecord.status.toUpperCase()} (${dayRecord.inTime}-${dayRecord.outTime}) ${convertDecimalToHoursMinutes(parseFloat(dayRecord.hoursWorked))}`;
          } else {
            cellValue = dayRecord.status.toUpperCase();
          }
          row.push(cellValue);
        } else {
          row.push('-');
        }
      }
      
      rows.push(row);
    });
    
    // Convert to CSV format
    return rows.map(row => 
      row.map(cell => {
        const cellStr = String(cell || '');
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const filteredAttendance = monthlyAttendance.filter(item => {
    const matchesEmployee = selectedEmployee === 'all' || item.employee.id.toString() === selectedEmployee;
    const matchesSearch = item.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEmployee && matchesSearch;
  });

  const overallStats = {
    totalEmployees: monthlyAttendance.length,
    avgAttendanceRate: monthlyAttendance.length > 0 ? 
      (monthlyAttendance.reduce((sum, emp) => sum + parseFloat(emp.summary.attendanceRate), 0) / monthlyAttendance.length).toFixed(1) : '0.0',
    totalPresentDays: monthlyAttendance.reduce((sum, emp) => sum + emp.summary.presentDays, 0),
    totalEarlyLeaveDays: monthlyAttendance.reduce((sum, emp) => sum + emp.summary.earlyLeaveDays, 0),
    totalHalfDays: monthlyAttendance.reduce((sum, emp) => sum + emp.summary.halfDays, 0),
    totalHours: monthlyAttendance.reduce((sum, emp) => sum + parseFloat(emp.summary.totalHours), 0).toFixed(1)
  };

  return (
    <div style={{ padding: '2rem', background: 'var(--background-alt)', minHeight: '100vh' }}>
      {/* Header Section */}
      <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, var(--primary-color) 0%, #6366f1 100%)' }}>
        <div className="card-body" style={{ color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: '700', marginBottom: '0.5rem', color: 'white' }}>
                📊 Monthly Attendance Report
              </h1>
              <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '1rem' }}>
                Comprehensive attendance tracking for {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}
              </p>
              <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} />
                  <span>{overallStats.totalEmployees} employees</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} />
                  <span>{overallStats.avgAttendanceRate}% avg attendance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} />
                  <span>{overallStats.totalHours} total hours</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={() => generateMonthlyAttendance(realEmployees)}
                className="btn" 
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                disabled={isLoading}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button 
                onClick={handleExportReport}
                className="btn" 
                style={{ background: 'white', color: 'var(--primary-color)' }}
              >
                <Download size={16} />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Month/Year Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                <select 
                  value={`${selectedYear}-${selectedMonth}`}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setSelectedMonth(parseInt(month));
                    setSelectedYear(parseInt(year));
                  }}
                  style={{ 
                    padding: '0.5rem', 
                    borderRadius: '0.375rem', 
                    border: '1px solid var(--border-color)', 
                    fontSize: '0.875rem'
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(selectedYear, i, 1);
                    return (
                      <option key={i} value={`${selectedYear}-${i}`}>
                        {format(date, 'MMMM yyyy')}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {/* Employee Filter */}
              <select 
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}
              >
                <option value="all">All Employees</option>
                {realEmployees.map(emp => (
                  <option key={emp.id} value={emp.id.toString()}>{emp.name}</option>
                ))}
              </select>
              
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
                <Search size={16} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                />
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <h3>Loading attendance data...</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Please wait while we generate the monthly report</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
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
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Early Leave</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Half Day</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Avg Hours</th>
                      <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid var(--border-color)', fontWeight: '600' }}>Attendance Rate</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        borderBottom: '2px solid var(--border-color)', 
                        fontWeight: '600',
                        minWidth: '120px',
                        width: '120px'
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((employeeData, index) => (
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
                            fontWeight: '600',
                            cursor: employeeData.summary.presentDays > 0 ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (employeeData.summary.presentDays > 0) {
                              // Find all present days for this employee
                              const presentRecords = employeeData.attendanceRecords
                                .filter(record => record.status === 'present' || record.status === 'late' || record.status === 'early' || record.status === 'half')
                                .sort((a, b) => a.date - b.date);
                              
                              setDetailData({
                                employee: employeeData.employee,
                                records: presentRecords,
                                title: 'Present Days'
                              });
                              setShowDetailModal(true);
                            }
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
                            fontWeight: '600',
                            cursor: employeeData.summary.leaveDays > 0 ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (employeeData.summary.leaveDays > 0) {
                              // Find all leave days for this employee
                              const leaveRecords = employeeData.attendanceRecords
                                .filter(record => record.status === 'leave')
                                .sort((a, b) => a.date - b.date);
                              
                              setDetailData({
                                employee: employeeData.employee,
                                records: leaveRecords,
                                title: 'Leave Days'
                              });
                              setShowDetailModal(true);
                            }
                          }}>
                            {employeeData.summary.leaveDays}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ 
                            background: employeeData.summary.earlyLeaveDays > 0 ? '#f59e0b' : 'var(--text-secondary)', 
                            color: 'white', 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '1rem', 
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: employeeData.summary.earlyLeaveDays > 0 ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (employeeData.summary.earlyLeaveDays > 0) {
                              // Find all early leave days for this employee
                              const earlyLeaveRecords = employeeData.attendanceRecords
                                .filter(record => record.status === 'early')
                                .sort((a, b) => a.date - b.date);
                              
                              setDetailData({
                                employee: employeeData.employee,
                                records: earlyLeaveRecords,
                                title: 'Early Leave Days'
                              });
                              setShowDetailModal(true);
                            }
                          }}>
                            {employeeData.summary.earlyLeaveDays}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ 
                            background: employeeData.summary.halfDays > 0 ? '#8b5cf6' : 'var(--text-secondary)', 
                            color: 'white', 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: '1rem', 
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: employeeData.summary.halfDays > 0 ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (employeeData.summary.halfDays > 0) {
                              // Find all half days for this employee
                              const halfDayRecords = employeeData.attendanceRecords
                                .filter(record => record.status === 'half')
                                .sort((a, b) => a.date - b.date);
                              
                              setDetailData({
                                employee: employeeData.employee,
                                records: halfDayRecords,
                                title: 'Half Days'
                              });
                              setShowDetailModal(true);
                            }
                          }}>
                            {employeeData.summary.halfDays}
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
                        <td style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          borderBottom: '1px solid var(--border-color)',
                          minWidth: '120px',
                          width: '120px'
                        }}>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedEmployee(employeeData.employee.id.toString());
                            }}
                            className="btn btn-sm btn-outline"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              background: 'white',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = 'var(--primary-color)';
                              e.target.style.color = 'white';
                              e.target.style.borderColor = 'var(--primary-color)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'white';
                              e.target.style.color = 'var(--text-secondary)';
                              e.target.style.borderColor = 'var(--border-color)';
                            }}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-body" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Status Legend</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('present')
              }} />
              <span>Present</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('late')
              }} />
              <span>Late</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('early')
              }} />
              <span>Early Leave</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('half')
              }} />
              <span>Half Day</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('absent')
              }} />
              <span>Absent</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('leave')
              }} />
              <span>On Leave</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: getStatusColor('weekend')
              }} />
              <span>Weekend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="card" style={{
            maxWidth: '900px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div className="card-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)',
              padding: '1.5rem',
              background: 'linear-gradient(135deg, var(--primary-color) 0%, #6366f1 100%)',
              color: 'white'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                  {detailData.title}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
                  {detailData.employee?.name} • {detailData.records.length} records
                </p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'white',
                  padding: '0.5rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Summary Section */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--background-alt)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Employee</div>
                    <div style={{ fontWeight: '600' }}>{detailData.employee?.name}</div>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: getStatusColor(detailData.title === 'Early Leave Days' ? 'early' : 'half'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Records</div>
                    <div style={{ fontWeight: '600' }}>{detailData.records.length}</div>
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--success-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Month</div>
                    <div style={{ fontWeight: '600' }}>{format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card-body" style={{
              padding: 0,
              overflowY: 'auto',
              flex: 1
            }}>
              {detailData.records.length > 0 ? (
                <div style={{ padding: '1.5rem' }}>
                  <div style={{
                    display: 'grid',
                    gap: '1rem'
                  }}>
                    {detailData.records.map((record, index) => {
                      const dateStr = format(new Date(selectedYear, selectedMonth, record.date), 'EEE, MMM dd, yyyy');
                      return (
                        <div key={index} className="card" style={{
                          borderLeft: `4px solid ${getStatusColor(record.status)}`,
                          marginBottom: '0.5rem',
                          borderRadius: '8px',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                          transition: 'all 0.2s ease',
                          background: 'white'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
                        }}
                        >
                          <div className="card-body" style={{ padding: '1.25rem' }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '1rem'
                            }}>
                              <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {dateStr}
                              </h4>
                              <span style={{
                                padding: '0.375rem 0.875rem',
                                borderRadius: '20px',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                background: `${getStatusColor(record.status)}20`,
                                color: getStatusColor(record.status),
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: getStatusColor(record.status)
                                }}></div>
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </span>
                            </div>
                            
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '1rem',
                              marginBottom: '0.5rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                background: 'var(--background-alt)',
                                borderRadius: '8px'
                              }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: 'var(--success-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white'
                                }}>
                                  <CheckCircle size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>Check-in</div>
                                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{record.inTime || '--:--'}</div>
                                </div>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                background: 'var(--background-alt)',
                                borderRadius: '8px'
                              }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: 'var(--danger-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white'
                                }}>
                                  <AlertCircle size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>Check-out</div>
                                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{record.outTime || '--:--'}</div>
                                </div>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                background: 'var(--background-alt)',
                                borderRadius: '8px'
                              }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '8px',
                                  background: 'var(--primary-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white'
                                }}>
                                  <Clock size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.125rem' }}>Hours Worked</div>
                                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{record.hoursWorked || '0'}h</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <Activity size={64} style={{ margin: '0 auto 1.5rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                    No Records Found
                  </h3>
                  <p style={{ margin: 0, fontSize: '1.125rem' }}>
                    There are no {detailData.title.toLowerCase()} records for this employee in {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy')}.
                  </p>
                </div>
              )}
            </div>
            
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="btn"
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#4f46e5';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'var(--primary-color)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <X size={18} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
