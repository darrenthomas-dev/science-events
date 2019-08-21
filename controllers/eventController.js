const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");
const findLatLong = require("find-lat-lng");
const { displayDate, stripInlineCss, createSlug } = require("../helpers");
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
  // Add human readable display date to body
  req.body.display_date = displayDate(
    req.body.start_datetime,
    req.body.end_datetime
  );

  // Add latlng coordinates to body
  const latLng = await getLatLng(req.body.location.address);
  req.body.location.coordinates = [latLng[1], latLng[0]];

  // Add author id to body
  req.body.author = req.user._id;

  // res.json(req.body);

  // Add body data to database
  const event = await new Event(req.body).save();
  req.flash(
    "success",
    `Event <a href="/event/${event.slug}">${
      event.name
    }</a> has been successfully created.`
  );
  res.redirect("back");
};

// exports.getEvents = async (req, res) => {
//   const page = req.params.page || 1;
//   const limit = 12;
//   const skip = page * limit - limit;

//   const free = req.body.free || undefined;
//   const familyFriendly = req.body.family_friendly || undefined;
//   const donation = req.body.donation || undefined;
//   const start = req.body.start_datetime || undefined;
//   const end = req.body.end_datetime || undefined;
//   const minPrice = req.body.min_price || undefined;
//   const maxPrice = req.body.max_price || undefined;
//   const location = req.body.geolocate || undefined;
//   const lat = req.body.lat || undefined;
//   const lng = req.body.lng || undefined;
//   const miles = req.body.distance || undefined;
//   const organisation = req.body.search_organisation || undefined;
//   console.log(organisation);

//   const tags = [];

//   let query = {
//     display: true
//   };

//   if (familyFriendly) {
//     tags.push("Family Friendly");
//   }
//   if (donation) {
//     tags.push("Donation");
//   }
//   if (tags.length) {
//     query.tags = { $all: tags };
//   }
//   if (free) {
//     query.is_free = true;
//   }
//   if (start) {
//     query.start_datetime = {
//       $gte: new Date(`${start}T00:00:00Z`)
//     };
//   }
//   if (end) {
//     query.end_datetime = { $lte: new Date(`${end}T23:59:59Z`) };
//   } else {
//     const start = new Date().toISOString().slice(0, 10);
//     query.end_datetime = { $gte: new Date(`${start}T00:00:00Z`) };
//   }
//   if (organisation) {
//     console.log(organisation);
//     query.organisation = organisation;
//   }

//   if (minPrice && minPrice > 0) {
//     query["price_range.min_price"] = { $gte: minPrice };
//   }

//   if (maxPrice) {
//     query["$or"] = [
//       { "price_range.min_price": { $lte: maxPrice } },
//       { is_free: true }
//     ];
//   }
//   if (lat && lng) {
//     const coordinates = [lng, lat];

//     let distance = false;

//     if (miles) {
//       if (miles === "10") distance = 16093;
//       if (miles === "20") distance = 32186;
//       if (miles === "30") distance = 48280;
//       if (miles === "40") distance = 64373;
//     }

//     distance
//       ? (query["location"] = {
//           $near: {
//             $geometry: {
//               type: "Point",
//               coordinates
//             },
//             $maxDistance: distance
//           }
//         })
//       : (query["location"] = {
//           $near: {
//             $geometry: {
//               type: "Point",
//               coordinates
//             }
//           }
//         });
//   }

//   console.log(query);

//   // 1. Query database for all events
//   const eventsPromise = Event.find(query)
//     .skip(skip)
//     .limit(limit)
//     .populate("author", "admin")
//     .sort("start_datetime");

//   const countPromise = Event.find(query).count();
//   const [events, count] = await Promise.all([eventsPromise, countPromise]);
//   const pages = Math.ceil(count / limit);

//   if (!events.length && skip) {
//     req.flash(
//       "info",
//       `Page ${page} does not exist. You have been redirected to page ${pages} which is the last page.`
//     );
//     res.redirect(`/events/page/${pages}`);
//     return;
//   }

//   res.render("events", {
//     title: "Events",
//     parentSlug: "events",
//     events,
//     page,
//     pages,
//     count,
//     free,
//     familyFriendly,
//     donation,
//     start,
//     end,
//     minPrice,
//     maxPrice,
//     location,
//     lat,
//     lng,
//     miles
//   });
// };

