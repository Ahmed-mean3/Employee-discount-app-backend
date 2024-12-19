const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  discountValue: {
    type: String,
    required: true,
  },
  discountType: {
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
  employeeAssociation: {
    type: String,
    default: null,
  },
});

module.exports = mongoose.model("employees_global", employeeSchema);
