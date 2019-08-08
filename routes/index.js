const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const { catchErrors } = require("../handlers/errorHandlers");

// Events GET Pages
// router.get("/", catchErrors(eventController.getEvents));
// router.get("/events", catchErrors(eventController.mapPage));
router.get("/events/page/:page", catchErrors(eventController.getEvents));

// router.get("/events/:free", catchErrors(eventController.getEvents));

// Events POST Pages
// router.post("/", catchErrors(eventController.getEvents));
// router.post("/events", catchErrors(eventController.getEvents));
router.post("/events/page/:page", catchErrors(eventController.getEvents));

// Add events pages
router.get("/add", authController.isLoggedIn, eventController.addEvent);
router.post(
  "/add",
  eventController.upload,
  catchErrors(eventController.resize),
  catchErrors(eventController.createEvent)
);
router.post(
  "/add/:id",
  eventController.upload,
  catchErrors(eventController.resize),
  catchErrors(eventController.updateEvent)
);

router.post("/events/:id/delete", catchErrors(eventController.deleteEvent));

router.get("/event/:id/edit", catchErrors(eventController.editEvent));

router.get("/event/:slug", catchErrors(eventController.getEventBySlug));

// router.get("/tags", catchErrors(eventController.getEventByTag));
// router.get(
//   "/organisation/:organisation",
//   catchErrors(eventController.getEventsByOrganisation)
// );
// router.get(
//   "/organisation/:organisation/page/:page",
//   catchErrors(eventController.getEventsByOrganisation)
// );

router.get("/login", userController.loginForm);
router.post("/login", authController.login);
router.get("/register", userController.registerForm);

router.post(
  "/register",
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get("/logout", authController.logout);

router.post(
  "/register",
  // 1. Validate registation data
  userController.validateRegister,
  // 2. Register user
  userController.register,
  // 3. Log them in
  authController.login
);

// Account pages
router.get("/account", authController.isLoggedIn, userController.account);
router.get("/account/reset/:token", catchErrors(authController.reset));
router.post(
  "/account",
  // eventController.upload,
  // catchErrors(eventController.resize),
  catchErrors(userController.updateAccount)
);
router.post("/account/forgot", catchErrors(authController.forgot));
router.post(
  "/account/reset/:token",
  authController.confirmedPasswords,
  catchErrors(authController.update)
);
// Delete account
router.post("/delete", catchErrors(userController.deleteAccount));

// Map pages
router.get("/", eventController.mapPage);
// router.post("/", eventController.mapPage);

// Admin pages
router.get(
  "/admin",
  authController.isLoggedIn,
  catchErrors(adminController.confirmEvents)
);
router.post(
  "/admin",
  authController.isLoggedIn,
  adminController.updateEventDisplay
  // catchErrors(eventController.confirmEvents)
);
router.post(
  "/admin/delete-all-pending",
  authController.isLoggedIn,
  adminController.deleteAllPendingEvents
);
router.post(
  "/admin/get-eventbrite-events",
  authController.isLoggedIn,
  catchErrors(adminController.getEventbriteEvents)
);
router.get(
  "/admin/page/:page",
  authController.isLoggedIn,
  catchErrors(adminController.confirmEvents)
);
router.post(
  "/admin/expired-events",
  catchErrors(adminController.deleteExpiredEvents)
);

// API
router.get("/api/search", catchErrors(eventController.searchEvents));
router.get(
  "/api/search/organisation",
  catchErrors(eventController.searchOrganistaions)
);
router.get("/api/events/near", catchErrors(eventController.mapEvents));

// Filters
router.get("/filter", catchErrors(eventController.filters));

// My Events
router.get("/my-events", catchErrors(eventController.renderPage));
router.post("/my-events", catchErrors(eventController.addEventBriteEvents));

module.exports = router;
