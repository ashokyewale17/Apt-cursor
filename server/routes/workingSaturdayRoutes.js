const express = require("express");
const router = express.Router();
const WorkingSaturday = require("../models/WorkingSaturday");
const Employee = require("../models/Employee");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Get all working Saturdays (admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = {};
    
    // If date range is provided, filter by date range
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const workingSaturdays = await WorkingSaturday.find(query)
      .sort({ date: 1 })
      .populate('createdBy', 'name email');
    
    res.json(workingSaturdays);
  } catch (error) {
    console.error('Error fetching working Saturdays:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if a specific date is a working Saturday
router.get("/check/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Check if it's a Saturday
    if (checkDate.getDay() !== 6) {
      return res.json({ isWorkingSaturday: false });
    }
    
    const workingSaturday = await WorkingSaturday.findOne({ date: checkDate });
    
    res.json({ 
      isWorkingSaturday: !!workingSaturday && workingSaturday.isWorking === true 
    });
  } catch (error) {
    console.error('Error checking working Saturday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a working Saturday (admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date, notes } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    
    const workingDate = new Date(date);
    workingDate.setHours(0, 0, 0, 0);
    
    // Verify it's a Saturday
    if (workingDate.getDay() !== 6) {
      return res.status(400).json({ error: "Date must be a Saturday" });
    }
    
    // Check if already exists
    const existing = await WorkingSaturday.findOne({ date: workingDate });
    
    if (existing) {
      // Update existing record
      existing.isWorking = true;
      existing.notes = notes || existing.notes;
      existing.createdBy = req.user._id;
      await existing.save();
      
      return res.json({
        message: "Working Saturday updated successfully",
        workingSaturday: existing
      });
    }
    
    // Create new record
    const workingSaturday = new WorkingSaturday({
      date: workingDate,
      isWorking: true,
      createdBy: req.user._id,
      notes: notes || ""
    });
    
    await workingSaturday.save();
    await workingSaturday.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: "Working Saturday added successfully",
      workingSaturday
    });
  } catch (error) {
    console.error('Error adding working Saturday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a working Saturday (mark as non-working) (admin only)
router.delete("/:date", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date } = req.params;
    const workingDate = new Date(date);
    workingDate.setHours(0, 0, 0, 0);
    
    const workingSaturday = await WorkingSaturday.findOne({ date: workingDate });
    
    if (!workingSaturday) {
      return res.status(404).json({ error: "Working Saturday not found" });
    }
    
    await WorkingSaturday.deleteOne({ date: workingDate });
    
    res.json({
      message: "Working Saturday removed successfully"
    });
  } catch (error) {
    console.error('Error removing working Saturday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk add working Saturdays (admin only)
router.post("/bulk", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dates, notes } = req.body;
    
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: "Dates array is required" });
    }
    
    const results = [];
    const errors = [];
    
    for (const dateStr of dates) {
      try {
        const workingDate = new Date(dateStr);
        workingDate.setHours(0, 0, 0, 0);
        
        // Verify it's a Saturday
        if (workingDate.getDay() !== 6) {
          errors.push({ date: dateStr, error: "Date must be a Saturday" });
          continue;
        }
        
        // Check if already exists
        const existing = await WorkingSaturday.findOne({ date: workingDate });
        
        if (existing) {
          existing.isWorking = true;
          existing.notes = notes || existing.notes;
          existing.createdBy = req.user._id;
          await existing.save();
          results.push(existing);
        } else {
          const workingSaturday = new WorkingSaturday({
            date: workingDate,
            isWorking: true,
            createdBy: req.user._id,
            notes: notes || ""
          });
          await workingSaturday.save();
          results.push(workingSaturday);
        }
      } catch (error) {
        errors.push({ date: dateStr, error: error.message });
      }
    }
    
    res.json({
      message: `Processed ${results.length} working Saturdays`,
      added: results.length,
      errors: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Error bulk adding working Saturdays:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

