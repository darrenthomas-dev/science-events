const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");
const findLatLong = require("find-lat-lng");
const { displayDate } = require("../helpers");
const { stripInlineCss } = require("../helpers");
const axios = require("axios");

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype isn't allowed!" }, false);
    }
  }
};

exports.homepage = (req, res) => {
  res.render("index");
};

exports.addEvent = (req, res) => {
  res.render("editEvent", {
    title: "Add Event"
  });
};

exports.upload = multer(multerOptions).single("image");

exports.resize = async (req, res, next) => {
  // Check if there is no new file to resize
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split("/")[1];
  req.body.image = `${uuid.v4()}.${extension}`;
  //  resize
  const image = await jimp.read(req.file.buffer);
  await image.resize(800, jimp.AUTO);
  await image.write(`./public/uploads/${req.body.image}`);
  next();
};

exports.createEvent = async (req, res) => {
  req.body.display_date = displayDate(
    req.body.start_datetime,
    req.body.end_datetime
  );

  const latLng = await getLatLng(req.body.location.address);
  req.body.location.coordinates = [latLng[1], latLng[0]];

  req.body.author = req.user._id;
  const event = await new Event(req.body).save();
  req.flash("success", `Event "${event.name}" has been successfully created.`);
  res.redirect("back");
};

exports.getEvents = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 12;
  const skip = page * limit - limit;
  const free = req.body.free || undefined;
  const familyFriendly = req.body.family_friendly || undefined;
  const donation = req.body.donation || undefined;
  const start = req.body.start_datetime || undefined;
  const end = req.body.end_datetime || undefined;
  const minPrice = req.body.min_price || undefined;
  const maxPrice = req.body.max_price || undefined;
  const location = req.body.geolocate || undefined;
  const lat = req.body.lat || undefined;
  const lng = req.body.lng || undefined;
  const miles = req.body.distance || undefined;
  const organisation = req.body.search_organisation || undefined;
  console.log(organisation);

  const tags = [];

  let query = {
    display: true
  };

  if (familyFriendly) {
    tags.push("Family Friendly");
  }
  if (donation) {
    tags.push("Donation");
  }
  if (tags.length) {
    query.tags = { $all: tags };
  }
  if (free) {
    query.is_free = true;
  }
  if (start) {
    query.start_datetime = {
      $gte: new Date(`${start}T00:00:00Z`)
    };
  }
  if (end) {
    query.end_datetime = { $lte: new Date(`${end}T23:59:59Z`) };
  } else {
    const start = new Date().toISOString().slice(0, 10);
    query.end_datetime = { $gte: new Date(`${start}T00:00:00Z`) };
  }
  if (organisation) {
    console.log(organisation);
    query.organisation = organisation;
  }

  if (minPrice && minPrice > 0) {
    query["price_range.min_price"] = { $gte: minPrice };
  }

  if (maxPrice) {
    query["$or"] = [
      { "price_range.min_price": { $lte: maxPrice } },
      { is_free: true }
    ];
  }
  if (lat && lng) {
    const coordinates = [lng, lat];

    let distance = false;

    if (miles) {
      if (miles === "10") distance = 16093;
      if (miles === "20") distance = 32186;
      if (miles === "30") distance = 48280;
      if (miles === "40") distance = 64373;
    }

    distance
      ? (query["location"] = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates
            },
            $maxDistance: distance
          }
        })
      : (query["location"] = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates
            }
          }
        });
  }

  console.log(query);

  // 1. Query database for all events
  const eventsPromise = Event.find(query)
    .skip(skip)
    .limit(limit)
    .populate("author", "admin")
    .sort("start_datetime");

  const countPromise = Event.find(query).count();
  const [events, count] = await Promise.all([eventsPromise, countPromise]);
  const pages = Math.ceil(count / limit);

  if (!events.length && skip) {
    req.flash(
      "info",
      `Page ${page} does not exist. You have been redirected to page ${pages} which is the last page.`
    );
    res.redirect(`/events/page/${pages}`);
    return;
  }

  res.render("map", {
    title: "Events",
    parentSlug: "events",
    events,
    page,
    pages,
    count,
    free,
    familyFriendly,
    donation,
    start,
    end,
    minPrice,
    maxPrice,
    location,
    lat,
    lng,
    miles
  });
};

const confirmOwner = (event, user) => {
  if (!user.admin && !event.author.equals(user._id)) {
    throw Error("You must own the event in order to edit it!");
  }
};

