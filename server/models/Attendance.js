const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  inTime: {
    type: Date
  },
  outTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Leave", "Holiday", "CompOff", "HalfDay", "EarlyLeave"],
    default: "Present"
  },
  location: {
    type: String,
    default: "Office"
  },
  compOff: {
    type: Boolean,
    default: false
  },
  lateMark: {
    type: Boolean,
    default: false
  },
  hoursWorked: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Add createdAt and updatedAt fields
});

module.exports = mongoose.model("Attendance", attendanceSchema);