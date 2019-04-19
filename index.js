const admin = require("firebase-admin");
const { GeoFirestore } = require("geofirestore");
const serviceAccount = require("./serviceAccountKey.json");
const scrapeIdox = require("./targets/idox/");
const storeInGeoFirestore = require("./targets/storeInGeoFirestore");
const logger = require("./logger");
const config = require("./config");
// const Sentry = require("@sentry/node");
// Sentry.init({ dsn: config.sentryDSN, debug: true });

async function doScrape() {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    const db = admin.firestore();
    db.settings({ timestampsInSnapshots: true });
    const geofirestore = new GeoFirestore(db);
    const geocollection = geofirestore.collection("planningLocations");

    // Think all these use "idox": http://www.idoxgroup.com/
    const idoxSites = [
      "https://pa.manchester.gov.uk/online-applications",
      "https://publicaccess.trafford.gov.uk/online-applications",
      "https://www.planningpa.bolton.gov.uk/online-applications-17",
      "https://planning.bury.gov.uk/online-applications",
      "http://planningpa.oldham.gov.uk/online-applications",
      "http://publicaccess.rochdale.gov.uk/online-applications"
    ];

    for (let i = 0; i < idoxSites.length; i++) {
      const data = await scrapeIdox(idoxSites[i]);
      await storeInGeoFirestore(data, geocollection);
    }
  } catch (e) {
    logger.error(e);
  }
}

doScrape();
