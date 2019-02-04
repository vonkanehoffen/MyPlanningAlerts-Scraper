const cheerio = require('cheerio')
const fs = require('fs')
const { promisify } = require('util')
const config = require('../config')
const fetch = require('node-fetch')
const querystring = require('querystring');
const cookie = require('cookie');
const { URLSearchParams } = require('url');
const dummyResponse = require('../dummyData/doScrape_full_return_5_jan_2018')

const rootURL = 'https://pa.manchester.gov.uk/online-applications/';
// const rootURL = 'https://publicaccess.trafford.gov.uk/online-applications/';

const readFile = promisify(fs.readFile)

/**
 * Scrape data from single page HTML result.
 * eg. https://pa.manchester.gov.uk/online-applications/weeklyListResults.do?action=firstPage
 *  or https://pa.manchester.gov.uk/online-applications/pagedSearchResults.do?action=page&searchCriteria.page=2
 * @param $ - cheerio'd DOM
 * @returns {Array}
 */
function getPageData($) {
  let results = []
  $('#searchresults .searchresult').each((i, r) => {
    const item = {
      title: $(r).find('a').first().text().trim(),
      link: $(r).find('a').first().attr('href'),
      address: $(r).find('.address').text().trim(),
      openForComment: !!$(r).find('.canCommentIndicator').length,
      ref:            $(r).find('.metaInfo').html().match(/Ref. No:([\s\S]*?)<span/)[1].trim(),
      validatedDate:  $(r).find('.metaInfo').html().match(/Validated:([\s\S]*?)<span/)[1].trim(),
      status:         $(r).find('.metaInfo').html().match(/Status:(.*)/s)[1].trim(),
    }
    results.push(item)
  })
  return results
}

module.exports = async function () {

  // Testing....
  // return dummyResponse;

  console.log('Starting Manchester Council scrape...')
  // 1. Get latest week

  const searchForm = await fetch(
    `${rootURL}search.do?action=weeklyList&searchType=Application`, {
      headers: {
        'User-Agent': config.userAgent,
      }
    })

  const $searchForm = cheerio.load(await searchForm.text())
  const latestDate = $searchForm('select#week option').first().attr('value')
  const cookies = cookie.parse(searchForm.headers.get('set-cookie'))
  console.log("Got latests date: ", latestDate)

  // 2. Get page 1

  const params = new URLSearchParams();

  params.append('searchCriteria.ward', '');
  params.append('week', latestDate);
  // params.append('week', '26 Nov 2018');
  params.append('dateType', 'DC_Validated');
  params.append('searchType', 'Application');

  console.log('Getting first page...')
  const firstPage = await fetch(
    `${rootURL}weeklyListResults.do?action=firstPage`,
    {
      method: 'POST',
      headers: {
        'User-Agent': config.userAgent,
        'Cookie': cookie.serialize('JSESSIONID', cookies.JSESSIONID),
      },
      body: params,
    })

  // Testing...
  // const firstPageText = await readFile('./input/weeklyListResults-firstPage.do.html', 'utf8')

  // Parse page and get page count
  const $firstPageText = cheerio.load(await firstPage.text())
  const pageCount = parseInt($firstPageText('.pager .page').last().text())

  // Protect against things getting wild and DOSing the council...
  if(pageCount > 30) {
    console.error(`Page count is ${pageCount}. Parsing problem?`)
    return false
  }
  console.log("Total page count: ", pageCount)

  // 3. Scrape data from results into object

  let results = getPageData($firstPageText)

  console.log(`Parsed ${results.length+1} results from first page`)

  // Iterate over subsequent pages

  if(pageCount > 1) {
    let pagedSearchResults;

    for(let i = 2; i < pageCount + 1; i++) {
      console.log(`Getting page ${i}...`)
      pagedSearchResults = await fetch(
        `${rootURL}pagedSearchResults.do?action=page&searchCriteria.page=${i}`,
        {
          headers: {
            'User-Agent': config.userAgent,
            'Cookie': cookie.serialize('JSESSIONID', cookies.JSESSIONID),
          },
        })

      const pageData = getPageData(cheerio.load(await pagedSearchResults.text()))

      console.log(`Parsed ${pageData.length+1} results from page ${i}`)

      results = [...results, ...pageData]
    }

  }

  // 4. Geocode all addresses

  if(results.length > 500) {
    console.error('Over 500 results to geocode. Has the scrape got carried away?')
    return false;
  }

  console.log(`Geocoding ${results.length+1} results...`)

  for(let i = 0; i < results.length; i++) {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${querystring.stringify({
      address: results[i].address,
      key: config.geocodingAPIKey,
    })}`)
    const location = await response.json()
    results[i].geocodeStatus = location.status

    if(location.status === 'OK') {
      console.log('Geocoded: ', location.results[0].formatted_address)
      results[i].lat = location.results[0].geometry.location.lat;
      results[i].lng = location.results[0].geometry.location.lng;
    } else {
      console.error('Geocode failure:', location)
    }
  }

  return results
}
