import "../sass/style.scss";

import { $, $$ } from "./modules/bling";
import autocomplete from "./modules/autocomplete";
import typeAhead from "./modules/typeAhead";
import typeAheadOrganisation from "./modules/typeAheadOrganisation";
import makeMap from "./modules/map";
import displayNavigation from "./modules/navigation";
import clearFilters from "./modules/clearFilters";
// import searchByLocation from "./modules/locationSearch";

autocomplete($("#address"));

typeAhead($(".search"));

typeAheadOrganisation($(".searchOrganisation"));

makeMap($("#map"));

displayNavigation($(".nav__button"));

clearFilters($("#filterResetButton"));

// searchByLocation($("#locationAutocomplete"));
