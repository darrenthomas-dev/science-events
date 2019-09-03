const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const moment = require("moment");
const axios = require("axios");
const { getDatetime, stripInlineCss, displayDate } = require("../helpers");

const yesterday = moment()
  .subtract(0, "days")
  .endOf("day")
  .format("YYYY-MM-DDThh:mm:ss")
  .toString();

exports.confirmEvents = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 9;
  const skip = page * limit - limit;

  // 1. Query database for all events
  const eventsPromise = Event.find({ display: null })
    .skip(skip)
    .limit(limit);

  // Count events with display null
  const countPromise = Event.find({ display: null }).count();

  // Count events with expired end_datetime
  const expiredPromise = Event.find({
    end_datetime: { $lte: yesterday }
  }).count();

  const [events, pendingCount, expiredCount] = await Promise.all([
    eventsPromise,
    countPromise,
    expiredPromise
  ]);

  console.log(expiredCount);
  console.log(yesterday);

  const pages = Math.ceil(pendingCount / limit);

  if (!events.length && skip) {
    req.flash(
      "info",
      `Page ${page} does not exist. You have been redirected to page ${pages} which is the last page.`
    );
    res.redirect(`/admin/page/${pages}`);
    return;
  }

  res.render("admin", {
    title: "Admin",
    parentSlug: "admin",
    events,
    page,
    pages,
    pendingCount,
    expiredCount
  });
};

exports.deleteExpiredEvents = async (req, res) => {
  // Delete expired events from database
  await Event.deleteMany({ end_datetime: { $lte: [yesterday] } });

  // alert message
  req.flash("success", "All expired events have been deleted.");

  // redirect
  res.redirect("back");
};

exports.deleteAllPendingEvents = async (req, res) => {
  // Delete pending events from database (those with display: null)
  await Event.deleteMany({ display: null });

  // alert message
  req.flash("success", "All pending events have been deleted.");

  // redirect
  res.redirect("back");
};

exports.getEventbriteEvents = async (req, res) => {
  // Set start date to tomorrow
  const startDate = getDatetime(1);
  // Set end date to correct format
  const endDate = new Date(req.body.end_date).toISOString().split(".")[0] + "Z";
  // Construct Eventbrite url
  const url = `https://www.eventbriteapi.com/v3/events/search/?categories=102&expand=organizer,venue&location.viewport.northeast.latitude=59.950197&location.viewport.northeast.longitude=1.255643&location.viewport.southwest.latitude=49.232844&location.viewport.southwest.longitude=-10.600715&categories=102&start_date.range_start=${startDate}&start_date.range_end=${endDate}&token=${process.env.EVENTBRITE_KEY}`;
  // Declare page number for pagination
  let pageNo = 1;

  // Add to array including paginated pages
  // GET request
  async function getEvents(data = []) {
    const fullURL = `${url}&page=${pageNo}`;
    const response = await axios.get(fullURL);
    data.push(...response.data.events);
    if (response.data.pagination.has_more_items === false) return data;
    pageNo++;
    return getEvents(data);
  }

  let data = await getEvents();

  // Add to mongodb
  data = data.map(e => ({
    name: e.name.text,
    summary: e.summary ? e.summary : "",
    description: e.description.html ? stripInlineCss(e.description.html) : "",
    organisation: e.organizer.name,
    start_datetime: new Date(e.start.utc),
    end_datetime: new Date(e.end.utc),
    is_free: e.is_free,
    location: {
      type: "Point",
      coordinates: [
        e.venue.longitude ? parseFloat(e.venue.longitude) : "",
        e.venue.latitude ? parseFloat(e.venue.latitude) : ""
      ],
      address:
        e.venue.address && e.venue.address.localized_address_display
          ? e.venue.address.localized_address_display
          : ""
    },
    website: e.url ? e.url : null,
    image: e.logo && e.logo.url ? e.logo.url : null,
    poster:
      e.logo && e.logo.original && e.logo.original.url
        ? e.logo.original.url
        : null,
    eb_id: e.id,
    eb_organisation_id: e.organization_id,
    eb_organiser_id: e.organizer_id,
    display_date: displayDate(new Date(e.start.utc), new Date(e.end.utc)),
    display: null
  }));

  // find and update the event
  console.log("Adding to the database now!");
  try {
    const events = await Event.insertMany(data, {
      new: true, // return new event
      runValidators: true,
      ordered: false,
      upsert: false
    });
    console.log(events);
  } catch (err) {
    // console.log(err);
    console.log(err);
  }

  console.log("done!");

  // alert message
  // req.flash("success", "All pending events have been deleted.");

  // redirect
  res.redirect("back");
};

/* -------------------------------------------------------- */
/* API call to Eventbrite to add ticket prices to event.
/* -------------------------------------------------------- */

exports.updateEventDisplay = async (req, res) => {
  if (req.body.display_true) {
    const x = req.body.display_true;
    const ids = Array.isArray(x) ? x : [x];

    for (const id of ids) {
      let url = `https://www.eventbriteapi.com/v3/events/${id}/ticket_classes/?token=${process.env.EVENTBRITE_KEY}`;

      console.log(url);

      const event = {
        id,
        donation: false,
        free: false
      };

      await axios
        .get(url)
        .then(res => {
          const tickets = res.data.ticket_classes;

          if (tickets.length > 0) {
            let prices = [];

            for (let item of tickets) {
              if (item.cost) {
                prices.push(item.cost.major_value);
              }
              if (item.donation) {
                event.donation = true;
              }
            }

            console.log(prices);
            console.log(prices.length);

            if (prices.length > 0) {
              prices = prices.map(Number); // convert to numbers

              event["price_range"] = {
                min_price: Math.min(...prices),
                max_price: Math.max(...prices)
              };
            }
          }
        })
        .catch(err => {
          req.flash(
            "danger",
            `Unable to add event ${url}. The event probably no longer exists.`
          );

          console.log(
            `Unable to add event ${url}. The event probably no longer exists.`
          );
          console.log(err);
          return;
        });

      // Find and update event with ticket details
      console.log(event);
      if (event.price_range) {
        await Event.updateOne(
          { eb_id: event.id },
          {
            price_range: {
              min_price: event.price_range.min_price,
              max_price: event.price_range.max_price
            },
            donation: event.donation
          }
        );
      } else {
        await Event.updateOne(
          { eb_id: event.id },
          {
            donation: event.donation
          }
        );
      }
    }
  }

  // Find and update multiple events to display
  const displayTrue = Event.updateMany(
    { eb_id: req.body.display_true },
    { display: "true" }
  );

  //  Find and update multiple events not to display
  const displayFalse = Event.updateMany(
    { _id: req.body.display_false },
    { display: "false" }
  );

  await Promise.all([displayTrue, displayFalse]);

  // // 2. Redirect to event and tell them it worked
  req.flash("success", "Events successfully updated!");

  res.redirect(`back`);
};