exports.editEvent = async (req, res) => {
  // 1. Find the event given the id
  const event = await Event.findOne({ _id: req.params.id });
  // 2. Confirm they are the owner of the event
  confirmOwner(event, req.user);
  // 3. Render the edit form and allow user to update event
  res.render("editEvent", { title: `Edit ${event.name}`, event });
  // res.json(event);
};

const getLatLng = async address => {
  const findLatLng = findLatLong(process.env.MAP_KEY);
  const latLng = await findLatLng([address], { debug: false });
  const coords = [latLng[0].lat, latLng[0].lng];
  return coords;
};

exports.updateEvent = async (req, res) => {
  // Add display date
  req.body.display_date = displayDate(
    req.body.start_datetime,
    req.body.end_datetime
  );

  // If there are no tags add set to null
  if (!req.body.tags) req.body.tags = [];

  // If free is not checked set to null
  if (!req.body.is_free) req.body.is_free = false;

  // Get coordinates
  const latLng = await getLatLng(req.body.location.address);

  // add to request body
  req.body.location.type = "Point";
  req.body.location.coordinates = [latLng[1], latLng[0]];

  // find and update the event
  const event = await Event.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new event
    runValidators: true
  }).exec();
  // redirect to event and tell them it worked
  req.flash(
    "success",
    `Successfully updated <strong>${event.name}</strong>. <a href="/events/${
      event.slug
    }">View event</a>`
  );
  res.redirect(`/events/${event._id}/edit`);
};

exports.deleteEvent = async (req, res) => {
  // delete event from database
  await Event.deleteOne({ _id: req.params.id });

  // alert message
  req.flash("success", "Your event has been deleted.");

  // redirect
  res.redirect("/add");
};

exports.searchEvents = async (req, res) => {
  const events = await Event
    // first find events that match
    .find(
      {
        display: "true",
        $text: {
          $search: req.query.q
        }
      },
      {
        score: { $meta: "textScore" }
      }
      // then sort them
    )
    .select("name slug")
    .sort({
      score: { $meta: "textScore" }
    })
    // limit to top 10 results
    .limit(10);
  res.json(events);
};

exports.searchOrganistaions = async (req, res) => {
  const events = await Event
    // first find events that match
    .find(
      {
        display: "true",
        $text: {
          $search: req.query.q
        }
      },
      {
        score: { $meta: "textScore" }
      }
      // then sort them
    )
    .select("organisation")
    .sort({
      score: { $meta: "textScore" }
    });
  // limit to top 10 results
  // .limit(10);
  res.json(events);
};

exports.mapEvents = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 12;
  const skip = page * limit - limit;
  const free = req.body.free;
  // const familyFriendly = req.body.family_friendly;
  const start = req.body.start_datetime || undefined;
  const end = req.body.end_datetime || undefined;
  const defaultStartDate = new Date().toISOString().slice(0, 10);
  const organisation = req.body.search_organisation || undefined;
  const coordinates = [req.query.lng, req.query.lat];

  let query = {
    display: true
  };

  if (free) {
    query.is_free = true;
  }
  if (start) {
    query.start_datetime = {
      $gte: new Date(`${start}T00:00:00Z`)
    };
  }
  if (end) {
    query.end_datetime = { $lte: new Date(`${end}T23:59:59Z`) };
  } else {
    query.end_datetime = { $gte: new Date(`${defaultStartDate}T00:00:00Z`) };
  }
  if (organisation) {
    console.log(organisation);
    query.organisation = organisation;
  }

  const miles = req.query.miles;

  let distance = false;

  if (miles === "10") distance = 16093;
  if (miles === "20") distance = 32186;
  if (miles === "30") distance = 48280;
  if (miles === "40") distance = 64373;

  if (!coordinates[0] === null && !coordinates[1] === null) {
    distance
      ? (query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates
            },
            $maxDistance: distance
          }
        })
      : (query.location = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates
            }
          }
        });
  }

  console.log(query);

  const events = await Event.find(query)
    .select(
      "name organisation location.address location.coordinates image slug display_date is_free price price_range"
    )
    .limit(50)
    .sort("start_datetime");

  res.json(events);
};

exports.getEventBySlug = async (req, res, next) => {
  const event = await Event.findOne({ slug: req.params.slug });
  if (!event) return next();
  res.render("event", { event, title: event.name });
};

exports.mapPage = (req, res) => {
  res.render("map", { title: "Map" });
};

exports.addEventBriteEvents = async (req, res) => {
  req.body.author = req.user._id;
  req.body.description = stripInlineCss(req.body.description);
  // req.body.location.type = "Point";

  const event = await new Event(req.body).save();
  req.flash("success", `Event "${event.name}" has been successfully created.`);
  res.redirect("back");
};
