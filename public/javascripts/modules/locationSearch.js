import { $ } from "./bling";

function searchByLocation(locationAutocomplete) {
  if (!locationAutocomplete) return;
  const input = $('[name="geolocate"]');
  const lat = $("#lat");
  const lng = $("#lng");
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();

    lat.value = place.geometry.location.lat();
    lng.value = place.geometry.location.lng();
  });

  // If hit enter do not submit form.
  input.on("keydown", e => {
    if (e.keyCode === 13) e.preventDefault();
  });
}

export default searchByLocation;
