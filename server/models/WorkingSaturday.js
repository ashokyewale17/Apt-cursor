const mongoose = require("mongoose");

const workingSaturdaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  isWorking: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },
  notes: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Ensure the date is stored as a date without time component
workingSaturdaySchema.pre('save', function(next) {
  if (this.date) {
    this.date.setHours(0, 0, 0, 0);
  }
  next();
});

// Index for efficient querying
workingSaturdaySchema.index({ date: 1 });

module.exports = mongoose.model("WorkingSaturday", workingSaturdaySchema);

