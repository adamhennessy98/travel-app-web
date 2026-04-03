/**
 * Generates reliable booking/search URLs from structured trip data.
 * We ignore URLs returned by Claude as they are almost always broken.
 */

/**
 * Skyscanner flight search.
 * date should be "YYYY-MM-DD" — Skyscanner expects "YYMMDD".
 */
export function flightSearchUrl(
  origin: string,
  destination: string,
  date: string
): string {
  const d = new Date(date);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `https://www.skyscanner.net/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${yy}${mm}${dd}/`;
}

/**
 * Booking.com hotel search pre-filled with hotel name and dates.
 */
export function hotelSearchUrl(
  hotelName: string,
  checkin: string,
  checkout: string
): string {
  const params = new URLSearchParams({
    ss: hotelName,
    checkin,
    checkout,
    no_rooms: "1",
    group_adults: "1",
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

/**
 * Google Maps search for an activity in a destination.
 */
export function activitySearchUrl(name: string, destination: string): string {
  const query = destination ? `${name} ${destination}` : name;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}
