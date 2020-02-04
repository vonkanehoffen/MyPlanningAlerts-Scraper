import { firestore } from "firebase-admin";
import { initGeoCollection } from "../helpers/initFirebase";

const testGeoCollection = initGeoCollection("testGeoCollection");

testGeoCollection.add({
  whatever: "Geo thing 2b",
  thing: 100,
  // The coordinates field must be a GeoPoint!
  coordinates: new firestore.GeoPoint(41.7589, -73.9851)
});
