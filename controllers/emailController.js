const sgMail = require("@sendgrid/mail");

exports.newEvent = (req, res, next) => {
  sgMail.setApiKey(process.env.MAIL_PASS);

  let msg = {
    to: "bittledroid@gmail.com",
    from: "test@example.com"
  };

  if (req.user) {
    msg.subject = "User Event Created";
    msg.text = `${req.user.email} has just created the event ${
      req.body.name
    }. \n -------------------- \nEvent details: ${JSON.stringify(req.body)}`;
  } else {
    msg.subject = "Guest Event Submission";
    msg.text = `A guest user has just submitted a new event. ${
      req.body.name
    }. \n -------------------- \nEvent details: ${JSON.stringify(req.body)}`;
  }

  sgMail.send(msg);

  next();
};
