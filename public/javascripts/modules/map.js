import axios from "axios";
import { $ } from "./bling";
import { nextEvent, clearOverlays } from "./helpers";

if ($("#map")) {
  var places;
  var miles;

  var mapOptions = {
    zoom: 5,
    maxZoom: 18
  };
  var markers = [];
  var input = $('[name="geolocate"]');
  var autocomplete = new google.maps.places.Autocomplete(input);
  var map;
}

// Make Google maps
function makeMap(mapDiv) {
  if (!mapDiv) return;

  //  make map
  map = new google.maps.Map(mapDiv, mapOptions);

  // If hit enter do not submit form.
  input.on("keydown", e => {
    if (e.keyCode === 13) e.preventDefault();
  });

  // const image = "/images/icons/current_location.png";
  // let current = new google.maps.Marker({
  //   map: map,
  //   icon: image,
  //   animation: google.maps.Animation.DROP,
  //   title: "Current location"
  // });

  navigator.geolocation.getCurrentPosition(
    data => {
      loadPlaces(data.coords.latitude, data.coords.longitude);
    },
    err => {
      loadPlaces();
    }
  );

  // Distance changed
  $("#distance-select").on("change", function() {
    miles = this.querySelector('input[name="distance"]:checked').value;
    const gmPlace = autocomplete.getPlace();
    if (!gmPlace) return false;

    loadPlaces(
      gmPlace.geometry.location.lat(),
      gmPlace.geometry.location.lng(),
      miles
    );
  });

  // Load events on place change
  autocomplete.addListener("place_changed", () => {
    const gmPlace = autocomplete.getPlace();
    loadPlaces(
      gmPlace.geometry.location.lat(),
      gmPlace.geometry.location.lng(),
      miles
      // current
    );
  });
}

function loadPlaces(lat = 54.043667, lng = -2.488511, miles = false) {
  console.log(lat, lng, miles);
  axios
    .get(`/api/events/near?lat=${lat}&lng=${lng}&miles=${miles}`)
    .then(res => {
      places = res.data;

      if (!places.length) {
        alert("no places found!");
        return;
      }

      renderMarkers(places);
    });
}

function renderMarkers(places) {
  // create bounds
  const bounds = new google.maps.LatLngBounds();
  const infoWindow = new google.maps.InfoWindow();

  // Group by lat and lng
  let groupedPlaces = places.reduce(function(acc, place) {
    let key = place.location.coordinates;
    (acc[key] ? acc[key] : (acc[key] = null || [])).push(place);
    return acc;
  }, {});

  // Convert to an array
  groupedPlaces = Object.keys(groupedPlaces).map(key => groupedPlaces[key]);

  console.log("Grouped:", groupedPlaces);

  google.maps.event.addListener(infoWindow, "domready", function() {
    // Bind click event to button
    const btn = document.querySelector(".info__button");
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
      const lat = this.place[0].location.coordinates[1];
      const lng = this.place[0].location.coordinates[0];

      let html = "<div class='popup'>";

      for (let i = 0; i < this.place.length; i++) {
        html += `
        <div class="popup__event${i > 0 ? " hide" : ""}">
          <img src=${this.place[i].image} alt="">          
          <h3>${this.place[i].name}</h3>
          <p><em>${this.place[i].organisation}</em></p>
          <p>${this.place[i].location.address}</p>
            </div>`;
      }

      html += `${
        this.place.length > 1 ? '<button class="button">Next</button>' : ""
      }</div>`;

      infoWindow.setContent(html);
      infoWindow.open(map, this);
    })
  );

  // if (currentLocationMarker) {
  //   const currentLatLng = new google.maps.LatLng(lat, lng);
  //   currentLocationMarker.setPosition(currentLatLng);
  // }

  const clusterOptions = {
    gridSize: 20,
    maxZoom: 10,
    // zoomOnClick: false,
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

export default makeMap;
