const config = require("../config");
const fetch = require("node-fetch");
const querystring = require("querystring");
const { log, error } = require("../helpers/log");

/**
 * Takes a text address and geocode it via google's API
 * @param address
 * @returns {Promise<void>}
 */
async function geocodeAddress(address) {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${querystring.stringify({
      address: address,
      key: config.geocodingAPIKey
    })}`
  );
  const geocode = await response.json();
  log(`geocodeAddress: status=${geocode.status} ${address}`);
  return geocode;
}

/**
 * Batch geocodes a block of results from a scraper.
 * @param results
 * @returns {Promise<*>}
 */
async function geocodeResults(results) {
  for (let i = 0; i < results.length; i++) {
    console.log(result.address);
  }
  // return results.map(async result => {
  //   const location = await geocodeAddress(result.address);
  //   return {
  //     ...result,
  //     location
  //   };
  // });
}

module.exports = { geocodeAddress, geocodeResults };
