const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const promisify = require("es6-promisify");
const mail = require("../handlers/mail");

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
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: "Password Reset",
    resetURL,
    filename: "password-reset"
  });

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
