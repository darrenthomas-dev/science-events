const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");
// const mail = require("../handlers/mail");
const sgMail = require("@sendgrid/mail");

exports.login = passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: "Incorrect username or password."
});

exports.logout = (req, res) => {
  req.logout();
  res.redirect("/");
};

exports.login2 = function(req, res, next) {
  passport.authenticate("local", function(err, user, info) {
    console.log(user);
    if (!user) {
      console.log("Failed!");
    } else {
      req.login(user, function(err) {
        if (err) {
          console.log(err);
          return;
        }
        next();
        return;
      });
    }
  })(req, res, next);
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

  const html = `
<p>You recently requested to reset your password for sciencenearme.com. Click the button below to reset it.</p>
<p><a style="background-color: #373256;border: 1px solid #333333;border-color: #373256;border-radius: 6px;border-width: 1px;color: #f3f1ff;display: inline-block;font-family: arial,helvetica,sans-serif;font-size: 16px;font-weight: normal;letter-spacing: 0px;line-height: 16px;padding: 12px 18px 12px 18px;text-align: center;text-decoration: none;" href="${resetUrl}">Reset your password</a></p>
<p>If you did not request a password reset, please ignore the email or reply to let us know. This password reset is only valid for 1 hour.</p>
<p>Thanks,</p>
<p>Science Near Me</p>
<p>If you are having trouble clicking the password reset button, copy and paste the URL below into your web browser.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>`;

  const text = `
You recently requested to reset your password for sciencenearme.com.

Click or copy and paste the URL below into your web browser ${resetUrl}. This password reset is only valid for 1 hour.

If you did not request a password reset, please ignore the email or reply to let us know.

Thanks,

Science Near Me`;

  const msg = {
    to: user,
    from: "support@sciencenearme.com",
    subject: "Password Reset",
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
    from: "test@example.com",
    subject: "Request for Eventbrite account link",
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
