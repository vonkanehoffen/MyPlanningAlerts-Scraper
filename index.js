const _ = require("lodash");
const admin = require("firebase-admin");
const colors = require("colors");
const geokit = require("geokit");
const {
  GeoCollectionReference,
  GeoFirestore,
  GeoQuery,
  GeoQuerySnapshot
} = require("geofirestore");
const serviceAccount = require("./serviceAccountKey.json");
const scrapeManchester = require("./targets/manchester");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

async function doScrape() {
  const data = await scrapeManchester();

  const geofirestore = new GeoFirestore(db);
  const geocollection = geofirestore.collection("planningLocations");

  console.log(`Storing ${data.length + 1} scraped planning applications...`);
  for (let i = 0; i < data.length; i++) {
    const app = data[i];

    const hash = geokit.Geokit.hash({
      lat: app.lat,
      lng: app.lng
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

doScrape();
