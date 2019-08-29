/*
  This is a file of data and helper functions that we can expose and use in our templating function
*/

const moment = require("moment");
const slug = require("slugs");
const mongoose = require("mongoose");
const Event = mongoose.model("Event");

// FS is a built in module to node that let's us read files from the system we're running on
const fs = require("fs");

// moment.js is a handy library for displaying dates. We need this in our templates to display things like "Posted 5 minutes ago"
exports.moment = require("moment");

// Dump is a handy debugging function we can use to sort of "console.log" our data
exports.dump = obj => JSON.stringify(obj, null, 2);

// Making a static map is really long - this is a handy helper function to make one
exports.staticMap = ([lng, lat]) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=800x150&key=${process.env.MAP_KEY}&markers=${lat},${lng}&scale=2`;

// inserting an SVG
exports.icon = name => fs.readFileSync(`./public/images/icons/${name}.svg`);

// Some details about the site
exports.siteName = `Science Near Me`;

exports.menu = [
  { slug: "/", title: "Search events" },
  { slug: "/map", title: "Map" },
  // { slug: "/about", title: "About", icon: "about" }
  { slug: "/add", title: "Create events" }
];

exports.userMenu = [
  { slug: "/my-events", title: "My events", icon: "compose" }
];

exports.adminMenu = [{ slug: "/admin", title: "Pending", icon: "shield" }];

// Returns datetime x amount of days from now.
exports.getDatetime = x => {
  let date = new Date();
  if (x !== undefined) {
    date.setDate(date.getDate() + x); // sets future date
  }
  date = date.toISOString().split(".")[0] + "Z"; // remove milliseconds
  return date;
};

exports.displayDate = (start, end) => {
  // For date with only start date or same start and end
  if (
    !end ||
    moment(start).format("DD MM YY") === moment(end).format("DD MM YY")
  ) {
    return moment(start).format("Do MMMM");
  }

  // For dates with different start and end dates in same month
  if (moment(start).format("MMM") === moment(end).format("MMM")) {
    const s = moment(start).format("Do");
    const e = moment(end).format("Do MMMM");
    return `${s} - ${e}`;
  }

  // For dates with different start and end month
  if (moment(start).format("MMM") !== moment(end).format("MMM")) {
    const s = moment(start).format("Do MMMM");
    const e = moment(end).format("Do MMMM");
    return `${s} - ${e}`;
  }
};

// Clean up EventBrite description
exports.stripInlineCss = html => {
  html = html.replace(/(CLASS|STYLE)=".*?"/g, "");
  html = html.replace(/\r\n/g, "");
  html = html.replace(/\n/g, "");
  html = html.replace(/\<BR\s?\/?\>/g, "");
  html = html.replace(/(\<P\>\s?\<\/P\>)/g, "");

  return html;
};

// Returns datetime x amount of days from now.
exports.getDatetime = x => {
  let date = new Date();
  if (x !== undefined) {
    date.setDate(date.getDate() + x); // sets future date
  }
  date = date.toISOString().split(".")[0] + "Z"; // remove milliseconds
  return date;
};

exports.createSlug = async name => {
  let permalink = slug(name);

  // Check for events with same slug and set as numerical
  const slugRegEx = new RegExp(`^(${permalink})((-[0-9]*$)?)$`, "i");

  const eventsWithSlug = await Event.find({ slug: slugRegEx });

  if (eventsWithSlug.length) {
    permalink = `${permalink}-${eventsWithSlug.length + 1}`;
  }

  return permalink;
};

// Start constructing query
exports.constructQuery = (miles, coordinates) => {
  const start = new Date().toISOString().slice(0, 10);

  let query = {
    display: true,
    end_datetime: { $gte: new Date(`${start}T00:00:00Z`) } // Must not be in the past
  };
  // Add distance search to query
  query = addLocationToQuery(miles, coordinates, query);

  return query;
};

//  Location query
function addLocationToQuery(miles, coordinates, query) {
  if (!miles || !coordinates) return;
  let distance;

  switch (miles) {
    case "10":
      distance = 16093;
      break;
    case "20":
      distance = 32186;
      break;
    case "30":
      distance = 48280;
      break;
    case "40":
      distance = 64373;
      break;
    default:
      distance = 0;
  }

  query.location = {
    $near: {
      $geometry: {
        type: "Point",
        coordinates
      },
      $maxDistance: distance
    }
  };

  return query;
}

// Convert Eventbrite JSON response to useable event
exports.convertEventbriteDataToEvent = data => {
  const event = {
    name: data.name.text,
    summary: data.summary ? data.summary : "",
    description: data.description.html
      ? this.stripInlineCss(data.description.html)
      : "",
    organisation: data.organizer.name,
    start_datetime: new Date(data.start.utc),
    end_datetime: new Date(data.end.utc),
    is_free: data.is_free,
    location: {
      type: "Point",
      coordinates: [
        data.venue.longitude ? parseFloat(data.venue.longitude) : "",
        data.venue.latitude ? parseFloat(data.venue.latitude) : ""
      ],
      address:
        data.venue.address && data.venue.address.localized_address_display
          ? data.venue.address.localized_address_display
          : ""
    },
    website: data.url ? data.url : null,
    image: data.logo && data.logo.url ? data.logo.url : null,
    poster:
      data.logo && data.logo.original && data.logo.original.url
        ? data.logo.original.url
        : null,
    display_date: this.displayDate(
      new Date(data.start.utc),
      new Date(data.end.utc)
    ),
    eb_id: data.id,
    eb_organiser_id: data.organizer_id,
    eb_organisation_id: data.organization_id
  };

  return event;
};

exports.addEventbriteTicketPricesToEvent = (tickets, event) => {
  let prices = [];
  let donation = false;

  if (tickets.length > 0) {
    for (let item of tickets) {
      if (item.cost) {
        prices.push(item.cost.major_value);
      }
      if (item.donation) {
        donation = true;
      }
    }

    prices = prices.map(Number); // convert to numbers

    event["price_range"] = {
      min_price: Math.min(...prices),
      max_price: Math.max(...prices)
    };
    event["donation"] = donation;
  } else {
    event["donation"] = donation;
    console.log("no price details, adding donation details.");
  }

  // // Add to database if not already
  // try {
  //   await new Event(event).save();
  // } catch (err) {
  //   console.log("unable to add event, probably already exsits");
  // }

  return event;
};
