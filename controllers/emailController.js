const sgMail = require("@sendgrid/mail");

exports.newEvent = (req, res, next) => {
  sgMail.setApiKey(process.env.MAIL_PASS);

  let msg = {
    to: "bittledroid@gmail.com",
    from: "event@sciencenearme.com"
  };

  if (req.user) {
    msg.subject = "User Event Created";
    msg.html = `
    <p>${req.user.email} has just created the following event:</p>
    <p>Event name: ${req.body.name}</p>
    <p>Organisation: ${req.body.organisation}</p>
    <p>Start Date: ${req.body.start_datetime}</p>
    <p>End Date: ${req.body.end_datetime}</p>
    <p>Min Price: ${req.body.price_range.min_price}</p>
    <p>Max Price: ${req.body.price_range.max_price}</p>      
    <p>Website: ${req.body.website}</p>
    <p>Child Friendly: ${req.body.family_friendly}</p>
    <p>Donation: ${req.body.email}</p>
    <p>Free: ${req.body.is_free}</p>
    <p>Address: ${req.body.location.address}</p>
    <p>Image: <img src='http://localhost:5555/uploads/${req.body.image}'/></p>
    <p>Description: ${req.body.description}</p>
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
