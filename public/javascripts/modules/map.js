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

  console.log("Grouped:", groupedPlaces);

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
        if (this.place[i].image.indexOf("http") == 0) {
          image = this.place[i].image;
        } else if (this.place[i].image) {
          image = `/uploads/${this.place[i].image}`;
        } else {
          image = "/uploads/defaultImage.jpg";
        }

        html += `
        <div class="popup__event${i > 0 ? " hide" : ""}">
          <img src=${image} alt="">
          <h3>${this.place[i].name}</h3>
          <p><em>${this.place[i].organisation}</em></p>
          <p>${this.place[i].location.address}</p>
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
