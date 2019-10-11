const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");
const sgMail = require("@sendgrid/mail");

exports.login = passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: "Invalid username or password."
});

exports.logout = (req, res) => {
  req.logout();
  res.redirect("/");
};

exports.loginUser = async (req, next) => {
  await req.login(user);
  req.title = "You are logged now in.";
  next();
  return;
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  req.flash("error", "Oops you must be logged in to do that!");
  res.redirect("/login");
};

exports.getPasswordReset = (req, res) => {
  res.render("forgot");
};

exports.forgot = async (req, res) => {
  const message =
    "If a matching account was found then a password reset has been emailed to you.";

  // 1. See if user exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    req.flash("success", message);
    return res.redirect("/login");
  }

  // 2. Set reset token and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();

  // 3. Send token to email
  const resetUrl = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;

  sgMail.setApiKey(process.env.MAIL_PASS);

  const html = `<div style="max-width: 640px; margin: 10px auto; padding: 24px; background-color: #eeeeee; border-radius: 4px;">
  <h1 style="font-size: 24px;">Science Near Me - Password Reset</h1>
  <p style="font-size: 16px;">You recently requested to reset your password for sciencenearme.com. Click the button below to reset it.</p>
  <p style="font-size: 16px; text-align: center;"><a style="background-color: #ffff;border-style: solid;border-color: #373256;border-radius: 4px;border-width: 2px;color: #373256;display: inline-block;font-family: arial,helvetica,sans-serif;font-size: 16px;font-weight: normal;letter-spacing: 0px;line-height: 16px;padding: 12px 18px 12px 18px;text-align: center;text-decoration: none;" href="${resetUrl}">Reset your password</a></p>
  <p style="font-size: 16px;">If you did not request a password reset, please ignore the email or reply to let us know. This password reset is only valid for 1 hour.</p>
  <p style="font-size: 16px;">Thanks,</p>
  <p style="font-size: 16px;"><a href="https://sciencenearme.com">sciencenearme.com</a></p>
  <p style="font-size: 14px;">If you are having trouble clicking the password reset button, copy and paste the URL below into your web browser.</p>
  <p style="font-size: 14px;"><a href="${resetUrl}">${resetUrl}</a></p>`;

  const text = `
You recently requested to reset your password for sciencenearme.com.

Click or copy and paste the URL below into your web browser ${resetUrl}. This password reset is only valid for 1 hour.

If you did not request a password reset, please ignore the email or reply to let us know.

Thanks,

https://sciencenearme.com`;

  const msg = {
    to: user,
    from: "reset@sciencenearme.com",
    subject: "[Science Near Me] Password Reset",
    html,
    text
  };

  await sgMail.send(msg);

  req.flash("success", message);

  // 4. Redirect to login page
  res.redirect("/login");
};

exports.passwordReset = (req, res) => {
  res.render("reset", { title: "Password Reset" });
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error", "Password reset is invalid or has expired.");
    return res.redirect("/login");
  }
  // if user show rest password form
  res.render("reset", { title: "Reset your Password" });
};

// TODO make password more secure
exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body["password-confirm"]) {
    next();
    return;
  }
  req.flash("error", "Passwords do not match!");
  res.redirect("back");
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    req.flash("error", "Password reset is invalid or has expired.");
    return res.redirect("/login");
  }

  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  const updateUser = await user.save();
  await req.login(updateUser);
  req.flash("success", "Your password has been reset! You are now logged in.");
  res.redirect("/");
};

exports.requestEventbriteLink = async (req, res) => {
  const message =
    "Your request has been submitted! If successful your account should be linked within 48hrs.";

  const text = `${req.user.email} (${req.user._id}) has requested their account to be linked to Eventbrite. eb_organiser_id: ${req.body.eb_organiser_id}.`;

  sgMail.setApiKey(process.env.MAIL_PASS);

  const msg = {
    to: "bittledroid@gmail.com",
    from: "request@sciencenearme.com",
    subject: "[Science Near Me] Request for Eventbrite account link",
    text
  };
  await sgMail.send(msg);

  req.flash("success", message);

  res.redirect("back");
};

exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.admin) {
    next();
  } else {
    res.redirect("/");
  }
};
