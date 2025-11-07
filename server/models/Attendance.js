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
    enum: ["Present", "Absent", "Leave", "Holiday"],
    default: "Present"
  },
  location: {
    type: String,
    default: "Office"
  }
}, {
  timestamps: true // Add createdAt and updatedAt fields
});

module.exports = mongoose.model("Attendance", attendanceSchema);