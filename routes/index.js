const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const adminController = require("../controllers/adminController");
const { catchErrors } = require("../handlers/errorHandlers");

// Add an event page
router.get("/add", authController.isLoggedIn, eventController.addEvent);

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

// Login page
router.get("/login", userController.loginForm);

// Login request
router.post("/login", authController.login);

// Register page
router.get("/register", userController.registerForm);

// Register request
router.post(
  "/register",
  userController.validateRegister,
  userController.register,
  authController.login
);

// Log out
router.get("/logout", authController.logout);

// Account page
router.get("/account", authController.isLoggedIn, userController.account);

// Password Reset page
router.get("/password-reset", authController.passwordReset);

// Password reset DELETE THIS IF ALL IS WORKING FINE
router.get("/account/reset/:token", catchErrors(authController.reset));

// Password reset request
router.post("/account/forgot", catchErrors(authController.forgot));

// Password token
router.post(
  "/account/reset/:token",
  authController.confirmedPasswords,
  catchErrors(authController.update)
);

// Update account details
router.post(
  "/account",
  // eventController.upload,
  // catchErrors(eventController.resize),
  catchErrors(userController.updateAccount)
);

// Delete account
router.post("/delete", catchErrors(userController.deleteAccount));

// Map page
router.get("/", eventController.mapPage);

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

// Get Eventbrite events
router.post(
  "/admin/get-eventbrite-events",
  authController.isLoggedIn,
  catchErrors(adminController.getEventbriteEvents)
);

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

// API
router.get("/api/search", catchErrors(eventController.searchEvents));
router.get(
  "/api/search/organisation",
  catchErrors(eventController.searchOrganistaions)
);
router.get("/api/events/near", catchErrors(eventController.mapEvents));

// My Events for log in users
router.get("/my-events", catchErrors(userController.getUserEvents));
router.post("/my-events", catchErrors(eventController.addEventBriteEvents));

module.exports = router;
