// Returns datetime x amount of days from now.
exports.getDatetime = x => {
  let date = new Date();
  if (x !== undefined) {
    date.setDate(date.getDate() + x); // sets future date
  }
  date = date.toISOString().split(".")[0] + "Z"; // remove milliseconds
  return date;
};
