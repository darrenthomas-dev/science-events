import axios from "axios";
import { $ } from "./bling";
import { nextEvent, clearOverlays } from "./helpers";

if ($("#map")) {
  var places;
  var latlng = new google.maps.LatLng(54.043667, -2.488511);

  var mapOptions = {
    zoom: 5,
    maxZoom: 18,
    center: latlng
  };
  var markers = [];
  var map;
}

// Make Google maps
function makeMap(mapDiv) {
  if (!mapDiv) return;

  //  make map
  map = new google.maps.Map(mapDiv, mapOptions);

  // Create the DIV to hold the control and call the CenterControl()
  // constructor passing in this DIV.
  var centerControlDiv = document.createElement("div");
  var centerControl = new CenterControl(centerControlDiv, map);

  centerControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

  loadPlaces();
}

function loadPlaces(lat = 54.043667, lng = -2.488511, distance = false) {
  const url = `/api/events/near?lat=${lat}&lng=${lng}&distance=${distance}`;

  axios.get(url).then(res => {
    places = res.data;

    if (!places.length) {
      alert("No places found!");
      return;
    }

    renderMarkers(places);
  });
}

function renderMarkers(places) {
  // create bounds
  const bounds = new google.maps.LatLngBounds();
  const infoWindow = new google.maps.InfoWindow();
  infoWindow.close();

  // Group by lat and lng
  let groupedPlaces = places.reduce(function(acc, place) {
    let key = place.location.coordinates;
    (acc[key] ? acc[key] : (acc[key] = null || [])).push(place);
    return acc;
  }, {});

  // Convert to an array
  groupedPlaces = Object.keys(groupedPlaces).map(key => groupedPlaces[key]);

  google.maps.event.addListener(infoWindow, "domready", function() {
    // Bind click event to button
    const btn = document.querySelector(".gm-next-btn");
    if (btn) {
      btn.addEventListener("click", function() {
        nextEvent();
      });
    }
  });

  markers = clearOverlays(markers);
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
      let html = "<div class='popup'>";

      for (let i = 0; i < this.place.length; i++) {
        console.log(this.place);
        let image;
        if (this.place[i].image && this.place[i].image.indexOf("http") === 0) {
          image = this.place[i].image;
        } else if (this.place[i].image) {
          image = `/uploads/${this.place[i].image}`;
        } else {
          image = "/uploads/defaultImage.jpg";
        }

        let price = "";
        if (this.place[i].is_free) {
          price = "Free";
        }
        if (this.place[i].price_range.max_price) {
          price = `£${this.place[i].price_range.min_price.toFixed(
            2
          )} to £${this.place[i].price_range.max_price.toFixed(2)}`;
        }
        if (
          this.place[i].price_range.min_price === 0.0 ||
          this.place[i].price_range.min_price === 0
        ) {
          price = `Free to £${this.place[i].price_range.max_price.toFixed(2)}`;
        }

        html += `
        <div class="popup__event${i > 0 ? " hide" : ""}">
            <div class="event">
            <img class="event__img" src="${image}" alt="">
            <h3 class="event__title"><a href="${this.place[i].website}">${
          this.place[i].name
        }</a></h3>
            <dl class="event__details">
              <dt class="offscreen">Organiser:</dt>
              <dd class="event__item event__item--organiser">${
                this.place[i].organisation
              }</dd>
              <dt class="offscreen">Address:</dt>
              <dd class="event__item"><span class="event__icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 20S3 10.87 3 7a7 7 0 1 1 14 0c0 3.87-7 13-7 13zm0-11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg></span>${
                this.place[i].location.address
              }</dd>
              <dt class="offscreen">Event date:</dt>
              <dd class="event__item"><span class="event__icon"><svg xmlns="http://www.w3.org/2000/svg" fill="#f5faff" viewBox="0 0 20 20"><path d="M1 4c0-1.1.9-2 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm2 2v12h14V6H3zm2-6h2v2H5V0zm8 0h2v2h-2V0zM5 9h2v2H5V9zm0 4h2v2H5v-2zm4-4h2v2H9V9zm0 4h2v2H9v-2zm4-4h2v2h-2V9zm0 4h2v2h-2v-2z"></path></svg></span>${
                this.place[i].display_date
              }</dd>
              ${
                price
                  ? '<dt class="offscreen">Price:</dt><dd class="event__item"><span class="event__icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M20 12v5H0v-5a2 2 0 1 0 0-4V3h20v5a2 2 0 1 0 0 4zM3 5v10h14V5H3zm7 7.08l-2.92 2.04L8.1 10.7 5.27 8.56l3.56-.08L10 5.12l1.17 3.36 3.56.08-2.84 2.15 1.03 3.4L10 12.09z"></path></svg></span>' +
                    price +
                    "</dd>"
                  : ""
              }
            </dl>
          </div>
          </div>`;
      }

      html += `${
        this.place.length > 1
          ? '<button class="gm-next-btn button">Next</button>'
          : ""
      }</div>`;

      infoWindow.setContent(html);
      infoWindow.open(map, this);
    })
  );

  const clusterOptions = {
    gridSize: 20,
    maxZoom: 10,
    imagePath:
      "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m"
  };

  // Add a marker clusterer to manage the markers.
  new MarkerClusterer(map, markers, clusterOptions);

  //  zoom map to fit markers
  map.setCenter(bounds.getCenter());
  // map.fitBounds(bounds, renderEvents(places));
  map.fitBounds(bounds);
}

function CenterControl(controlDiv, map) {
  // Set CSS for the control border.
  var controlUI = document.createElement("div");
  controlUI.classList.add("gm-reset-btn");
  controlUI.style.backgroundColor = "#fff";
  controlUI.style.border = "2px solid #fff";
  controlUI.style.borderRadius = "3px";
  controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
  controlUI.style.cursor = "pointer";
  controlUI.style.marginBottom = "22px";
  controlUI.style.textAlign = "center";
  controlUI.title = "Click to recenter the map";
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlText = document.createElement("div");
  controlText.style.color = "rgb(25,25,25)";
  controlText.style.fontFamily = "Roboto,Arial,sans-serif";
  controlText.style.fontSize = "16px";
  controlText.style.lineHeight = "38px";
  controlText.style.paddingLeft = "5px";
  controlText.style.paddingRight = "5px";
  controlText.innerHTML = "Reset Map";
  controlUI.appendChild(controlText);

  // Setup the click event listeners: simply set the map to Chicago.
  controlUI.addEventListener("click", function() {
    map.setCenter(loadPlaces());
  });
}

export default makeMap;
