const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
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
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    maxlength: [50, 'Employee ID cannot exceed 50 characters']
  },
  birthDate: {
    type: Date
  },
  companyEmail: {
    type: String,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || validator.isEmail(v);
      },
      message: 'Please provide a valid company email'
    }
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  aadharNumber: {
    type: String,
    trim: true,
    maxlength: [12, 'Aadhar number must be 12 digits']
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [10, 'PAN number must be 10 characters'],
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Please provide a valid PAN number (format: ABCDE1234F)'
    }
  },
  bankName: {
    type: String,
    trim: true,
    maxlength: [100, 'Bank name cannot exceed 100 characters']
  },
  bankAccountNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Account number cannot exceed 20 characters']
  },
  bankIFSC: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [11, 'IFSC code must be 11 characters'],
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
      },
      message: 'Please provide a valid IFSC code (format: ABCD0123456)'
    }
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
employeeSchema.index({ name: 1, email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ role: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
