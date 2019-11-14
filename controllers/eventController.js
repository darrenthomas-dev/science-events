const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const User = mongoose.model("User");
const multer = require("multer");
const sharp = require("sharp");
const ImageUploader = require("../utils/ImageUploader");
const aws = require("aws-sdk");
aws.config.region = process.env.AWS_REGION;

const jimp = require("jimp");
const uuid = require("uuid");
const findLatLong = require("find-lat-lng");
const {
  displayDate,
  stripInlineCss,
  createSlug,
  constructQuery,
  convertEventbriteDataToEvent,
  addEventbriteTicketPricesToEvent
} = require("../helpers");
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

exports.privacyPage = (req, res) => {
  res.render("privacy", {
    title: "Privacy and Cookie Policy For Science Near Me"
  });
};

exports.addEvent = (req, res) => {
  res.render("editEvent", {
    title: "Add Event"
  });
};

exports.upload = multer(multerOptions).single("image");

exports.signS3 = (req, res) => {
  const S3_BUCKET = process.env.S3_BUCKET;
  const s3 = new aws.S3();
  const fileName = req.query["file-name"];
  const fileType = req.query["file-type"];
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: "public-read"
  };

  s3.getSignedUrl("putObject", s3Params, (err, data) => {
    if (err) {
      console.log(err);
      return res.end();
    }
    const returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
};

// exports.resize = async (req, res, next) => {
//   // check if there is no new file to resize when we save
//   // multer automatically knows if a file was uploaded
//   // multer puts the file property on the request

//   if (!req.file) {
//     next(); // no file so skip to the next middleware
//     return;
//   }

//   try {
//     console.log("starting resize image");
//     console.log(req.file);

//     // Resize photo
//     const image = await sharp(req.file.buffer)
//       .resize(800)
//       .toBuffer();

//     //1 pass in file to new Class()
//     const s3File = new ImageUploader.S3Loader(req.file);

//     //2 new class returns path
//     req.body.image = s3File.getUrlPath();

//     //3 data is stored in class passing in the edited photo buffer - save/upload
//     s3File.uploadPhoto(image, () => {
//       next();
//     });
//   } catch (e) {
//     console.log("error try catch");
//     console.log(e);

//     next();
//     return;
//   }
// };

exports.resize = async (req, res, next) => {
  // Check if there is no new file to resize
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }

  const extension = req.file.mimetype.split("/")[1];
  const fileName = `uploads/${uuid.v4()}.${extension}`;

  const image = await sharp(req.file.buffer)
    .resize(800)
    .toBuffer();

  console.log(image);

  const S3_BUCKET = process.env.S3_BUCKET;
  const s3 = new aws.S3();
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: extension,
    ACL: "public-read"
  };

  s3.getSignedUrl("putObject", s3Params, (err, data) => {
    if (err) {
      console.log(err);
      return res.end();
    }
    const returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    uploadFile(image, returnData.signedRequest, returnData.url);
    console.log(returnData);
  });

  const uploadFile = async (file, signedRequest, url) => {
    await axios({
      method: "put",
      url: signedRequest,
      data: file
    });
  };

  req.body.image = fileName;

  next();
};

exports.createEvent = async (req, res) => {
  if (req.body.yourEmail) {
    return res.redirect("/");
  }

  // Add end date if not set
  if (!req.body.end_datetime) {
    req.body.end_datetime = req.body.start_datetime;
  }

  // Add human readable display date to body
  req.body.display_date = displayDate(
    req.body.start_datetime,
    req.body.end_datetime
  );

  // Add latlng coordinates to body
  if (!req.body.location.coordinates) {
    const latLng = await getLatLng(req.body.location.address);
    req.body.location.coordinates = [latLng[1], latLng[0]];
  }

  // Add author id to body
  if (req.user) {
    req.body.author = req.user._id;
    req.body.display = "true";
  } else {
    const admin = await User.findOne({ admin: true });
    req.body.author = admin._id;
    req.body.display = null;
  }

  // Add body data to database
  const event = await new Event(req.body).save();

  let message;
  if (req.user) {
    message = event.slug
      ? `Event <a href="/event/${event.slug}">${event.name}</a> has been successfully created.`
      : `Event ${event.name} has been successfully created.`;
  } else {
    message = `Event ${event.name} has been successfully submitted and should appear on the site in the next 24 hours.`;
  }

  req.flash("success", message);

  res.redirect("back");
};

