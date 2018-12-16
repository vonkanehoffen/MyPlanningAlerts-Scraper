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
    const doc = db.collection('planningApps').doc(id)
    // if(doc.exists()) {
      console.log(`Updating app ${id}`)
      batch.update(doc, app)
    // } else {
    //   console.log(`Adding app ${id}`)
    //   batch.set(doc, app)
    // }
  })
  batch.commit().then(response => console.log(`Commit response: ${JSON.stringify(response, null, 2)}`))
})