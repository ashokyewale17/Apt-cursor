const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const mongoose = require("mongoose");

// Simplified helper function to find employee - direct approach
const findEmployeeByAnyId = async (id) => {
  try {
    console.log('Attempting to find employee with ID:', id);
    
    // Handle null/undefined
    if (!id) {
      throw new Error('Employee ID is required');
    }
    
    // If it's already an ObjectId, try direct lookup
    if (id instanceof mongoose.Types.ObjectId) {
      return await Employee.findById(id);
    }
    
    // If it's a string
    if (typeof id === 'string') {
      // Try email lookup first - this is the most reliable method
      let employee = await Employee.findOne({ email: id });
      if (employee) {
        return employee;
      }
      
      // Try ObjectId string lookup
      if (mongoose.Types.ObjectId.isValid(id)) {
        try {
          return await Employee.findById(new mongoose.Types.ObjectId(id));
        } catch (e) {
          // Continue with other methods
        }
      }
      
      // SPECIAL CASE FOR MOCK SYSTEM:
      // For numeric IDs 1-7, directly return the corresponding employee by email
      const mockEmails = {
        "1": "admin@company.com",
        "2": "vijay.solanki@company.com",
        "3": "pinky.chakrabarty@company.com",
        "4": "sanket.pawal@company.com",
        "5": "ashok.yewale@company.com",
        "6": "harshal.lohar@company.com",
        "7": "prasanna.pandit@company.com"
      };
      
      if (mockEmails[id]) {
        employee = await Employee.findOne({ email: mockEmails[id] });
        // If employee doesn't exist, create them
        if (!employee) {
          const mockEmployeeData = {
            "1": { name: 'Tushar Mhaskar', email: 'admin@company.com', password: 'admin123', department: 'Admin', position: 'Admin & HR', role: 'admin', salary: 80000, phone: '+1234567891', address: '123 Admin St, City, State' },
            "2": { name: 'Vijay Solanki', email: 'vijay.solanki@company.com', password: 'test123', department: 'Testing', position: 'QA Engineer', role: 'employee', salary: 60000, phone: '+1234567892', address: '124 Test St, City, State' },
            "3": { name: 'Pinky Chakrabarty', email: 'pinky.chakrabarty@company.com', password: 'ops123', department: 'Operations', position: 'Operations Manager', role: 'employee', salary: 65000, phone: '+1234567893', address: '125 Ops St, City, State' },
            "4": { name: 'Sanket Pawal', email: 'sanket.pawal@company.com', password: 'design123', department: 'Design', position: 'UI/UX Designer', role: 'employee', salary: 70000, phone: '+1234567894', address: '126 Design St, City, State' },
            "5": { name: 'Ashok Yewale', email: 'ashok.yewale@company.com', password: 'soft123', department: 'Software', position: 'Software Developer', role: 'employee', salary: 75000, phone: '+1234567895', address: '127 Software St, City, State' },
            "6": { name: 'Harshal Lohar', email: 'harshal.lohar@company.com', password: 'soft123', department: 'Software', position: 'Senior Developer', role: 'employee', salary: 85000, phone: '+1234567896', address: '128 Senior St, City, State' },
            "7": { name: 'Prasanna Pandit', email: 'prasanna.pandit@company.com', password: 'embed123', department: 'Embedded', position: 'Embedded Engineer', role: 'employee', salary: 80000, phone: '+1234567897', address: '129 Embedded St, City, State' }
          };
          
          try {
            const newEmployee = new Employee(mockEmployeeData[id]);
            employee = await newEmployee.save();
            console.log('Created new employee:', employee.name);
          } catch (createError) {
            console.error('Error creating employee:', createError.message);
            // Even if creation fails, try to find by other means
            employee = await Employee.findOne({ email: mockEmails[id] });
          }
        }
        return employee;
      }
      
      // For numeric IDs beyond 7, we need to handle the case where localStorage might have
      // simple numeric IDs but the database has real ObjectIds
      if (/^\d+$/.test(id) && parseInt(id) > 7) {
        // Get all employees from the database
        const allEmployees = await Employee.find({ isActive: true });
        
        // Sort employees by creation date to maintain consistent ordering
        allEmployees.sort((a, b) => a.createdAt - b.createdAt);
        
        // Try to find by index (assuming numeric IDs correspond to order of creation)
        // IDs 1-7 are reserved for mock employees, so ID 8 would be the first real employee, etc.
        const index = parseInt(id) - 8;
        if (index >= 0 && index < allEmployees.length) {
          return allEmployees[index];
        }
        
        // If index method fails, try to match by partial ObjectId
        for (const emp of allEmployees) {
          if (emp._id.toString().includes(id)) {
            return emp;
          }
        }
      }
      
      // For any other string ID, try to find by _id
      // This will handle both MongoDB ObjectIds and numeric IDs for newly created employees
      employee = await Employee.findById(id);
      if (employee) {
        return employee;
      }
      
      // Last resort: try to find by _id as string in case of stringified ObjectIds
      employee = await Employee.findOne({ _id: id });
      if (employee) {
        return employee;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in findEmployeeByAnyId:', error.message);
    return null;
  }
};

// Check-in endpoint
router.post("/checkin", async (req, res) => {
  try {
    const { employeeId, location } = req.body;
    
    console.log('Check-in request received:', { employeeId, location });
    
    // Validate that we have an employeeId
    if (!employeeId) {
      return res.status(400).json({ 
        error: "Employee ID is required" 
      });
    }
    
    // Find employee by various ID formats
    const employee = await findEmployeeByAnyId(employeeId);
    
    if (!employee) {
      console.log('Employee not found for ID:', employeeId);
      // Log additional debugging info
      const allEmployees = await Employee.find({ isActive: true });
      console.log('All active employees in database:', allEmployees.map(e => ({ 
        _id: e._id, 
        name: e.name, 
        email: e.email 
      })));
      return res.status(400).json({ 
        error: "Employee not found with provided ID: " + employeeId
      });
    }
    
    console.log('Found employee for check-in:', employee.name, employee._id);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if employee already has a check-in for today
    let attendanceRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: today
    });
    
    if (attendanceRecord) {
      // If already checked in, return existing record
      return res.status(400).json({ 
        error: "Employee already checked in today",
        record: attendanceRecord
      });
    }
    
    // Create new attendance record with proper ObjectId
    attendanceRecord = new Attendance({
      employeeId: employee._id,
      date: today,
      inTime: new Date(),
      status: "Present"
    });
    
    await attendanceRecord.save();
    
    // Try to populate employee details
    try {
      await attendanceRecord.populate('employeeId', 'name department');
    } catch (populateError) {
      console.warn('Could not populate employee details:', populateError.message);
    }
    
    // Emit socket event for real-time update with canonical ObjectId
    const io = req.app.get('io');
    if (io) {
      io.emit('employeeCheckIn', {
        employeeId: String(employee._id),
        employeeName: attendanceRecord.employeeId?.name || 'Unknown',
        department: attendanceRecord.employeeId?.department || 'Unknown',
        checkInTime: attendanceRecord.inTime,
        location: location || 'Office'
      });
    }
    
    res.status(201).json({
      message: "Check-in successful",
      record: attendanceRecord
    });
  } catch (error) {
    console.error('Error in POST /checkin:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check-out endpoint
router.post("/checkout", async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    console.log('Check-out request received:', { employeeId });
    
    // Validate that we have an employeeId
    if (!employeeId) {
      return res.status(400).json({ 
        error: "Employee ID is required" 
      });
    }
    
    // Find employee by various ID formats
    const employee = await findEmployeeByAnyId(employeeId);
    
    if (!employee) {
      console.log('Employee not found for ID:', employeeId);
      // Log additional debugging info
      const allEmployees = await Employee.find({ isActive: true });
      console.log('All active employees in database:', allEmployees.map(e => ({ 
        _id: e._id, 
        name: e.name, 
        email: e.email 
      })));
      return res.status(400).json({ 
        error: "Employee not found with provided ID: " + employeeId
      });
    }
    
    console.log('Found employee for check-out:', employee.name, employee._id);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's attendance record
    let attendanceRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: today
    });
    
    if (!attendanceRecord) {
      return res.status(400).json({ 
        error: "No check-in record found for today"
      });
    }
    
    if (attendanceRecord.outTime) {
      return res.status(400).json({ 
        error: "Employee already checked out today",
        record: attendanceRecord
      });
    }
    
    // Update checkout time
    attendanceRecord.outTime = new Date();
    await attendanceRecord.save();
    
    // Calculate hours worked
    const checkInTime = new Date(attendanceRecord.inTime);
    const checkOutTime = new Date(attendanceRecord.outTime);
    const diffMs = checkOutTime - checkInTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const hoursWorked = `${diffHours}h ${diffMinutes}m`;
    
    // Try to populate employee details
    try {
      await attendanceRecord.populate('employeeId', 'name department');
    } catch (populateError) {
      console.warn('Could not populate employee details:', populateError.message);
    }
    
    // Emit socket event for real-time update with canonical ObjectId
    const io = req.app.get('io');
    if (io) {
      io.emit('employeeCheckOut', {
        employeeId: String(employee._id),
        employeeName: attendanceRecord.employeeId?.name || 'Unknown',
        department: attendanceRecord.employeeId?.department || 'Unknown',
        checkOutTime: attendanceRecord.outTime,
        hoursWorked: hoursWorked
      });
    }
    
    res.json({
      message: "Check-out successful",
      record: attendanceRecord,
      hoursWorked: hoursWorked
    });
  } catch (error) {
    console.error('Error in POST /checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get today's attendance status for an employee
router.get("/today/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log('Today status request received:', { employeeId });
    
    // Validate that we have an employeeId
    if (!employeeId) {
      return res.status(400).json({ 
        error: "Employee ID is required" 
      });
    }
    
    // Find employee by various ID formats
    const employee = await findEmployeeByAnyId(employeeId);
    
    if (!employee) {
      console.log('Employee not found for ID:', employeeId);
      // Log additional debugging info
      const allEmployees = await Employee.find({ isActive: true });
      console.log('All active employees in database:', allEmployees.map(e => ({ 
        _id: e._id, 
        name: e.name, 
        email: e.email 
      })));
      return res.status(400).json({ 
        error: "Employee not found with provided ID: " + employeeId
      });
    }
    
    console.log('Found employee for today status:', employee.name, employee._id);
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find today's attendance record
    const attendanceRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: today
    }).populate('employeeId', 'name department');
    
    if (!attendanceRecord) {
      return res.json({ 
        isCheckedIn: false,
        message: "No attendance record for today"
      });
    }
    
    res.json({
      isCheckedIn: !!attendanceRecord.inTime && !attendanceRecord.outTime,
      isCheckedOut: !!attendanceRecord.outTime,
      record: attendanceRecord
    });
  } catch (error) {
    console.error('Error in GET /today/:employeeId:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get personal attendance for an employee by month/year
router.get("/employee/:empId/:month/:year", async (req, res) => {
  const { empId, month, year } = req.params;

  try {
    console.log('Employee attendance request received:', { empId, month, year });
    
    // Find employee by various ID formats
    const employee = await findEmployeeByAnyId(empId);
    
    if (!employee) {
      console.log('Employee not found for ID:', empId);
      // Log additional debugging info
      const allEmployees = await Employee.find({ isActive: true });
      console.log('All active employees in database:', allEmployees.map(e => ({ 
        _id: e._id, 
        name: e.name, 
        email: e.email 
      })));
      return res.status(400).json({ 
        error: "Employee not found with provided ID: " + empId
      });
    }
    
    console.log('Found employee for attendance records:', employee.name, employee._id);

    const records = await Attendance.find({
      employeeId: employee._id,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0),
      },
    });

    res.json(records);
  } catch (error) {
    console.error('Error in GET /employee/:empId/:month/:year:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;