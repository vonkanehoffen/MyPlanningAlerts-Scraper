const _ = require("lodash");
const firestore = require("firebase-admin").firestore;
const geokit = require("geokit");
const config = require("../config");
const { geocodeAddress } = require("../targets/geocoding");
const logger = require("../logger");

/**
 * Add planning data to a GeoFirestore collection
 * @param data
 * @param geocollection
 * @returns {Promise<void>}
 */
async function storeInGeoFirestore(data, geocollection) {
  if (data.length > config.itemLimit) {
    logger.error(`More than ${config.itemLimit} results to store. Aborting.`);
    return;
  }

  logger.info(`Storing ${data.length} scraped planning applications...`);
  for (let i = 0; i < data.length; i++) {
    let app = data[i];

    const geocode = await geocodeAddress(app.address);
    app.geocodeStatus = geocode.status;
    const location = _.get(geocode, "results[0].geometry.location");

    if (!location) {
      logger.error("App not geocoded. Unable to store", { app });
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
      // Let's add this new one or update an existing one if we find a matching reference no.
      let apps = geoDoc.data().apps;
      logger.info("Update location", { hash, app });

      const existingAppIndex = apps.findIndex(
        a => a.reference === app.reference
      );
      if (existingAppIndex > -1) {
        apps[existingAppIndex] = app;
      } else {
        apps.push(app);
      }

      await geocollection.doc(hash).update({
        updatedAt: firestore.FieldValue.serverTimestamp(),
        apps,
        coordinates
      });
    } else {
      // This is a new location.
      // Add the app to it.
      logger.info("Add location", { hash, app });
      await geocollection.doc(hash).set({
        createdAt: firestore.FieldValue.serverTimestamp(),
        apps: [app],
        coordinates
      });
    }
  }
}

module.exports = storeInGeoFirestore;
