const sgMail = require("@sendgrid/mail");

exports.newEvent = (req, res, next) => {
  sgMail.setApiKey(process.env.MAIL_PASS);

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
