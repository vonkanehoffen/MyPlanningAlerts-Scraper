import { initCollection } from "../helpers/initFirebase";
import { firestore } from "firebase-admin";

const whateverRef = initCollection("whatever");

// whateverRef.doc("lorem").set({
//   foo: "bar",
//   moo: {
//     cow: "grass"
//   }
// });
//
// whateverRef.doc("ipsum").set({
//   foo: "bar",
//   moo: {
//     cow: "apples"
//   }
// });
//
// whateverRef.doc("dolor").set({
//   foo: "bar",
//   moo: {
//     cow: "bananas"
//   }
// });

// whateverRef.doc("mockLocation1").set();
// Add a new document with a generated id.
let addDoc = whateverRef
  .add({
    name: "Tokyo",
    country: "Japan",
    timestamp: firestore.Timestamp.now()
  })
  .then(ref => {
    console.log("Added document with ID: ", ref.id);
  });
