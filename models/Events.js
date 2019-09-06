const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter an event name."
  },
  summary: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  organisation: {
    type: String,
    trim: true,
    required: "Please enter an organisation."
  },
  start_datetime: {
    type: Date,
    required: "Please enter a start date."
  },
  end_datetime: Date,
  display_date: String,
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [{ type: Number }],
    address: {
      type: String,
      trim: true,
      required: "Please enter an address."
    }
  },
  tags: [String],
  price: Number,
  price_range: {
    min_price: {
      type: Number,
      default: null
    },
    max_price: {
      type: Number,
      default: null
    }
  },
  is_free: {
    type: Boolean,
    default: false
  },
  donation: {
    type: Boolean,
    default: false
  },
  website: {
    type: String,
    trim: true
  },
  image: String,
  poster: String,
  display: {
    type: String
  },
  slug: String,
  eb_id: String,
  eb_organisation_id: String,
  eb_organiser_id: String,
  created: {
    type: Date,
    default: Date.now
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  }
});

// Define our indexes
eventSchema.index(
  { name: "text", organisation: "text" },
  { default_language: "none" }
);

eventSchema.index({ location: "2dsphere" });
eventSchema.index(
  { eb_id: 1 },
  {
    unique: true,
    name: "eventbrite_id",
    partialFilterExpression: { eb_id: { $exists: true } }
  }
);

eventSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next();
    return;
  }

  if (!this.description) {
    next();
    return;
  }

  this.slug = slug(this.name);
  // Check for events with same slug and set as numerical
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, "i");

  const eventsWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (eventsWithSlug.length) {
    this.slug = `${this.slug}-${eventsWithSlug.length + 1}`;
  }

  next();
});

eventSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model("Event", eventSchema);
