const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^EMP\d+$/, 'Employee ID must be in format EMP001, EMP002, etc.']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['employee', 'admin'],
    default: 'employee'
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: [0, 'Salary cannot be negative']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate sequential employee ID before saving
employeeSchema.pre('save', async function(next) {
  // Only generate employeeId if it doesn't exist and this is a new document
  if (!this.employeeId && this.isNew) {
    try {
      // Find all employees with employeeId to get the highest number
      const employees = await this.constructor
        .find({ employeeId: { $exists: true, $ne: null, $regex: /^EMP\d+$/ } })
        .select('employeeId')
        .lean();
      
      let nextNumber = 1;
      
      if (employees.length > 0) {
        // Extract numbers from all employee IDs and find the maximum
        const numbers = employees
          .map(emp => {
            const match = emp.employeeId.match(/^EMP(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(num => num > 0);
        
        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }
      
      // Format as EMP001, EMP002, etc. (3 digits minimum)
      this.employeeId = `EMP${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating employee ID:', error);
      return next(error);
    }
  }
  
  next();
});

// Hash password before saving
employeeSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
employeeSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create index for faster searches
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ name: 1, email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ role: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
