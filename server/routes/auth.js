const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Employee = require('../models/Employee');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// @route   POST /api/auth/login
// @desc    Login user (employee or admin)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: 'Please provide email and password'
      });
    }

    // Find user and include password for comparison
    const user = await Employee.findOne({
      email: email.toLowerCase(),
      isActive: true
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Remove password from response
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      department: user.department,
      lastLogin: user.lastLogin
    };

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: error.message
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register new employee (admin only in real app, but open for demo)
// @access  Public (for demo purposes)
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      position,
      department,
      salary,
      phone,
      address
    } = req.body;

    // Check if user already exists
    const existingUser = await Employee.findOne({
      email: email.toLowerCase(),
      isActive: true
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email already exists'
      });
    }

    // Create new employee
    const employee = new Employee({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'employee',
      position,
      department,
      salary,
      phone,
      address
    });

    await employee.save();

    // Generate token
    const token = generateToken(employee._id, employee.role);

    // Remove password from response
    const userResponse = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      position: employee.position,
      department: employee.department,
      dateOfJoining: employee.dateOfJoining
    };

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await Employee.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      department: user.department,
      salary: user.salary,
      phone: user.phone,
      address: user.address,
      dateOfJoining: user.dateOfJoining,
      lastLogin: user.lastLogin
    };

    res.json({ user: userResponse });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      message: 'Invalid token'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal, but we can log it)
// @access  Private
router.post('/logout', (req, res) => {
  // In a real app, you might want to blacklist the token
  // For now, we'll just send a success response
  res.json({ message: 'Logout successful' });
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await Employee.findById(decoded.id).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordCorrect) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
