/*
  This is a file of data and helper functions that we can expose and use in our templating function
*/

const moment = require("moment");

// FS is a built in module to node that let's us read files from the system we're running on
const fs = require("fs");

// moment.js is a handy library for displaying dates. We need this in our templates to display things like "Posted 5 minutes ago"
exports.moment = require("moment");

// Dump is a handy debugging function we can use to sort of "console.log" our data
exports.dump = obj => JSON.stringify(obj, null, 2);

// Making a static map is really long - this is a handy helper function to make one
exports.staticMap = ([lng, lat]) =>
  `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=800x150&key=${
    process.env.MAP_KEY
  }&markers=${lat},${lng}&scale=2`;

// inserting an SVG
exports.icon = name => fs.readFileSync(`./public/images/icons/${name}.svg`);

// Some details about the site
exports.siteName = `Science Near Me`;

exports.menu = [
  { slug: "/", title: "Events", icon: "calendar" },
  // { slug: "/map", title: "Map", icon: "globe" }
  // { slug: "/about", title: "About", icon: "about" }
  { slug: "/add", title: "Add", icon: "add-outline" }
];

exports.userMenu = [
  { slug: "/my-events", title: "My Events", icon: "compose" }
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
