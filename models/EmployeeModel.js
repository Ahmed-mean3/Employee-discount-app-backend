const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  grade: {
    type: String,
    required: true,
  },
  userCapTotal: {
    type: Number,
    require: true,
  },
  userCapRemain: {
    type: Number,
    require: true,
  },
  allocatedMonth: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("employees", employeeSchema);
