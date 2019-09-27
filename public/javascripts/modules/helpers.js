import { $ } from "./bling";

// Clear Google markers
exports.clearOverlays = markers => {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers.length = 0;

  return markers;
};

// Show & hide events info window button
let current = 0;
exports.nextEvent = () => {
  let events = document.querySelectorAll(".popup__event");

  for (let i = 0; i < events.length; i++) {
    events[i].classList.add("hide");
  }

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
