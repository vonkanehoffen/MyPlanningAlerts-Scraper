const admin = require('firebase-admin');
const colors = require('colors')
const serviceAccount = require('./serviceAccountKey.json')
const scrapeManchester = require('./targets/manchester')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

var db = admin.firestore();
db.settings({ timestampsInSnapshots: true })


async function doScrape() {
  const data = await scrapeManchester();
  const batch = db.batch()

  console.log(`Storing ${data.length+1} scraped planning applications...`)
  for(let i = 0; i < data.length; i++) {
    const id = data[i].ref.replace(/\W/g, '') // remove any non-alphanumeric characters - not allowed for Firestore keys
    const docRef = db.collection('planningApps').doc(id)
    const doc = await docRef.get()

    if(doc.exists) {
      console.log(`Batch: Update app ${id}`)
      batch.update(docRef, data[i])
    } else {
      console.log(`Batch: Add app ${id}`)
      batch.set(docRef, data[i])
    }
  }

  console.log('Writing batch...')
  const commitRes = await batch.commit()
  if(commitRes) console.log('Commit OK.'.green)

}

doScrape()
