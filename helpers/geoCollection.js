import firebase from "firebase-admin";
import { GeoFirestore } from "geofirestore";
import config from "../config";

firebase.initializeApp({
  credential: firebase.credential.cert(config.serviceAccountKey)
});

export default function geoCollection(collectionPath) {
  const firestore = firebase.firestore();
  const geoFirestore = new GeoFirestore(firestore);
  return geoFirestore.collection(collectionPath);
}
