import { $ } from "./bling";

function searchByLocation(locationAutocomplete) {
  if (!locationAutocomplete) return;
  const distance = $("#distance-select");
  const input = $('[name="geolocate"]');
  const lat = $("#lat");
  const lng = $("#lng");
  const autocomplete = new google.maps.places.Autocomplete(input);

  distance.on("change", function() {
    if (!input.value && lat.value && lng.value) {
      lat.value = "";
      lng.value = "";
      document.location.href = "/";
    }

    if (lat.value && lng.value && input.value) {
      locationAutocomplete.submit();
    }
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();

    lat.value = place.geometry.location.lat();
    lng.value = place.geometry.location.lng();

    locationAutocomplete.submit();
  });

  // If hit enter do not submit form.
  input.on("keydown", e => {
    if (e.keyCode === 13) e.preventDefault();
  });
}

export default searchByLocation;
