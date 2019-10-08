const mongoose = require("mongoose");
const User = mongoose.model("User");
const Events = mongoose.model("Event");
const promisify = require("es6-promisify");
const axios = require("axios");
const { getDatetime, stripInlineCss, displayDate } = require("../helpers");

exports.loginForm = (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("login", { title: "Login" });
};

exports.registerForm = (req, res) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("register", { title: "Register" });
};

exports.validateRegistration = async (req, res) => {
  const token = req.params.token;

  const user = await User.findOne({
    verificationToken: token,
    verificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error", "Verification has expired.");
    return res.redirect("/register");
  }

  // if user exists set isVerified to true and redirect to login page
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;

  await user.save();

  res.redirect("/login");
};

exports.validateRegister = (req, res, next) => {
  req.checkBody("email", "That is not a valid email.").isEmail();
  req.sanitizeBody("email").normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req
    .checkBody("password", "Password must be at least 12 characters long!")
    .isLength({ min: 12 });
  req.checkBody("password", "Password cannot be blank!").notEmpty();
  req
    .checkBody("password-confirm", "Confirmed password cannot be blank!")
    .notEmpty();
  req
    .checkBody("password-confirm", "Oops! Your passwords do not match.")
    .equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash("error", errors.map(err => err.msg));
    res.render("register", {
      title: "Register",
      body: req.body,
      flashes: req.flash()
    });
    return; // stop fn from running
  }
  next(); // if no errors
};

exports.register = async (req, res, next) => {
  const user = new User({
    email: req.body.email
  });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next();
};

exports.account = (req, res) => {
  res.render("account", { title: "Edit Your Account" });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    email: req.body.email,
    organisation: req.body.organisation,
    address: req.body.address
    // image: req.body.image
  };

  await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: "query" }
  );

  req.flash("success", "Your profile has been updated!");
  res.redirect("back");
};

exports.deleteAccount = async (req, res) => {
  // Delete user events
  await Events.deleteMany({ author: req.user.id });

  // TODO assign events to admin instead

  // then delete user
  await User.deleteOne({ _id: req.user.id });

  // alert message
  req.flash("success", "Your account has been deleted.");

  // redirect
  res.redirect("/");
};

exports.getUserEvents = async (req, res) => {
  const events = await Events.find({ author: req.user.id });
  const count = events.length;

  // confirmOwner(event, req.user);
  res.render("my-events", { title: "My Events", events, count });
};

exports.getUserEventbriteEvents = async (req, res) => {
  // Eventbrite organiser id
  const ebOrganizerId = req.user.eb_organiser_id;
  // Get tomorrows date
  const startDate = getDatetime(1);

  // Add start date equal to tomorrow
  const url = `https://www.eventbriteapi.com/v3/organizers/${ebOrganizerId}/events/?expand=organizer,venue&start_date.range_start=${startDate}&token=${process.env.EVENTBRITE_KEY}`;

  // Event GET request
  const response = await axios.get(url);
  // Add to an array
  const dataArr = [...response.data.events];
  // Extract chosen values to an array of objects
  const events = dataArr.map(e => ({
    name: e.name.text,
    summary: e.summary ? e.summary : "",
    description: e.description.html ? stripInlineCss(e.description.html) : "",
    organisation: e.organizer.name,
    start_datetime: new Date(e.start.utc),
    end_datetime: new Date(e.end.utc),
    is_free: e.is_free,
    location: {
      type: "Point",
      coordinates: [
        e.venue.longitude ? parseFloat(e.venue.longitude) : "",
        e.venue.latitude ? parseFloat(e.venue.latitude) : ""
      ],
      address:
        e.venue.address && e.venue.address.localized_address_display
          ? e.venue.address.localized_address_display
          : ""
    },
    website: e.url ? e.url : null,
    image: e.logo && e.logo.url ? e.logo.url : null,
    eb_id: e.id,
    display_date: displayDate(new Date(e.start.utc), new Date(e.end.utc))
  }));

  const count = events.length;

  res.render("events", { title: "Eventbrite Events", events, count });
};

exports.deleteEventbriteLink = async (req, res) => {
  await User.findOneAndUpdate(
    { _id: req.user._id },
    { $unset: { eb_organiser_id: 1 } }
  );

  req.flash("success", "Your Eventbrite account has been removed.");
  res.redirect("back");
};