const confirmOwner = (event, user) => {
  let access = false;
  if (event.author && event.author.equals(user._id)) {
    access = true;
  }

  if (event.eb_organiser_id === user.eb_organiser_id) {
    access = true;
  }

  if (user.admin) {
    access = true;
  }

  if (!access) {
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
  res.render("editEvent", { title: event.name, event });
};

async function getLatLng(address) {
  const client = findLatLong(process.env.MAP_KEY);
  console.log(client);
  const items = [address];
  console.log(items);
  const itemsWithLatLng = await client(items, { debug: false });
  console.log(itemsWithLatLng);
  const coords = [itemsWithLatLng[0].lat, itemsWithLatLng[0].lng];
  console.log(coords);
  return coords;
}

exports.updateEvent = async (req, res) => {
  // Add display date
  req.body.display_date = displayDate(
    req.body.start_datetime,
    req.body.end_datetime
  );

  // // Add display type to true
  req.body.display = true;

  // // Add author id to body
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

  // Add latlng coordinates to body
  if (!req.body.location.coordinates || !req.body.location["coordinates"][0]) {
    const address = req.body.location["address"];
    console.log(address);
    const latLng = await getLatLng(address);
    req.body.location.coordinates = [latLng[1], latLng[0]];
  }

  // add to request body
  req.body.location.type = "Point";

  // Set slug if required
  if (req.body.description === "") {
    req.body.slug = "";
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
  const link = event.slug
    ? `<a href=/event/${event.slug}>${event.name}</a>`
    : event.name;

  req.flash("success", `Successfully updated <strong>${link}</strong>.`);
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
  const date = new Date().toISOString().slice(0, 10);
  const endDatetime = new Date(`${date}T00:00:00Z`);

  const events = await Event
    // first find events that match
    .find(
      {
        display: "true",
        end_datetime: { $gte: endDatetime },
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
  const startDate = new Date().toISOString().slice(0, 10);
  const coordinates = [req.query.lng, req.query.lat];

  let query = {
    display: true
  };

  query.end_datetime = { $gte: new Date(`${startDate}T00:00:00Z`) };

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

  const eventsByOrganisation = await Event.find({
    organisation: event.organisation,
    display: "true",
    _id: { $ne: event._id }
  }).limit(4);

  res.render("singleEvent", { event, title: event.name, eventsByOrganisation });
};

exports.mapPage = async (req, res) => {
  // const location = req.query.geolocate || req.params.geolocate;
  const miles = req.query.distance || req.params.distance;
  const coordinates = [req.query.lng, req.query.lat] || [
    req.params.lng,
    req.params.lat
  ];

  const query = constructQuery(miles, coordinates);

  // 1. Query database for all events
  const events = await Event.find(query);

  res.render("map", { title: "Map", events });
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
  const eventUrl = `https://www.eventbriteapi.com/v3/events/${ebEventId}/?expand=organizer,venue&token=${process.env.EVENTBRITE_KEY}`;

  // Price range url
  const priceUrl = `https://www.eventbriteapi.com/v3/events/${ebEventId}/ticket_classes/?token=${process.env.EVENTBRITE_KEY}`;

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

  // Convert response into an object with required values
  let event = convertEventbriteDataToEvent(eventResponse.data);
  // Add ticket detail to event
  event = addEventbriteTicketPricesToEvent(
    priceResponse.data.ticket_classes,
    event
  );

  // Add to database if not already
  try {
    await new Event(event).save();
  } catch (err) {
    console.log("unable to add event, probably already exsits");
  }

  // Search for event in database
  const currentEvent = await Event.findOne({ eb_id: event.eb_id });

  // Return if event is already assigned to an organiser

  // TODO
  // If user is the author then check my events page

  if (req.user.admin && currentEvent["author"]) {
    req.flash("error", `This event has already been assigned to an author.`);
    res.redirect("back");
  }

  res.redirect(`/event/${currentEvent["id"]}/edit`);
};

exports.getEventsByOrganisationAndEventName = async (req, res) => {
  if (!req.query.keywords) return;

  const keywords = req.query.keywords;

  const events = await Event.find({
    display: "true",
    $text: { $search: `\"${keywords}\"` }
  }).sort("start_datetime");

  const count = events.length;

  res.render("events", {
    title: `Searched for "${keywords}"`,
    events,
    count,
    keywords
  });
};

exports.getEvents = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 12;
  const skip = page * limit - limit;
  const location = req.query.geolocate || req.params.geolocate;
  const miles = req.query.distance || req.params.distance;
  const coordinates = [req.query.lng, req.query.lat] || [
    req.params.lng,
    req.params.lat
  ];

  const free = req.query.is_free || req.params.is_free;
  const childFriendly = req.query.child_friendly || req.params.child_friendly;

  const query = constructQuery(miles, coordinates);

  if (free) query.is_free = true;
  if (childFriendly) query.child_friendly = true;

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

  const results = `${count} events found within a ${miles} mile radius of ${location}.`;
  const message = req.message;

  // Pagination
  const { URL, URLSearchParams } = require("url");
  const fullUrl = req.protocol + "://" + req.get("host");

  let pp = `${fullUrl}/events/page/${parseFloat(page) - 1}`;
  let np = `${fullUrl}/events/page/${parseFloat(page) + 1}`;

  let urlPrevious = new URL(pp);
  let urlNext = new URL(np);

  let previousParams = urlPrevious.searchParams;
  let nextParams = urlNext.searchParams;

  if (miles) {
    previousParams.append("geolocate", location);
    previousParams.append("lat", coordinates[1]);
    previousParams.append("lng", coordinates[0]);
    previousParams.append("distance", miles);

    nextParams.append("geolocate", location);
    nextParams.append("lat", coordinates[1]);
    nextParams.append("lng", coordinates[0]);
    nextParams.append("distance", miles);
  }

  if (childFriendly) {
    previousParams.append("child_friendly", true);
    nextParams.append("child_friendly", true);
  }

  if (free) {
    previousParams.append("is_free", true);
    nextParams.append("is_free", true);
  }

  res.render("events", {
    message,
    title: "Events",
    parentSlug: "events",
    skip: "events",
    results,
    events,
    page,
    pages,
    count,
    location,
    free,
    childFriendly,
    distance: miles,
    lat: coordinates[1],
    lng: coordinates[0],
    urlPrevious,
    urlNext
  });
};

// Return recently added events
exports.recentlyAddedEvents = async (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const endDatetime = new Date(`${date}T00:00:00Z`);

  const limit = 16;
  const query = {
    display: "true",
    end_datetime: { $gte: endDatetime }
  };
  // const count = await Event.count();
  const events = await Event.find(query)
    .sort({ created: -1 })
    .limit(limit);

  res.render("recent", {
    title: "Recently added",
    events,
    skip: "events"
  });
};
