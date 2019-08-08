// Import environmental variables
require("dotenv").config();
const { displayDate } = require("../helpers");

const axios = require("axios");
const { getDatetime } = require("./helpers");

// Set start date
const startDate = getDatetime(1);
// Set end date
const endDate = getDatetime(2);
// Endpoint
const url = `https://www.eventbriteapi.com/v3/events/search/?categories=102&expand=organizer,venue&location.viewport.northeast.latitude=59.950197&location.viewport.northeast.longitude=1.255643&location.viewport.southwest.latitude=49.232844&location.viewport.southwest.longitude=-10.600715&categories=102&start_date.range_start=${startDate}&start_date.range_end=${endDate}&token=${
  process.env.EVENTBRITE_KEY
}`;

console.log(url);

// Page numbers
let pageNo = 1;
// Item count
let itemCount = 0;

const assert = require("assert");

// MongoDB setup
function updateDatabase() {
  const MongoClient = require("mongodb").MongoClient;
  // Connection URL
  const url = process.env.DATABASE;

  // Database Name
  const dbName = "snm";

  MongoClient.connect(url, { useNewUrlParser: true }, function(err, client) {
    assert.equal(null, err);
    console.log("Connected successfully to server.");

    const db = client.db(dbName);

    insertDocuments(db, function() {
      client.close();
    });
  });
}

// Events GET request
async function getEvents(data = []) {
  return axios
    .get(url + "&page=" + pageNo)
    .then(response => {
      data.push(...response.data.events);
      itemCount = data.length;
      console.log(
        "page " +
          pageNo +
          " of " +
          response.data.pagination.page_count +
          " (" +
          itemCount +
          " items" +
          ")"
      );
      if (response.data.pagination.has_more_items === false) return data;
      pageNo++;
      return getEvents(data);
    })
    .catch(error => {
      console.log(error);
    });
}

const stripInlineCss = html => {
  html = html.replace(/(CLASS|STYLE)=".*?"/g, "");
  html = html.replace(/\r\n/g, "");
  html = html.replace(/\n/g, "");
  html = html.replace(/\<BR\s?\/?\>/g, "");
  html = html.replace(/(\<P\>\s?\<\/P\>)/g, "");

  return html;
};

const insertDocuments = async function(db, callback) {
  // Get the collection
  const collection = db.collection("events");
  try {
    let data = await getEvents();

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
            : "",
        city: e.venue.address.city ? e.venue.address.city : null
      },
      website: e.url ? e.url : null,
      image: e.logo && e.logo.url ? e.logo.url : null,
      poster:
        e.logo && e.logo.original && e.logo.orginal.url
          ? e.logo.original.url
          : null,
      eb_id: e.id,
      slug: "eb" + e.id,
      display_date: displayDate(new Date(e.start.utc), new Date(e.end.utc))
    }));
    console.log("Adding events to the database. This may take a while...");
    // Insert some documents
    collection.insertMany(
      data,
      function(err, result) {
        assert.equal(err, null);
        assert.equal(itemCount, result.result.n);
        assert.equal(itemCount, result.ops.length);
        console.log(`Inserted ${itemCount} documents into the collection.`);
        console.log("👍 👍 👍 👍  All done, have fun!");
        callback(result);
      },
      { ordered: false, upsert: true }
    );
  } catch (e) {
    console.log("\n👎 👎 👎 👎 👎 👎 👎 👎 Ruh Roh! Something went wrong.");
    console.log(e);
    process.exit();
  }
};

updateDatabase();
