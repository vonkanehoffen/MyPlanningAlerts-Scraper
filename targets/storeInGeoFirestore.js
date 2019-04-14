const _ = require("lodash");
const firestore = require("firebase-admin").firestore;
const geokit = require("geokit");
const { log, error } = require("../helpers/log");
const config = require("../config");

/**
 * Add planning data to a GeoFirestore collection
 * @param data
 * @param geocollection
 * @returns {Promise<void>}
 */
async function storeInGeoFirestore(data, geocollection) {
  if (data.length > config.itemLimit) {
    error(`More than ${config.itemLimit} results to store. Aborting.`);
    return;
  }

  log(`Storing ${data.length} scraped planning applications...`);
  for (let i = 0; i < data.length; i++) {
    let app = data[i];

    // If geocoding failed, don't store the result.
    const location = _.get(app, "geocode.results[0].geometry.location");
    if (!location) {
      error("App not geocoded. Unable to store:", app);
      continue;
    }

    // Generate a hash for the location
    const hash = geokit.Geokit.hash({
      lat: location.lat,
      lng: location.lng
    });
    const coordinates = new firestore.GeoPoint(location.lat, location.lng);

    const geoDoc = await geocollection.doc(hash).get();

    if (geoDoc.exists) {
      // This location already has planning apps.
      // Let's add this new one and remove any old version of it with uniq.
      const apps = geoDoc.data().apps;
      log(`Update location - hash: ${hash} - planning ref: ${app.reference}`);
      apps.push(app);
      const newApps = _.uniqWith(apps, (a, b) => a.reference === b.reference);

      await geocollection.doc(hash).update({
        updatedAt: firestore.FieldValue.serverTimestamp(),
        apps: newApps,
        coordinates
      });
    } else {
      // This is a new location.
      // Add the app to it.
      log(`Add location - hash: ${hash} - planning ref: ${app.reference}`);
      await geocollection.doc(hash).set({
        createdAt: firestore.FieldValue.serverTimestamp(),
        apps: [app],
        coordinates
      });
    }
  }
}

module.exports = storeInGeoFirestore;
