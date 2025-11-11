const express = require("express");
const router = express.Router();
const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Helper function to calculate days difference
// Returns the number of days between date1 and date2 (date2 - date1)
const differenceInDays = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  firstDate.setHours(0, 0, 0, 0);
  secondDate.setHours(0, 0, 0, 0);
  return Math.round((secondDate - firstDate) / oneDay);
};

// Helper function to get all dates between start and end (inclusive)
const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

// @route   GET /api/leaves
// @desc    Get all leave requests (Admin: all, Employee: their own)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = {};
    
    // If user is employee, only show their own leaves
    if (req.user.role !== "admin") {
      query.employeeId = req.user._id;
    }
    
    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }
    
    const leaves = await Leave.find(query)
      .sort({ createdAt: -1 })
      .populate("employeeId", "name email department")
      .populate("reviewedBy", "name");
    
    // Format the response to match frontend expectations
    const formattedLeaves = leaves.map(leave => ({
      id: leave._id,
      employee: {
        id: leave.employeeId._id.toString(),
        name: leave.employeeId.name,
        department: leave.employeeId.department,
        email: leave.employeeId.email
      },
      type: leave.type,
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      days: leave.days,
      reason: leave.reason,
      status: leave.status,
      appliedDate: new Date(leave.appliedDate),
      approver: leave.reviewedBy ? leave.reviewedBy.name : null,
      approvedDate: leave.reviewedAt ? new Date(leave.reviewedAt) : null,
      rejectionReason: leave.rejectionReason || null
    }));
    
    res.json(formattedLeaves);
  } catch (error) {
    console.error("Error fetching leaves:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   POST /api/leaves
// @desc    Apply for leave (Employee only)
// @access  Private
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    
    // Validate required fields
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ 
        message: "Type, start date, end date, and reason are required" 
      });
    }
    
    // Validate dates - parse dates properly to avoid timezone issues
    // Parse date strings in format "YYYY-MM-DD" as local dates
    const parseDate = (dateString) => {
      const parts = dateString.split('-');
      if (parts.length !== 3) {
        return new Date(dateString);
      }
      // Create date in local timezone (month is 0-indexed)
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    };
    
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Normalize dates to midnight local time
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }
    
    if (start < today) {
      return res.status(400).json({ message: "Start date cannot be in the past" });
    }
    
    if (end < start) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    
    // Calculate days (inclusive of both start and end dates)
    // differenceInDays returns (date2 - date1), so we pass (start, end) to get (end - start)
    const days = differenceInDays(start, end) + 1;
    
    if (days < 1) {
      return res.status(400).json({ message: "Leave duration must be at least 1 day" });
    }
    
    // Create leave request
    const leave = new Leave({
      employeeId: req.user._id,
      type,
      startDate: start,
      endDate: end,
      days,
      reason: reason.trim(),
      status: "pending"
    });
    
    await leave.save();
    
    // Populate employee data
    await leave.populate("employeeId", "name email department");
    
    // Format response
    const formattedLeave = {
      id: leave._id,
      employee: {
        id: leave.employeeId._id.toString(),
        name: leave.employeeId.name,
        department: leave.employeeId.department,
        email: leave.employeeId.email
      },
      type: leave.type,
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      days: leave.days,
      reason: leave.reason,
      status: leave.status,
      appliedDate: new Date(leave.appliedDate),
      approver: null,
      approvedDate: null,
      rejectionReason: null
    };
    
    res.status(201).json({
      message: "Leave request submitted successfully",
      leave: formattedLeave
    });
  } catch (error) {
    console.error("Error creating leave request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/leaves/:id/approve
// @desc    Approve a leave request (Admin only)
// @access  Private (Admin)
router.put("/:id/approve", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    
    if (leave.status !== "pending") {
      return res.status(400).json({ 
        message: `Leave request is already ${leave.status}` 
      });
    }
    
    leave.status = "approved";
    leave.reviewedAt = new Date();
    leave.reviewedBy = req.user._id;
    
    await leave.save();
    
    // Create attendance records for each day in the leave period
    try {
      const leaveDates = getDatesBetween(leave.startDate, leave.endDate);
      let recordsCreated = 0;
      
      // Process each date in the leave period
      for (const date of leaveDates) {
        // Skip weekends (Saturday = 6, Sunday = 0)
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue; // Skip weekends
        }
        
        // Normalize date to midnight
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);
        
        // Check if attendance record already exists for this date
        const existingRecord = await Attendance.findOne({
          employeeId: leave.employeeId,
          date: normalizedDate
        });
        
        if (existingRecord) {
          // Update existing record to mark as Leave
          existingRecord.status = "Leave";
          // Clear inTime and outTime if they exist (since employee is on leave)
          existingRecord.inTime = undefined;
          existingRecord.outTime = undefined;
          await existingRecord.save();
          recordsCreated++;
        } else {
          // Create new attendance record with Leave status
          const attendanceRecord = new Attendance({
            employeeId: leave.employeeId,
            date: normalizedDate,
            status: "Leave",
            location: "Office"
          });
          await attendanceRecord.save();
          recordsCreated++;
        }
      }
      
      console.log(`✅ Created/updated ${recordsCreated} attendance records for approved leave`);
    } catch (attendanceError) {
      console.error("Error creating attendance records for leave:", attendanceError);
      // Don't fail the leave approval if attendance record creation fails
      // The leave is still approved, just attendance records might not be created
    }
    
    // Populate data
    await leave.populate("employeeId", "name email department");
    await leave.populate("reviewedBy", "name");
    
    // Format response
    const formattedLeave = {
      id: leave._id,
      employee: {
        id: leave.employeeId._id.toString(),
        name: leave.employeeId.name,
        department: leave.employeeId.department,
        email: leave.employeeId.email
      },
      type: leave.type,
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      days: leave.days,
      reason: leave.reason,
      status: leave.status,
      appliedDate: new Date(leave.appliedDate),
      approver: leave.reviewedBy ? leave.reviewedBy.name : null,
      approvedDate: leave.reviewedAt ? new Date(leave.reviewedAt) : null,
      rejectionReason: null
    };
    
    res.json({
      message: "Leave request approved successfully",
      leave: formattedLeave
    });
  } catch (error) {
    console.error("Error approving leave request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   PUT /api/leaves/:id/reject
// @desc    Reject a leave request (Admin only)
// @access  Private (Admin)
router.put("/:id/reject", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    
    if (leave.status !== "pending") {
      return res.status(400).json({ 
        message: `Leave request is already ${leave.status}` 
      });
    }
    
    leave.status = "rejected";
    leave.reviewedAt = new Date();
    leave.reviewedBy = req.user._id;
    if (rejectionReason) {
      leave.rejectionReason = rejectionReason.trim();
    }
    
    await leave.save();
    
    // Populate data
    await leave.populate("employeeId", "name email department");
    await leave.populate("reviewedBy", "name");
    
    // Format response
    const formattedLeave = {
      id: leave._id,
      employee: {
        id: leave.employeeId._id.toString(),
        name: leave.employeeId.name,
        department: leave.employeeId.department,
        email: leave.employeeId.email
      },
      type: leave.type,
      startDate: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      days: leave.days,
      reason: leave.reason,
      status: leave.status,
      appliedDate: new Date(leave.appliedDate),
      approver: leave.reviewedBy ? leave.reviewedBy.name : null,
      approvedDate: leave.reviewedAt ? new Date(leave.reviewedAt) : null,
      rejectionReason: leave.rejectionReason || null
    };
    
    res.json({
      message: "Leave request rejected successfully",
      leave: formattedLeave
    });
  } catch (error) {
    console.error("Error rejecting leave request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/leaves/stats
// @desc    Get leave statistics (for cards display)
// @access  Private
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    let query = {};
    
    // If user is employee, only show their own leaves
    if (req.user.role !== "admin") {
      query.employeeId = req.user._id;
    }
    
    const allLeaves = await Leave.find(query);
    
    // Calculate statistics
    // Annual leave allowance: 1 leave per month = 12 days per year
    const annualLeaveAllowance = 12;
    const totalDaysUsed = allLeaves
      .filter(l => l.status === "approved")
      .reduce((sum, l) => sum + l.days, 0);
    
    const stats = {
      totalPending: allLeaves.filter(l => l.status === "pending").length,
      totalApproved: allLeaves.filter(l => l.status === "approved").length,
      totalRejected: allLeaves.filter(l => l.status === "rejected").length,
      totalDaysUsed: totalDaysUsed,
      totalDaysRemaining: Math.max(0, annualLeaveAllowance - totalDaysUsed)
    };
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching leave stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;

