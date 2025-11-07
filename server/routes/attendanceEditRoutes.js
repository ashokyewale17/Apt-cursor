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

    // Validate required fields
    if (!attendanceId || !date || !reason) {
      return res.status(400).json({ 
        message: "Attendance ID, date, and reason are required" 
      });
    }

    // Check if attendance record exists
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Check if employee owns this attendance record
    if (attendance.employeeId.toString() !== employeeId) {
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
      return res.status(400).json({ 
        message: "There is already a pending edit request for this attendance record" 
      });
    }

    // Create edit request
    const editRequest = new AttendanceEditRequest({
      employeeId,
      attendanceId,
      date: new Date(date),
      originalInTime: attendance.inTime,
      originalOutTime: attendance.outTime,
      requestedInTime: inTime,
      requestedOutTime: outTime,
      reason
    });

    await editRequest.save();

    res.status(201).json({
      message: "Attendance edit request submitted successfully",
      requestId: editRequest._id
    });
  } catch (error) {
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
    // Check if user is admin
    const employee = await Employee.findById(req.user.id);
    if (employee.role !== "admin") {
      return res.status(403).json({ 
        message: "Access denied. Admin only." 
      });
    }

    const { status } = req.query;
    const query = status && status !== 'all' ? { status } : {};
    
    const requests = await AttendanceEditRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("employeeId", "name email")
      .populate("attendanceId", "inTime outTime date")
      .populate("reviewedBy", "name");

    res.json(requests);
  } catch (error) {
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
      
      // Use the attendance record's date to ensure consistency
      // Create a new Date object from the attendance date and reset time to midnight
      const attendanceDate = new Date(attendance.date);
      attendanceDate.setHours(0, 0, 0, 0);
      
      // Convert time strings to Date objects
      if (editRequest.requestedInTime) {
        // Parse time string (HH:mm format) and combine with the attendance date
        const [hours, minutes] = editRequest.requestedInTime.split(':').map(Number);
        const inTimeDate = new Date(attendanceDate);
        // Set the time using local timezone (this is correct for attendance times)
        inTimeDate.setHours(hours || 0, minutes || 0, 0, 0);
        attendance.inTime = inTimeDate;
      }
      
      if (editRequest.requestedOutTime) {
        // Parse time string (HH:mm format) and combine with the attendance date
        const [hours, minutes] = editRequest.requestedOutTime.split(':').map(Number);
        const outTimeDate = new Date(attendanceDate);
        // Set the time using local timezone (this is correct for attendance times)
        outTimeDate.setHours(hours || 0, minutes || 0, 0, 0);
        attendance.outTime = outTimeDate;
      }
      
      // Recalculate status if needed (ensure it's still "Present" if times are updated)
      if (attendance.inTime || attendance.outTime) {
        attendance.status = "Present";
      }
      
      await attendance.save();
      
      console.log(`✅ Updated attendance record ${attendance._id} with new times:`, {
        date: attendance.date,
        inTime: attendance.inTime,
        outTime: attendance.outTime,
        requestedInTime: editRequest.requestedInTime,
        requestedOutTime: editRequest.requestedOutTime,
        inTimeFormatted: attendance.inTime ? new Date(attendance.inTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
        outTimeFormatted: attendance.outTime ? new Date(attendance.outTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null
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