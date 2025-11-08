const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const AttendanceEditRequest = require("../models/AttendanceEditRequest");
const Employee = require("../models/Employee");
const { authenticateToken } = require("../middleware/auth");

// Submit an attendance edit request
router.post("/edit-request", authenticateToken, async (req, res) => {
  try {
    const { attendanceId, date, inTime, outTime, reason } = req.body;
    const employeeId = req.user.id;

    console.log('📝 POST /edit-request - Employee ID:', employeeId);
    console.log('📝 Request data:', { attendanceId, date, inTime, outTime, reason });

    // Validate required fields
    if (!attendanceId || !date || !reason) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ 
        message: "Attendance ID, date, and reason are required" 
      });
    }

    // Check if attendance record exists
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      console.error('❌ Attendance record not found:', attendanceId);
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Check if employee owns this attendance record
    if (attendance.employeeId.toString() !== employeeId) {
      console.error('❌ Employee does not own this attendance record');
      return res.status(403).json({ 
        message: "You can only edit your own attendance records" 
      });
    }

    // Check if there's already a pending request for this attendance
    const existingRequest = await AttendanceEditRequest.findOne({
      attendanceId,
      status: "pending"
    });

    if (existingRequest) {
      console.error('❌ Pending request already exists for this attendance');
      return res.status(400).json({ 
        message: "There is already a pending edit request for this attendance record" 
      });
    }

    // Format original times for storage
    const formatTimeForStorage = (time) => {
      if (!time) return null;
      if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
        return time; // Already in HH:mm format
      }
      if (time instanceof Date) {
        const hours = String(time.getHours()).padStart(2, '0');
        const minutes = String(time.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return null;
    };

    // Create edit request
    const editRequest = new AttendanceEditRequest({
      employeeId,
      attendanceId,
      date: new Date(date),
      originalInTime: formatTimeForStorage(attendance.inTime),
      originalOutTime: formatTimeForStorage(attendance.outTime),
      requestedInTime: inTime,
      requestedOutTime: outTime,
      reason
    });

    await editRequest.save();

    console.log('✅ Edit request created successfully:', {
      id: editRequest._id,
      employeeId: editRequest.employeeId,
      attendanceId: editRequest.attendanceId,
      date: editRequest.date,
      requestedInTime: editRequest.requestedInTime,
      requestedOutTime: editRequest.requestedOutTime,
      status: editRequest.status
    });

    res.status(201).json({
      message: "Attendance edit request submitted successfully",
      requestId: editRequest._id
    });
  } catch (error) {
    console.error('❌ Error in POST /edit-request:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all edit requests for an employee
router.get("/edit-requests/employee", authenticateToken, async (req, res) => {
  try {
    const employeeId = req.user.id;
    
    const requests = await AttendanceEditRequest.find({ employeeId })
      .sort({ createdAt: -1 })
      .populate("attendanceId", "inTime outTime date")
      .populate("reviewedBy", "name");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all pending edit requests (for admin)
router.get("/edit-requests/pending", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const employee = await Employee.findById(req.user.id);
    if (employee.role !== "admin") {
      return res.status(403).json({ 
        message: "Access denied. Admin only." 
      });
    }

    const requests = await AttendanceEditRequest.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .populate("employeeId", "name email")
      .populate("attendanceId", "inTime outTime date");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all edit requests (for admin) - with optional status filter
router.get("/edit-requests", authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GET /edit-requests - User ID:', req.user.id);
    
    // Check if user is admin
    const employee = await Employee.findById(req.user.id);
    if (!employee) {
      console.error('❌ Employee not found for user ID:', req.user.id);
      return res.status(404).json({ 
        message: "Employee not found" 
      });
    }
    
    if (employee.role !== "admin") {
      console.error('❌ Access denied - User is not admin. Role:', employee.role);
      return res.status(403).json({ 
        message: "Access denied. Admin only." 
      });
    }

    const { status } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    
    console.log('🔍 Query for edit requests:', query);
    
    const requests = await AttendanceEditRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("employeeId", "name email")
      .populate("attendanceId", "inTime outTime date")
      .populate("reviewedBy", "name");

    console.log(`✅ Found ${requests.length} edit requests in database`);
    console.log('📋 Requests:', requests.map(r => ({
      id: r._id,
      employeeId: r.employeeId?._id || r.employeeId,
      employeeName: r.employeeId?.name || 'Unknown',
      status: r.status,
      date: r.date
    })));

    res.json(requests);
  } catch (error) {
    console.error('❌ Error in GET /edit-requests:', error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Approve or reject an edit request (admin only)
router.put("/edit-request/:id/:action", authenticateToken, async (req, res) => {
  try {
    const { id, action } = req.params;
    const { comment } = req.body;
    
    // Validate action
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ 
        message: "Action must be 'approve' or 'reject'" 
      });
    }

    // Check if user is admin
    const employee = await Employee.findById(req.user.id);
    if (employee.role !== "admin") {
      return res.status(403).json({ 
        message: "Access denied. Admin only." 
      });
    }

    // Find the edit request
    const editRequest = await AttendanceEditRequest.findById(id)
      .populate("attendanceId");
    
    if (!editRequest) {
      return res.status(404).json({ message: "Edit request not found" });
    }

    // Update request status
    editRequest.status = action === "approve" ? "approved" : "rejected";
    editRequest.reviewedAt = new Date();
    editRequest.reviewedBy = req.user.id;
    if (comment) editRequest.comment = comment;

    await editRequest.save();

    // If approved, update the attendance record
    if (action === "approve") {
      const attendance = editRequest.attendanceId;
      
      // The key issue: We need to create the date in the exact same way as the original check-in
      // The original check-in uses the attendance.date which is stored at midnight (00:00:00)
      // We need to use that same date and just change the time portion
      
      // Get the attendance date - this is the date stored in the database
      // It's stored as a Date object at midnight (00:00:00) in local timezone
      const baseDate = new Date(attendance.date);
      
      // Convert time strings to Date objects
      if (editRequest.requestedInTime) {
        // Parse time string (HH:mm format)
        const [hours, minutes] = editRequest.requestedInTime.split(':').map(Number);
        
        // Create date by combining the base date with the requested time
        // We create a new Date object with the same date but different time
        // This matches exactly how the original check-in stores times
        const inTimeDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours || 0, minutes || 0, 0, 0);
        attendance.inTime = inTimeDate;
      }
      
      if (editRequest.requestedOutTime) {
        // Parse time string (HH:mm format)
        const [hours, minutes] = editRequest.requestedOutTime.split(':').map(Number);
        
        // Create date by combining the base date with the requested time
        const outTimeDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours || 0, minutes || 0, 0, 0);
        attendance.outTime = outTimeDate;
      }
      
      // Recalculate status if needed (ensure it's still "Present" if times are updated)
      if (attendance.inTime || attendance.outTime) {
        attendance.status = "Present";
      }
      
      await attendance.save();
      
      // Format times for logging
      const formatTimeForLog = (date) => {
        if (!date) return null;
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };
      
      console.log(`✅ Updated attendance record ${attendance._id} with new times:`, {
        baseDate: baseDate.toISOString(),
        baseDateLocal: `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`,
        requestedInTime: editRequest.requestedInTime,
        requestedOutTime: editRequest.requestedOutTime,
        storedInTime: formatTimeForLog(attendance.inTime),
        storedOutTime: formatTimeForLog(attendance.outTime),
        storedInTimeGetHours: attendance.inTime ? attendance.inTime.getHours() : null,
        storedInTimeGetMinutes: attendance.inTime ? attendance.inTime.getMinutes() : null,
        inTimeISO: attendance.inTime ? attendance.inTime.toISOString() : null,
        outTimeISO: attendance.outTime ? attendance.outTime.toISOString() : null
      });
    }

    res.json({
      message: `Edit request ${action}d successfully`,
      request: editRequest,
      attendanceUpdated: action === "approve"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;