# MyPlanningAlerts Scraper
## Data acquisition for MyPlanningAlerts app.

Scrapes data from local councils' weekly planning lists.

You'd have thought here would be an API already, but apparently not... except this one: https://www.landinsight.io/api that costs £45 a month.

Hence this.

Create `config.js` using the format in `config.example.js` and you're good to go.

Tested on Node v10.4.1.

Deploy with [PM2](https://pm2.io/), configured in `ecosystem.config.js`. `pm2 start` sets a cron job up to run things weekly.

Logs stored in `log/` with winston. JSON format. Best viewed with something like [json-log-viewer](https://www.npmjs.com/package/json-log-viewer) I think. `jv logs/combined.log`

Also posts warn level log messages to Slack channel. See hook in config.
 
## Data Structure

### Council Websites (idox)



### Firebase
Three tables:

 - planningAppsCurrent - GeoFirestore
 - planningAppsArchive - GeoFirestore
 - planningAppsScrapeErrors


Location: {
    apps:{
        [appId]: {
            appName
            expiryDate
            ...
        },
        ...
    ],
    address
]

archiveOld()

searches all locations for expired planning apps 
  - moves them from current to archive
  - removes empty locations from current.

planningAppsCurrent deals with day to day searches from the app
planningAppsArchive we'll use later for whatever historical things we might want to find out.

planningAppsScrapeErrors stores data there's been a problem geocoding etc. Un-codable addresses. Stores html 
