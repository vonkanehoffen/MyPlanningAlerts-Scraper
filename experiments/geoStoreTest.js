import firebase from "firebase-admin";
import geoCollection from "../helpers/geoCollection";

const testGeoCollection = geoCollection("testGeoCollection");

testGeoCollection.add({
  whatever: "Geo thing 2b",
  thing: 100,
  // The coordinates field must be a GeoPoint!
  coordinates: new firebase.firestore.GeoPoint(41.7589, -73.9851)
});
