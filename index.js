const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json')
const scrapeManchester = require('./targets/manchester')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({ timestampsInSnapshots: true })

// var docRef = db.collection('users').doc('alovelace');
//
// var setAda = docRef.set({
//   first: 'Ada',
//   last: 'Lovelace three',
//   born: 1815
// });


const docRef = db.collection('planningApps').doc('manc3');

scrapeManchester().then(data => {
  let setData = docRef.set({
    scrape: data,
  })
  console.log(setData)
})