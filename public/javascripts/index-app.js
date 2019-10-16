import "../sass/style.scss";

import { $, $$ } from "./modules/bling";
import autocomplete from "./modules/autocomplete";
import typeAhead from "./modules/typeAhead";
// import typeAheadOrganisation from "./modules/typeAheadOrganisation";
import makeMap from "./modules/map";
import displayNavigation from "./modules/navigation";
import clearFilters from "./modules/clearFilters";
import searchByLocation from "./modules/locationSearch";
import showPassword from "./modules/showPassword";
import togglePadlock from "./modules/togglePadlock";
import toggleState from "./modules/toggleState";
import scrollToTop from "./modules/scrollToTop";
import spinner from "./modules/spinner";
import onSubmitGetCoordinates from "./modules/onsubmitGetCoordinates";

onSubmitGetCoordinates(
  $("#eventForm"),
  $("#address"),
  $("#lat"),
  $("#lng"),
  $("#submitEvent")
);

spinner($("#getEbEvents"));
spinner($("#eventForm"));

showPassword($("#password"));

autocomplete($("#address"), $("#lat"), $("#lng"));

// typeAhead($(".search"));

// typeAheadOrganisation($(".searchOrganisation"));

makeMap($("#map"));

displayNavigation($("#menu"));

clearFilters($("#filterResetButton"));

searchByLocation($("#locationAutocomplete"));

togglePadlock($$(".padlock"));

toggleState($$(".toggle-password"));

scrollToTop($(".to-top"), 600);
