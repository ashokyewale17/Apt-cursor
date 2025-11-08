const mongoose = require('mongoose');
require('dotenv').config();
const Employee = require('../models/Employee');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Migrate employee IDs
const migrateEmployeeIds = async () => {
  try {
    await connectDB();
    
    console.log('Starting employee ID migration...');
    
    // Find all employees without employeeId or with invalid format
    const employeesWithoutId = await Employee.find({
      $or: [
        { employeeId: { $exists: false } },
        { employeeId: null },
        { employeeId: { $not: /^EMP\d+$/ } }
      ]
    }).sort({ createdAt: 1 }); // Sort by creation date for consistent ordering
    
    console.log(`Found ${employeesWithoutId.length} employees without valid employee IDs`);
    
    // Get all existing employee IDs to find the highest number
    const allEmployees = await Employee.find({
      employeeId: { $exists: true, $ne: null, $regex: /^EMP\d+$/ }
    }).select('employeeId').lean();
    
    let nextNumber = 1;
    
    if (allEmployees.length > 0) {
      // Extract numbers from all employee IDs and find the maximum
      const numbers = allEmployees
        .map(emp => {
          const match = emp.employeeId.match(/^EMP(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);
      
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }
    
    console.log(`Starting employee ID assignment from EMP${nextNumber.toString().padStart(3, '0')}`);
    
    // Assign employee IDs
    for (const employee of employeesWithoutId) {
      const employeeId = `EMP${nextNumber.toString().padStart(3, '0')}`;
      employee.employeeId = employeeId;
      await employee.save();
      console.log(`Assigned ${employeeId} to ${employee.name} (${employee.email})`);
      nextNumber++;
    }
    
    console.log(`\nMigration completed! Assigned ${employeesWithoutId.length} employee IDs.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

// Run migration
migrateEmployeeIds();

