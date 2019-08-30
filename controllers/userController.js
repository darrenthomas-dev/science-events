const mongoose = require("mongoose");
const User = mongoose.model("User");
const Events = mongoose.model("Event");
const promisify = require("es6-promisify");
const axios = require("axios");
const { getDatetime, stripInlineCss, displayDate } = require("../helpers");

exports.loginForm = (req, res) => {
  res.render("login", { title: "Login" });
};

exports.registerForm = (req, res) => {
  res.render("register", { title: "Register" });
};

exports.validateRegister = (req, res, next) => {
  req.checkBody("email", "That is not a valid email.").isEmail();
  req.sanitizeBody("email").normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req
    .checkBody("password", "Password must be at least 10 characters long!")
    .isLength({ min: 10 });
  req.checkBody("password", "Password cannot be blank!").notEmpty();
  req
    .checkBody(
      "password",
      "Invalid password. Password must be at least 10 characters long and contain an uppercase and lowercase character."
    )
    .matches(/^(?=.*[a-z])(?=.*[A-Z]).{10,}$/, "i");
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
    // name: req.body.name,
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

  // res.json(user);

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
  console.log();

  const events = await Events.find({ author: req.user.id });
  const count = events.length;

  // confirmOwner(event, req.user);
  console.log(req.user.id);

  res.render("events", { title: "My Events", events, count });
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
