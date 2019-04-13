const _ = require("lodash");
const admin = require("firebase-admin");
const geokit = require("geokit");
const { log, error } = require("../helpers/log");

/**
 * Iterate over an array of planning app data
 * Geocode the locations and add or update records against them
 * @param data
 * @param geocollection
 * @returns {Promise<void>}
 */
async function storeInGeoFirestore(data, geocollection) {
  log(`Storing ${data.length} scraped planning applications...`);
  for (let i = 0; i < data.length; i++) {
    const app = data[i];

    // If geocoding failed, don't store the result.
    const location = _.get(app, "geocode.results[0].geometry.location");
    if (!location) break;

    // Generate a hash. This will be the key for the record
    const hash = geokit.Geokit.hash({
      lat: location.lat,
      lng: location.lng
    });
    const coordinates = new admin.firestore.GeoPoint(app.lat, app.lng);

    // const id = data[i].ref.replace(/\W/g, '') // remove any non-alphanumeric characters - not allowed for Firestore keys
    const doc = await geocollection.doc(hash).get();

    if (doc.exists) {
      const apps = doc.data().apps;
      console.log(`Update app ${hash} - ${app.address}`);
      // console.log(`Existing apps: ${JSON.stringify(apps, null, 2)}`);
      apps.push(app);

      const newApps = _.uniqWith(apps, (a, b) => a.ref === b.ref);

      await geocollection.doc(hash).set({
        apps: newApps,
        coordinates
      });
    } else {
      console.log(`Add app ${hash} - ${app.address}`);
      await geocollection.doc(hash).set({
        apps: [app],
        coordinates
      });
    }
  }
}

module.exports = storeInGeoFirestore;
