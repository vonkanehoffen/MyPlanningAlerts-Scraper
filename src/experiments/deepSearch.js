import { initCollection } from "../helpers/initFirebase";
import { firestore } from "firebase-admin";

const planningLocations = initCollection("planningLocations");
const whateverRef = initCollection("whatever");

// works!
// const query = whateverRef
//   .where(new firestore.FieldPath("moo", "cow"), "==", "bananas")

// Also works
const query = whateverRef.where("moo.cow", "==", "bananas");

// Doesn't work cos can't query array like that
// https://firebase.google.com/docs/firestore/query-data/queries?authuser=0#in_and_array-contains-any
// const query = planningLocations
//   .where("d.apps[0].alternativeReference", "==", "PP-08171096")

  .get()
  .then(snapshot => {
    if (snapshot.empty) {
      console.log("No matching documents.");
      return;
    }

    snapshot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
  })
  .catch(err => {
    console.log("Error getting documents", err);
  });
