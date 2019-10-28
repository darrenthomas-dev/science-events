const mongoose = require("mongoose");
const User = mongoose.model("User");
const Event = mongoose.model("Event");
const crypto = require("crypto");

const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.MAIL_PASS);

exports.newUser = async () => {
  const start = new Date().toISOString().slice(0, 10);
  const usersPromise = User.find().count();
  const eventsPromise = Event.find({
    display: "true",
    end_datetime: { $gte: new Date(`${start}T00:00:00Z`) }
  }).count();

  const [users, events] = await Promise.all([usersPromise, eventsPromise]);

  const html = `<div style="max-width: 640px; margin: 10px auto; padding: 24px; background-color: #eeeeee; border-radius: 4px;">
<h1>Science Near Me - New User</h1>
<p style="font-size: 16px;">Yay we have a new registered user!</p>
<p style="font-size: 16px;">Here are the stats:</p>
<ul style="font-size: 16px;">
  <li style="font-size: 16px;">${users} registered users</li>
  <li style="font-size: 16px;">${events} events</li>
</ul>

</div>`;

  const msg = {
    to: "bittledroid@gmail.com",
    from: "newuser@sciencenearme.com",
    subject: "[Science Near Me] New Registered User!",
    html
  };

  sgMail.send(msg);
};

exports.accountVerification = async (req, res) => {
  const message = "An account verification link has been emailed to you.";
  const email = req.body.email || req.user.email;

  // 1. See if user exists
  const user = await User.findOne({ email });

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

  const text = `Please click the link below to validate your new account at sciencenearme.com. If you did not create an account, please ignore this email and nothing will happen. This verification link is only valid for 1 hour.
  
  ${verifyUrl}`;

  const msg = {
    to: user,
    from: "register@sciencenearme.com",
    subject: "[Science Near Me] Validate your new account",
    text
  };

  await sgMail.send(msg);

  req.flash("success", message);

  res.redirect("/login");
};

exports.newEvent = (req, res, next) => {
  const image = req.body.image
    ? `<p><img src='https://sciencenearme.com/uploads/${req.body.image}'/></p>`
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
    msg.subject = "[Science Near Me] User Event Created";
    msg.html = `
   <p>${req.user.email} has just created the following event:</p>
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
    msg.subject = "[Science Near Me] Guest Event Submission";
    msg.text = `A guest user has just submitted a new event. ${
      req.body.name
    }. \n -------------------- \nEvent details: ${JSON.stringify(req.body)}`;
  }

  sgMail.send(msg);

  next();
};
