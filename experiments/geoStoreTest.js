import firebase from "firebase-admin";
import { GeoFirestore } from "geofirestore";
import config from "../config";

firebase.initializeApp({
  credential: firebase.credential.cert(config.serviceAccountKey)
});

const firestore = firebase.firestore();
const geofirestore = new GeoFirestore(firestore);
const geocollection = geofirestore.collection("testGeoCollection");

geocollection.add({
  whatever: "Geo thing",
  thing: 100,
  // The coordinates field must be a GeoPoint!
  coordinates: new firebase.firestore.GeoPoint(40.7589, -73.9851)
});
