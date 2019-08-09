import { $ } from "./bling";

// Clear Google markers
exports.clearOverlays = markers => {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers.length = 0;

  return markers;
};

// Show / hide events info window button
let current = 0;
exports.nextEvent = () => {
  let events = document.querySelectorAll(".popup__event");
  events[current].classList.add("hide");
  current =
    events.length - 1 === current ? (current = 0) : (current = current + 1);
  events[current].classList.remove("hide");
};

// Returns human readable price range
const getPriceRange = (min, max) => {
  if (!min && !max) return "";

  min = Number(min).toFixed(2);
  max = Number(max).toFixed(2);

  let cost = "";

  if (min === "0.00") {
    cost = `Free - £${max}`;
  } else if (min === max) {
    cost = `£${min}`;
  } else {
    cost = `£${min} - £${max}`;
  }

  return cost;
};

// Filter places
exports.filterPlaces = (places, lat = null, lng = null) => {
  const free = $("#free");
  const searchTerm = $("#organisationSearch").value;

  if (searchTerm) {
    places = places.filter(
      place =>
        `${place.name} ${place.organisation}`
          .toLowerCase()
          .indexOf(searchTerm.toLowerCase()) >= 0
    );
  }

  if (lat && lng) {
    places = places.filter(
      place =>
        place.location.coordinates[1] === lat &&
        place.location.coordinates[0] === lng
    );
  }

  if (free.checked) {
    places = places.filter(place => place.is_free);
  }

  return places;
};

// Render Events
exports.renderEvents = places => {
  // "name organisation image slug location display_date free"
  let newHTML = "";
  const count = places.length;

  for (let i in places) {
    let image = places[i].image ? places[i].image : "store.png";

    if (!image.startsWith("http")) {
      image = `/uploads/${image}`;
    }

    // price range
    const priceRange =
      places[i].price_range && places[i].price_range.max_price
        ? getPriceRange(
            places[i].price_range.min_price,
            places[i].price_range.max_price
          )
        : "";

    // price
    const price = priceRange
      ? `<div class="event__price"><p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M20 12v5H0v-5a2 2 0 1 0 0-4V3h20v5a2 2 0 1 0 0 4zM3 5v10h14V5H3zm7 7.08l-2.92 2.04L8.1 10.7 5.27 8.56l3.56-.08L10 5.12l1.17 3.36 3.56.08-2.84 2.15 1.03 3.4L10 12.09z"/></svg>${priceRange}</p></div>`
      : "";

    // free
    const free = places[i].is_free
      ? `<div class="event__free"><p>Free</p></div>`
      : "";

    const event = `
        <div class="event">          
          <div class="event__hero">
            <img src=${image}>
          </div>          
          <div class="event__details">            
            <div class="event__title">
              <a href=/event/${places[i].slug}><h3 class="title">${
      places[i].name
    }</h3></a>
            </div>
            <div class="event__organiser">
              <p><em>${places[i].organisation}</em></p>
            </div>            
            <div class="event__description">              
              <div class="event__location">
                <p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg><span>${
                  places[i].location.address
                }</span></p>
              </div>              
              <div class="event__date">
                <p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M1 4c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm2 2v12h14V6H3zm2-6h2v2H5V0zm8 0h2v2h-2V0zM5 9h2v2H5V9zm0 4h2v2H5v-2zm4-4h2v2H9V9zm0 4h2v2H9v-2zm4-4h2v2h-2V9zm0 4h2v2h-2v-2z"></path></svg><span>${
                  places[i].display_date
                }</span></p>
              </div>
              ${price}
              ${free}
            </div>
          </div>
        </div>`;
    newHTML += event;
  }

  $(".events__count").innerHTML = `<p>${count} events found.</p>`;
  $(".events").innerHTML = newHTML;
};
