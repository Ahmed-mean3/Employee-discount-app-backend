const mongoose = require("mongoose");
const StoreSessions = mongoose.Schema({
  apiKey: { type: mongoose.Schema.Types.Mixed, required: false },
  apiSecret: { type: mongoose.Schema.Types.Mixed, required: false },
  shopName: { type: String, required: false },
  addedAt: { type: Date, default: Date.now },
});
const StoreSchema = mongoose.model("StoreSessions", StoreSessions);
module.exports = StoreSchema;
