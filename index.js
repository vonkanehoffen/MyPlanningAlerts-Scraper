const _ = require("lodash");
const admin = require("firebase-admin");
const colors = require("colors");
const {
  GeoCollectionReference,
  GeoFirestore,
  GeoQuery,
  GeoQuerySnapshot
} = require("geofirestore");
const serviceAccount = require("./serviceAccountKey.json");
const scrapeIdox = require("./targets/idox/");
const storeInGeoFirestore = require("./targets/storeInGeoFirestore");
const { log, error } = require("./helpers/log");

const fs = require("fs");
const { promisify } = require("util");
const readFile = promisify(fs.readFile);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  var db = admin.firestore();
  db.settings({ timestampsInSnapshots: true });

  async function doScrape() {
    // Think all these use "idox": http://www.idoxgroup.com/
    // const rootURL = "https://pa.manchester.gov.uk/online-applications";
    // const rootURL = "https://publicaccess.trafford.gov.uk/online-applications";
    // const rootURL = "https://www.planningpa.bolton.gov.uk/online-applications-17";
    // const rootURL = "https://planning.bury.gov.uk/online-applications";
    // const rootURL = "http://planningpa.oldham.gov.uk/online-applications";
    // const rootURL = "http://publicaccess.rochdale.gov.uk/online-applications";

    const data = await scrapeIdox(
      "http://publicaccess.rochdale.gov.uk/online-applications"
    );

    console.log(data);
    // Testing...
    // let data = await readFile(
    //   "./dummyData/runOutputs/rochdale1.json",
    //   "utf8"
    // );
    //
    // data = await(geocodeResults)
    return;

    // const geofirestore = new GeoFirestore(db);
    // const geocollection = geofirestore.collection("planningLocations");
    //
    // await storeInGeoFirestore(data, geocollection);
  }

  doScrape();
} catch (e) {
  error(e);
}