const confirmOwner = (event, user) => {
  let test = false;
  if (event.author && event.author.equals(user._id)) {
    test = true;
    console.log("You are the author!");
  }

  if (event.eb_organiser_id === user.eb_organiser_id) {
    test = true;
    console.log("You are the oganiser!");
  }

  if (user.admin) {
    test = true;
    console.log("You are an admin!");
  }

  if (!test) {
    throw Error("You must own the event in order to edit it!");
  }
};

exports.getEventByEventbriteId = async (req, res) => {
  const event = await Event.findOne({ eb_id: req.body.eb_event_id });
  confirmOwner(event, req.user);
  // TODO
  // If no event exsits then make api call to grab it
  res.render("editEvent", { title: `Edit ${event.name}`, event });
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

  // Add display type to true
  req.body.display = true;

  // Add author id to body
  req.body.author = req.user._id;

  // Check and add end datetime
  if (
    !req.body.end_datetime ||
    req.body.end_datetime < req.body.start_datetime
  ) {
    req.body.end_datetime = req.body.start_datetime;
  }

  // If there are no tags add set to null
  if (!req.body.tags) req.body.tags = [];

  // If free is not checked set to null
  if (!req.body.is_free) req.body.is_free = false;

  // Get coordinates
  const latLng = await getLatLng(req.body.location.address);

  // add to request body
  req.body.location.type = "Point";
  req.body.location.coordinates = [latLng[1], latLng[0]];

  // Set slug if required
  if (req.body.description === "") {
    console.log("no description");
    req.body.slug = "";
    console.log("setting slug to blank string");
  } else {
    const slug = await createSlug(req.body.name);
    req.body.slug = slug;
  }

  // find and update the event
  const event = await Event.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new event
    runValidators: true
  }).exec();

  // redirect to event and tell them it worked
  const link =
    event.slug === ""
      ? event.name
      : `<a href=/event/${event.slug}>${event.name}</a>`;

  req.flash("success", `Successfully updated <strong>${link}</strong>..`);
  res.redirect(`back`);
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
  // const page = req.params.page || 1;
  // const limit = 12;
  // const skip = page * limit - limit;
  // const free = req.body.free;
  // const familyFriendly = req.body.family_friendly;
  // const start = req.body.start_datetime || undefined;
  const end = req.body.end_datetime || undefined;
  const defaultStartDate = new Date().toISOString().slice(0, 10);
  // const organisation = req.body.search_organisation || undefined;
  const coordinates = [req.query.lng, req.query.lat];

  console.log(coordinates);

  let query = {
    display: true
  };

  // if (free) {
  //   query.is_free = true;
  // }
  // if (start) {
  //   query.start_datetime = {
  //     $gte: new Date(`${start}T00:00:00Z`)
  //   };
  // }
  if (end) {
    query.end_datetime = { $lte: new Date(`${end}T23:59:59Z`) };
  } else {
    query.end_datetime = { $gte: new Date(`${defaultStartDate}T00:00:00Z`) };
  }
  // if (organisation) {
  //   console.log(organisation);
  //   query.organisation = organisation;
  // }

  const miles = req.query.distance;

  let distance = false;

  if (miles === "10") distance = 16093;
  if (miles === "20") distance = 32186;
  if (miles === "30") distance = 48280;
  if (miles === "40") distance = 64373;

  if (coordinates[0] !== null && coordinates[1] !== null) {
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
      "name organisation location.address location.coordinates image slug display_date is_free price price_range website"
    )
    // .limit(50)
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

  const event = await new Event(req.body).save();
  req.flash("success", `Event "${event.name}" has been successfully created.`);
  res.redirect("back");
};

