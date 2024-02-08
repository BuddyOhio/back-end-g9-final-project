export function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}
export function addDays(d, days) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}
