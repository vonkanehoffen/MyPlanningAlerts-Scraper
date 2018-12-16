const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json')
const scrapeManchester = require('./targets/manchester')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({ timestampsInSnapshots: true })

const batch = db.batch()

scrapeManchester().then(data => {
  data.forEach(app => {
    const id = app.ref.replace(/\W/g, '') // remove any non-alphanumeric characters - not allowed for Firestore keys
    console.log(`Adding app ${id}`)
    const docRef = db.collection('planningApps').doc(id)
    batch.set(docRef, app)
  })
  batch.commit().then(response => console.log(`Commit response: ${JSON.stringify(response, null, 2)}`))
})