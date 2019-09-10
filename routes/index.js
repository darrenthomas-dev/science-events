const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const { catchErrors } = require("../handlers/errorHandlers");

// Homepage
// router.get("/", catchErrors(eventController.getEvents));
// Events pagination
router.get("/events/page/:page", catchErrors(eventController.getEvents));

router.get("/", catchErrors(eventController.recentlyAddedEvents));

// Event Pages
// Add an event page
router.get("/add", eventController.addEvent);
// Create an event
router.post(
  "/add",
  eventController.upload,
  catchErrors(eventController.resize),
  catchErrors(eventController.createEvent)
);
// Edit an existing event
router.get("/event/:id/edit", catchErrors(eventController.editEvent));
// Update an existing event
router.post(
  "/add/:id",
  eventController.upload,
  catchErrors(eventController.resize),
  catchErrors(eventController.updateEvent)
);

// Delete an event
router.post("/events/:id/delete", catchErrors(eventController.deleteEvent));
// Single event page
router.get("/event/:slug", catchErrors(eventController.getEventBySlug));

// Register
router.get("/register", userController.registerForm);
// Register request
router.post(
  "/register",
  userController.validateRegister,
  catchErrors(userController.register),
  authController.login
);
//  Sign in
// Login page
router.get("/login", userController.loginForm);
// Login request
router.post("/login", authController.login);
// router.post(
//   "/login",
//   authController.login2,
//   catchErrors(authController.loginUser)
//   catchErrors(eventController.getEvents)
// );

/* ------------------------------------ */
/* PASSWORD RESET FLOW
/* ------------------------------------ */

// 1. Page to request a password reset
router.get("/account/forgot", authController.getPasswordReset);
// 2. Post request to send reset tokens
router.post("/account/forgot", catchErrors(authController.forgot));
// 3. Page to actually reset password (requires token)
router.get("/account/reset/:token", catchErrors(authController.reset));
// 4. Post request to update passwords
router.post(
  "/account/reset/:token",
  authController.confirmedPasswords,
  catchErrors(authController.update)
);

/* ------------------------------------ */
/* User Pages
/* ------------------------------------ */

// Log out
router.get("/logout", authController.logout);

// Account page
router.get("/account", authController.isLoggedIn, userController.account);

// Update account details
router.post(
  "/account",
  // eventController.upload,
  // catchErrors(eventController.resize),
  catchErrors(userController.updateAccount)
);

// Delete account
router.post("/delete", catchErrors(userController.deleteAccount));

// My Events
router.get("/my-events", catchErrors(userController.getUserEvents));
router.post("/my-events", catchErrors(eventController.addEventBriteEvents));

// // My Eventbrite Events for log in users
// router.get(
//   "/my-eb-events",
//   catchErrors(userController.getUserEventbriteEvents)
// );

/* ------------------------------------ */
/* ACCOUNT PAGES
/* ------------------------------------ */
router.post(
  "/request-eventbrite",
  catchErrors(authController.requestEventbriteLink)
);

/* ------------------------------------ */
/* MAP PAGE
/* ------------------------------------ */

router.get("/map", eventController.mapPage);

// Admin page
router.get(
  "/admin",
  authController.isLoggedIn,
  catchErrors(adminController.confirmEvents)
);

// Admin
router.post(
  "/admin",
  authController.isLoggedIn,
  adminController.updateEventDisplay
  // catchErrors(eventController.confirmEvents)
);

// Delete all pending events
router.post(
  "/admin/delete-all-pending",
  authController.isLoggedIn,
  adminController.deleteAllPendingEvents
);

/* ------------------------------------ */
/* EVENTBRITE EVENTS
/* ------------------------------------ */

// Get Eventbrite events
router.post(
  "/admin/get-eventbrite-events",
  authController.isLoggedIn,
  catchErrors(adminController.getEventbriteEvents)
);

// router.post("/events/eb", catchErrors(eventController.getEventByEventbriteId));

// Post request to add details to submit form
router.post("/eb/add", catchErrors(eventController.addSingleEventbriteEvent));

// Paginated admin event pages
router.get(
  "/admin/page/:page",
  authController.isLoggedIn,
  catchErrors(adminController.confirmEvents)
);

// Delete all expired events
router.post(
  "/admin/expired-events",
  catchErrors(adminController.deleteExpiredEvents)
);

/* ------------------------------------ */
/* API
/* ------------------------------------ */

router.get("/api/search", catchErrors(eventController.searchEvents));
router.get(
  "/api/search/organisation",
  catchErrors(eventController.searchOrganistaions)
);
router.get("/api/events/near", catchErrors(eventController.mapEvents));

module.exports = router;
