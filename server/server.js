const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const { Server } = require('socket.io');
const http = require('http');

// Load environment variables
dotenv.config();

// Connect to database and wait for connection
const startServer = async () => {
  try {
    await connectDB();
    
    const app = express();

    // Create HTTP server for Socket.io
    const server = http.createServer(app);

    // Initialize Socket.io
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL] : '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Store active connections
    const activeConnections = new Map();

    // Socket.io connection handling
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      // When a user joins, store their employee ID
      socket.on('join', (employeeId) => {
        activeConnections.set(socket.id, employeeId);
        console.log(`Employee ${employeeId} joined with socket ${socket.id}`);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        const employeeId = activeConnections.get(socket.id);
        if (employeeId) {
          activeConnections.delete(socket.id);
          console.log(`Employee ${employeeId} disconnected`);
        } else {
          console.log('User disconnected:', socket.id);
        }
      });
    });

    // Make io available to other modules
    app.set('io', io);

    // Middleware
    app.use(cors({
      origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL] : '*',
      credentials: true
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/employees', require('./routes/employees'));
    app.use("/api/employee", require("./routes/employeeRoutes"));
    app.use("/api/attendance-edit", require("./routes/attendanceEditRoutes"));
    app.use("/api/attendance-records", require("./routes/attendanceRoutes"));
    app.use("/api/leaves", require("./routes/leaveRoutes"));
    app.use("/api/working-saturdays", require("./routes/workingSaturdayRoutes"));

    // Enhanced Health check endpoint with more details
    app.get('/api/health', (req, res) => {
      res.json({ 
        message: 'Employee Management API is running!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
        version: '1.0.0',
        socketConnections: activeConnections.size
      });
    });

    // Serve static files from React build in production
    if (process.env.NODE_ENV === 'production') {
      // Serve static files
      app.use(express.static(path.join(__dirname, '../client/dist')));
      
      // Handle React routing, return all requests to React app
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
      });
    }

    // Create default admin user if it doesn't exist
    const createDefaultAdmin = async () => {
      try {
        // Check if we're connected to the database
        if (require('mongoose').connection.readyState !== 1) {
          console.log('Skipping default admin creation - database not connected');
          return;
        }
        
        const Employee = require('./models/Employee');
        const adminExists = await Employee.findOne({ role: 'admin' });
        
        if (!adminExists) {
          const defaultAdmin = new Employee({
            name: 'System Administrator',
            email: 'admin@company.com',
            password: 'admin123',
            role: 'admin',
            position: 'System Administrator',
            department: 'IT',
            salary: 100000,
            phone: '+1234567890',
            address: '123 Admin Street, City, State'
          });
          
          await defaultAdmin.save();
          console.log('Default admin user created:');
          console.log('Email: admin@company.com');
          console.log('Password: admin123');
        }
      } catch (error) {
        console.error('Error creating default admin:', error.message);
      }
    };

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: 'Something went wrong!', error: err.message });
    });

    // Handle undefined routes
    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Route not found' });
    });

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      
      // Create default admin after server starts
      setTimeout(createDefaultAdmin, 2000);

      // Seed demo employees (7 users) after server starts
      setTimeout(async () => {
        try {
          const mongoose = require('mongoose');
          if (mongoose.connection.readyState !== 1) {
            console.log('Skipping demo employee seeding - database not connected');
            return;
          }
          const Employee = require('./models/Employee');

          const demoEmployees = [
            { name: 'Tushar Mhaskar', email: 'admin@company.com', password: 'admin123', department: 'Admin', position: 'Admin & HR', role: 'admin', salary: 80000, phone: '+1234567891', address: '123 Admin St, City, State' },
            { name: 'Vijay Solanki', email: 'vijay.solanki@company.com', password: 'test123', department: 'Testing', position: 'QA Engineer', role: 'employee', salary: 60000, phone: '+1234567892', address: '124 Test St, City, State' },
            { name: 'Pinky Chakrabarty', email: 'pinky.chakrabarty@company.com', password: 'ops123', department: 'Operations', position: 'Operations Manager', role: 'employee', salary: 65000, phone: '+1234567893', address: '125 Ops St, City, State' },
            { name: 'Sanket Pawal', email: 'sanket.pawal@company.com', password: 'design123', department: 'Design', position: 'UI/UX Designer', role: 'employee', salary: 70000, phone: '+1234567894', address: '126 Design St, City, State' },
            { name: 'Ashok Yewale', email: 'ashok.yewale@company.com', password: 'soft123', department: 'Software', position: 'Software Developer', role: 'employee', salary: 75000, phone: '+1234567895', address: '127 Software St, City, State' },
            { name: 'Harshal Lohar', email: 'harshal.lohar@company.com', password: 'soft123', department: 'Software', position: 'Senior Developer', role: 'employee', salary: 85000, phone: '+1234567896', address: '128 Senior St, City, State' },
            { name: 'Prasanna Pandit', email: 'prasanna.pandit@company.com', password: 'embed123', department: 'Embedded', position: 'Embedded Engineer', role: 'employee', salary: 80000, phone: '+1234567897', address: '129 Embedded St, City, State' }
          ];

          for (const emp of demoEmployees) {
            const exists = await Employee.findOne({ email: emp.email });
            if (!exists) {
              const e = new Employee(emp);
              await e.save();
              console.log(`Seeded employee: ${emp.name} (${emp.email})`);
            }
          }
        } catch (seedErr) {
          console.error('Error seeding demo employees:', seedErr.message);
        }
      }, 3000);
    });

    // Export io for use in other modules
    module.exports = { app, io };
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();