exports.addSingleEventbriteEvent = async (req, res) => {
  const ebOrganizerId = req.user.eb_organiser_id;
  const ebEventId = req.body.eb_event_id;
  // Return if event id false
  if (!ebEventId) {
    res.redirect("back");
  }
  // Return if not admin or owner of event
  if (!req.user.admin) {
    if (!ebOrganizerId) {
      res.redirect("back");
    }
  }

  // Single event details url
  const eventUrl = `https://www.eventbriteapi.com/v3/events/${ebEventId}/?expand=organizer,venue&token=${
    process.env.EVENTBRITE_KEY
  }`;

  // Price range url
  const priceUrl = `https://www.eventbriteapi.com/v3/events/${ebEventId}/ticket_classes/?token=${
    process.env.EVENTBRITE_KEY
  }`;

  // Add GET requests to promise
  const eventPromise = axios.get(eventUrl);
  const pricePromise = axios.get(priceUrl);

  // Destructure responses
  const [eventResponse, priceResponse] = await Promise.all([
    eventPromise,
    pricePromise
  ]);

  // Return if user is not the event organiser on Eventbrite or not an admin
  if (!req.user.admin && ebOrganizerId !== eventResponse.data.organizer_id) {
    req.flash("error", `This event can not be imported.`);
    res.redirect("back");
  }

  const event = {
    name: eventResponse.data.name.text,
    summary: eventResponse.data.summary ? eventResponse.data.summary : "",
    description: eventResponse.data.description.html
      ? stripInlineCss(eventResponse.data.description.html)
      : "",
    organisation: eventResponse.data.organizer.name,
    start_datetime: new Date(eventResponse.data.start.utc),
    end_datetime: new Date(eventResponse.data.end.utc),
    is_free: eventResponse.data.is_free,
    location: {
      type: "Point",
      coordinates: [
        eventResponse.data.venue.longitude
          ? parseFloat(eventResponse.data.venue.longitude)
          : "",
        eventResponse.data.venue.latitude
          ? parseFloat(eventResponse.data.venue.latitude)
          : ""
      ],
      address:
        eventResponse.data.venue.address &&
        eventResponse.data.venue.address.localized_address_display
          ? eventResponse.data.venue.address.localized_address_display
          : ""
    },
    website: eventResponse.data.url ? eventResponse.data.url : null,
    image:
      eventResponse.data.logo && eventResponse.data.logo.url
        ? eventResponse.data.logo.url
        : null,
    poster:
      eventResponse.data.logo &&
      eventResponse.data.logo.original &&
      eventResponse.data.logo.original.url
        ? eventResponse.data.logo.original.url
        : null,
    display_date: displayDate(
      new Date(eventResponse.data.start.utc),
      new Date(eventResponse.data.end.utc)
    ),
    eb_id: eventResponse.data.id,
    eb_organiser_id: eventResponse.data.organizer_id,
    eb_organisation_id: eventResponse.data.organization_id
  };

  const tickets = priceResponse.data.ticket_classes;
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

  // Add to database if not already
  try {
    await new Event(event).save();
  } catch (err) {
    console.log("unable to add event, probably already exsits");
  }

  // Search for event in database
  const currentEvent = await Event.findOne({ eb_id: event.eb_id });

  // Return if event is already assigned to an organiser
  if (req.user.admin && currentEvent["author"]) {
    req.flash("error", `This event has been assigned to an author.`);
    res.redirect("back");
  }

  res.redirect(`/event/${currentEvent["id"]}/edit`);
};

exports.getEvents = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 12;
  const skip = page * limit - limit;
  const location = req.query.geolocate;
  const miles = req.query.distance;
  const coordinates = [req.query.lng, req.query.lat];
  const start = new Date().toISOString().slice(0, 10);

  // Start constructing query
  let query = {
    display: true
  };

  query.end_datetime = { $gte: new Date(`${start}T00:00:00Z`) };

  if (miles) {
    let distance = 0;

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
  }

  console.log(query);

  // 1. Query database for all events
  const events = await Event.find(query)
    .skip(skip)
    .sort("start_datetime");
  const count = events.length;
  const pages = Math.ceil(count / limit);

  if (!events.length && skip) {
    req.flash(
      "info",
      `Page ${page} does not exist. You have been redirected to page ${pages} which is the last page.`
    );
    res.redirect(`/events/page/${pages}`);
    return;
  }

  res.render("events", {
    title: "Events",
    parentSlug: "events",
    events,
    count,
    page,
    pages,
    count,
    location,
    miles,
    lat: req.query.lat,
    lng: req.query.lng
  });
};
