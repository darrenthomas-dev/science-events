const mongoose = require("mongoose");
const User = mongoose.model("User");
const crypto = require("crypto");

const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.MAIL_PASS);

exports.accountVerification = async (req, res, next) => {
  // sgMail.setApiKey(process.env.MAIL_PASS);

  const message = "An account verification link has been emailed to you.";

  // 1. See if user exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    req.flash("success", message);
    return res.redirect("/login");
  }

  // 2. Set reset token and expiry on their account
  user.verificationToken = crypto.randomBytes(20).toString("hex");
  user.verificationExpires = Date.now() + 3600000; // 1 hour from now
  await user.save();

  // 3. Send token to email
  const verifyUrl = `http://${req.headers.host}/account/confirm/${user.verificationToken}`;

  const html = `
<p>Thanks for registering for an account on Science Near Me! Before you start posting lots of exciting events, we just need to confirm that this is you. Click the button below to verify your email address:</p>
<p><a style="background-color: #373256;border: 1px solid #333333;border-color: #373256;border-radius: 6px;border-width: 1px;color: #f3f1ff;display: inline-block;font-family: arial,helvetica,sans-serif;font-size: 16px;font-weight: normal;letter-spacing: 0px;line-height: 16px;padding: 12px 18px 12px 18px;text-align: center;text-decoration: none;" href="${verifyUrl}">Verify Email</a></p>
<p>If you did not register for an account, you can ignore this email or reply to let us know. This verfication link is only valid for 1 hour.</p>
<p>Thanks,</p>
<p>Science Near Me</p>
<p>If you are having trouble clicking the verify email button, copy and paste the URL below into your web browser.</p>
<p><a href="${verifyUrl}">${verifyUrl}</a></p>`;

  const text = `
  Thanks for registering for an account on Science Near Me! Before you start posting lots of exciting events, we just need to confirm that this is you. Click or copy and paste the following URL into your web browser ${verifyUrl}. This verification link is only valid for 1 hour.
  
  If you did not request a password reset, please ignore the email or reply to let us know.
  
  Thanks,
  
  Science Near Me`;

  const msg = {
    to: user,
    from: "support@sciencenearme.com",
    subject: "Account Registration",
    html,
    text
  };

  await sgMail.send(msg);

  req.flash("success", message);

  res.redirect("/login");
};

exports.newEvent = (req, res, next) => {
  // sgMail.setApiKey(process.env.MAIL_PASS);

  const email = `<p>${req.user.email} has just created the following event:</p>`;
  const image = req.body.image
    ? `<p><img src='http://192.168.1.9:5555/uploads/${req.body.image}'/></p>`
    : "";
  const title = `<h1>${req.body.name}</h1>`;
  const organisation = `<p>Organisation: ${req.body.organisation}</p>`;
  const date = req.body.end_datetime
    ? `<p>Date: ${req.body.start_datetime} - ${req.body.end_datetime}</p>`
    : `<p>Date: ${req.body.start_datetime}</p>`;
  const price = req.body.price_range
    ? req.body.price_range.max_price
      ? `<p>Price: £${req.body.price_range.min_price} - £${req.body.price_range.min_price}</p>`
      : `<p>Price: £${req.body.price_range.min_price}</p>`
    : "";
  const website = req.body.website ? `<p>${req.body.website}</p>` : "";
  const childFriendly = req.body.family_friendly
    ? `<p>Suitable for children.</p>`
    : "";
  const donation = req.body.donation ? `<p>Donation welcome.</p>` : "";
  const free = req.body.is_free ? `<p>Free!</p>` : "";
  const address = `<p>Address: ${req.body.location.address}</p>`;
  const description = `<p>${req.body.description}</p>`;

  let msg = {
    to: "bittledroid@gmail.com",
    from: "event@sciencenearme.com"
  };

  if (req.user) {
    msg.subject = "User Event Created";
    msg.html = `
    ${email}
    <div style="margin: 0 auto; max-width: 800px; border: 1px solid #ccc;">
      ${image}
      <div style="padding: 0 24px;">
        ${title}
        ${organisation}
        ${date}
        ${price}   
        ${website}
        ${childFriendly}
        ${free}
        ${donation}
        ${address}
        ${description}
      </div>
    </div>
      `;
  } else {
    msg.subject = "Guest Event Submission";
    msg.text = `A guest user has just submitted a new event. ${
      req.body.name
    }. \n -------------------- \nEvent details: ${JSON.stringify(req.body)}`;
  }

  sgMail.send(msg);

  next();
};
