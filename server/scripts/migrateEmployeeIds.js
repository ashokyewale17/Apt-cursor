const mongoose = require('mongoose');
require('dotenv').config();
const Employee = require('../models/Employee');

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Multiple connection string options (same as server config)
    const connectionStrings = [
      process.env.MONGODB_URI,
      'mongodb://127.0.0.1:27017/employee_management',
      'mongodb://localhost:27017/employee_management'
    ].filter(Boolean);
    
    console.log('Attempting to connect to MongoDB...');
    
    let connected = false;
    let lastError;
    
    for (const uri of connectionStrings) {
      try {
        console.log(`Trying: ${uri}`);
        const conn = await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        connected = true;
        break;
      } catch (err) {
        lastError = err;
        console.log(`❌ Failed: ${err.message}`);
        continue;
      }
    }
    
    if (!connected) {
      throw lastError || new Error('Could not connect to MongoDB');
    }
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.log('\n📋 Make sure MongoDB is running:');
    console.log('   - Windows: Check Services or run "net start MongoDB"');
    console.log('   - Or start manually: mongod --dbpath "C:\\data\\db"');
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

