import axios from "axios";
import { $ } from "./bling";

const mapOptions = {
  center: {
    lat: 54.043667,
    lng: -2.488511
  },
  zoom: 5
};

var markers = [];

function clearOverlays() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  markers.length = 0;
}

function loadPlaces(
  map,
  lat = 54.043667,
  lng = -2.488511,
  miles = false,
  currentLocationMarker
) {
  axios
    .get(`/api/events/near?lat=${lat}&lng=${lng}&miles=${miles}`)
    .then(res => {
      let places = res.data;

      if (!places.length) {
        alert("no places found!");
        return;
      }

      $("#free").on("click", function() {
        if (this.checked) {
          const filteredPlaces = places.filter(place => place.is_free);
          renderEvents(filteredPlaces);
          renderMarkers(filteredPlaces);
        } else {
          renderEvents(places);
          renderMarkers(places);
        }
      });

      // Group by lat and lng
      let groupedPlaces = places.reduce(function(acc, place) {
        let key = place.location.coordinates;
        (acc[key] ? acc[key] : (acc[key] = null || [])).push(place);
        return acc;
      }, {});

      // Convert to an array
      groupedPlaces = Object.keys(groupedPlaces).map(key => groupedPlaces[key]);

      renderMarkers(groupedPlaces);

      function renderMarkers(groupedPlaces) {
        // create bounds
        const bounds = new google.maps.LatLngBounds();
        const infoWindow = new google.maps.InfoWindow();

        google.maps.event.addListener(infoWindow, "domready", function() {
          // Bind the click event on your button here
          const btn = document.querySelector(".info__button");
          let current = 0;

          if (btn) {
            btn.addEventListener("click", function() {
              nextEvent();
            });
          }

          function nextEvent() {
            let events = document.querySelectorAll(".popup__event");
            events[current].classList.add("hide");
            current =
              events.length - 1 === current
                ? (current = 0)
                : (current = current + 1);
            events[current].classList.remove("hide");
          }
        });

        clearOverlays();
        markers = groupedPlaces.map(place => {
          const [placeLng, placeLat] = place[0].location.coordinates;
          const position = { lat: placeLat, lng: placeLng };
          let label = null;

          if (place.length > 1) {
            label = place.length.toString();
          }

          bounds.extend(position);
          const marker = new google.maps.Marker({ map, position, label });
          marker.place = place;
          return marker;
        });

        // show infoWindow on click
        markers.forEach(marker =>
          marker.addListener("click", function() {
            renderEvents(
              places,
              this.place[0].location.coordinates[1],
              this.place[0].location.coordinates[0]
            );

            let html = "<div class='popup'>";

            for (let i = 0; i < this.place.length; i++) {
              html += `
              <div class="popup__event${i > 0 ? " hide" : ""}">
                <h3>${this.place[i].name}</h3>
                <p><em>${this.place[i].organisation}</em></p>
                <p>${this.place[i].location.address}</p>
                  </div>`;
            }

            html += `${
              this.place.length > 1
                ? '<button class="button info__button">Next</button>'
                : ""
            }</div>`;

            infoWindow.setContent(html);
            infoWindow.open(map, this);
          })
        );

        if (currentLocationMarker) {
          const currentLatLng = new google.maps.LatLng(lat, lng);
          currentLocationMarker.setPosition(currentLatLng);
        }

        // Show all events (within specified distance) on marker close
        google.maps.event.addListener(infoWindow, "closeclick", function() {
          renderEvents(places);
        });

        const clusterOptions = {
          gridSize: 20,
          maxZoom: 10,
          // zoomOnClick: false,
          imagePath:
            "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m"
        };

        // Add a marker clusterer to manage the markers.
        const markerCluster = new MarkerClusterer(map, markers, clusterOptions);

        //  zoom map to fit markers
        map.setCenter(bounds.getCenter());
        map.fitBounds(bounds, renderEvents(places));
      }
    });
}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  //  make map
  const map = new google.maps.Map(mapDiv, mapOptions);

  const image = "/images/icons/current_location.png";

  let current = new google.maps.Marker({
    map: map,
    icon: image,
    animation: google.maps.Animation.DROP,
    title: "Current location"
  });

  navigator.geolocation.getCurrentPosition(
    data => {
      loadPlaces(map, data.coords.latitude, data.coords.longitude);
    },
    err => {
      loadPlaces(map);
    }
  );

  let miles = "";
  const distance = $("#distance-select");
  distance.addEventListener("change", function() {
    miles = distance.querySelector('input[name="distance"]:checked').value;
    const place = autocomplete.getPlace();
    if (!place) return false;

    loadPlaces(
      map,
      place.geometry.location.lat(),
      place.geometry.location.lng(),
      miles
    );

    // If hit enter do not submit form.
    input.on("keydown", e => {
      if (e.keyCode === 13) e.preventDefault();
    });
  });

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();

    loadPlaces(
      map,
      place.geometry.location.lat(),
      place.geometry.location.lng(),
      miles,
      current
    );
  });

  // If hit enter do not submit form.
  input.on("keydown", e => {
    if (e.keyCode === 13) e.preventDefault();
  });
}

// price range
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

function renderEvents(places, lat, lng) {
  // "name organisation image slug location display_date free"

  let newHTML = "";

  if (lat && lng) {
    places = places.filter(
      place =>
        place.location.coordinates[1] === lat &&
        place.location.coordinates[0] === lng
    );
  }

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
}

export default makeMap;
