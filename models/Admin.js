const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const adminSchema = new Schema({
  hide_these_organisers: {
    type: Array,
    unique: true,
    trim: true
  }
});

module.exports = mongoose.model("AdminSettings", adminSchema);
