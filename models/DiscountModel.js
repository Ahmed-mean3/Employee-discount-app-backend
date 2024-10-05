const mongoose = require("mongoose");

const DiscountModel = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  fees: {
    type: Number,
    require: true,
  },
  shortName: {
    type: String,
    required: true,
  },
});

const DiscountSchema = mongoose.model("Discount", DiscountModel);

module.exports = DiscountSchema;
