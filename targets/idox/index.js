const cheerio = require("cheerio");
const fs = require("fs");
const { promisify } = require("util");
const config = require("../../config");
const fetch = require("node-fetch");
const querystring = require("querystring");
const cookie = require("cookie");
const { URLSearchParams } = require("url");
const { log, error } = require("../../helpers/log");
const dummyResponse = require("../../dummyData/doScrape_full_return_5_jan_2018");
const parseListPage = require("./parseList");

const readFile = promisify(fs.readFile);

let sessionCookie;

/**
 * Start the scrape for an idox powered planning portal
 * @param rootURL
 * @returns {Promise<void>}
 */
async function start(rootURL) {
  const searchFormHTML = await getSearchForm(rootURL);
  const listDate = getLatestListDate(searchFormHTML);
  const weeklyValidatedList = await getWeeklyList(
    rootURL,
    listDate,
    "DC_Validated"
  );
  const detailURLs = getDetailURLs(weeklyValidatedList);

  let planningApps = [];
  for (let i = 0; i < detailURLs.length; i++) {
    const url = new URL(rootURL).origin + detailURLs[i];
    const page = await getApplicationDetail(rootURL, url);
    planningApps.push({
      url,
      ...getDetailFields(page)
    });
  }

  console.log(planningApps);
  // const weeklyDecidedList = await getWeeklyList(listDate, "DC_Decided");
}

/**
 * Fetch the search form HTML
 * Pull the session cookie from the response
 * @param rootURL
 * @returns {Promise<{sessionCookie, searchFormHTML: *}>}
 */
async function getSearchForm(rootURL) {
  const searchFormURL = `${rootURL}/search.do?action=weeklyList&searchType=Application`;
  log(`getSearchForm: ${searchFormURL}`);
  const searchForm = await fetch(searchFormURL, {
    headers: {
      "User-Agent": config.userAgent
    }
  });
  const searchFormHTML = await searchForm.text();
  const cookies = cookie.parse(searchForm.headers.get("set-cookie"));
  sessionCookie = cookie.serialize("JSESSIONID", cookies.JSESSIONID);
  return searchFormHTML;
}

/**
 * Get the dat of the latest weekly list
 * @param searchFormHTML
 * @returns {*|*|*|*|{loc, name, type, value}}
 */
function getLatestListDate(searchFormHTML) {
  const $searchForm = cheerio.load(searchFormHTML);
  return $searchForm("select#week option")
    .first()
    .attr("value");
}

/**
 * Fetch the weekly list HTML
 * @param rootURL
 * @param week
 * @param dateType
 * @returns {Promise<void>}
 */
async function getWeeklyList(rootURL, week, dateType) {
  const params = new URLSearchParams();

  params.append("searchCriteria.ward", "");
  params.append("week", week);
  params.append("dateType", dateType);
  params.append("searchType", "Application");

  const firstPageURL = `${rootURL}/weeklyListResults.do?action=firstPage`;
  log("getWeeklyList: ", firstPageURL);

  const firstPage = await fetch(firstPageURL, {
    method: "POST",
    headers: {
      "User-Agent": config.userAgent,
      Cookie: sessionCookie
    },
    body: params
  });

  return await firstPage.text();
}

/**
 * Get the URLs of the application detail pages from the weekly list
 * @param html
 * @returns {Array}
 */
function getDetailURLs(html) {
  const $ = cheerio.load(html);
  const urls = [];
  $('a[href*="applicationDetails.do"]').each((i, a) => {
    urls.push($(a).attr("href"));
  });
  return urls;
}

/**
 * Get field values from an application detail page
 * @param html
 * @returns {Object}
 */
function getDetailFields(html) {
  const $ = cheerio.load(html);
  const getField = name =>
    $(`th:contains(${name})`)
      .parent()
      .find("td")
      .first()
      .text()
      .trim();
  return {
    reference: getField("Reference"),
    alternativeReference: getField("Alternative Reference"),
    applicationValidated: getField("Application Validated"),
    address: getField("Address"),
    proposal: getField("Proposal"),
    appealStatus: getField("Appeal Status"),
    appealDecision: getField("Appeal Decision")
  };
}

async function getApplicationDetail(url) {
  log(`getApplicationDetail: ${url}`);
  const page = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": config.userAgent,
      Cookie: sessionCookie
    }
  });

  return await page.text();
}

////////////////////////////////////////////old..

async function idox(rootURL) {
  // Testing....
  // return dummyResponse;

  // 1. Get latest week

  const scrapeStartURL = `${rootURL}search.do?action=weeklyList&searchType=Application`;
  log(`Starting scrape from ${scrapeStartURL}`);

  const searchForm = await fetch(scrapeStartURL, {
    headers: {
      "User-Agent": config.userAgent
    }
  });

  const $searchForm = cheerio.load(await searchForm.text());
  const latestDate = $searchForm("select#week option")
    .first()
    .attr("value");
  const cookies = cookie.parse(searchForm.headers.get("set-cookie"));
  console.log("cookies:", cookies);
  if (!latestDate) throw "Unable to scrape latest date";
  log("Scraped latest date: ", latestDate);

  // 2. Get page 1

  const params = new URLSearchParams();

  params.append("searchCriteria.ward", "");
  params.append("week", latestDate);
  // params.append('week', '26 Nov 2018'); // testing
  params.append("dateType", "DC_Validated");
  params.append("searchType", "Application");

  const firstPageURL = `${rootURL}weeklyListResults.do?action=firstPage`;
  log("Scraping first page: ", firstPageURL);

  const firstPage = await fetch(firstPageURL, {
    method: "POST",
    headers: {
      "User-Agent": config.userAgent,
      Cookie: cookie.serialize("JSESSIONID", cookies.JSESSIONID)
    },
    body: params
  });

  // Testing...
  // const firstPageText = await readFile('./input/weeklyListResults-firstPage.do.html', 'utf8')
  // const firstPageText = await readFile(
  //   "./dummyData/weekly-single.html",
  //   "utf8"
  // );
  const $firstPageText = cheerio.load(await firstPage.text());

  // Parse page and get page count
  // const $firstPageText = cheerio.load(await firstPage.text());
  const pageCount = parseInt(
    $firstPageText(".pager .page")
      .last()
      .text()
  );

  // Protect against things getting wild and DOSing the council...
  if (pageCount > 30 || isNaN(pageCount)) {
    throw `Page count is ${pageCount}. Parsing problem?`;
  }
  log(`Total page count: ${pageCount}`);

  // 3. Scrape data from results into object

  let results = parseListPage($firstPageText);

  log(`Parsed ${results.length + 1} results from first page`);

  // Iterate over subsequent pages

  if (pageCount > 1) {
    let pagedSearchResults;

    for (let i = 2; i < pageCount + 1; i++) {
      const nextPage = `${rootURL}pagedSearchResults.do?action=page&searchCriteria.page=${i}`;
      log(`Scraping next page: ${nextPage}`);
      pagedSearchResults = await fetch(nextPage, {
        headers: {
          "User-Agent": config.userAgent,
          Cookie: cookie.serialize("JSESSIONID", cookies.JSESSIONID)
        }
      });

      const pageData = parseListPage(
        cheerio.load(await pagedSearchResults.text())
      );

      log(`Parsed ${pageData.length + 1} results from page ${i}`);

      results = [...results, ...pageData];
    }
  }

  // 4. Geocode all addresses

  if (results.length > 500) {
    throw "Over 500 results to geocode. Has the scrape got carried away?";
  }
  if (results.length < 1) {
    throw "No results to geocode.";
  }

  log(`Geocoding ${results.length + 1} results...`);

  for (let i = 0; i < results.length; i++) {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${querystring.stringify(
        {
          address: results[i].address,
          key: config.geocodingAPIKey
        }
      )}`
    );
    const location = await response.json();
    results[i].geocodeStatus = location.status;

    if (location.status === "OK") {
      log(`Geocoded: ${location.results[0].formatted_address}`);
      results[i].lat = location.results[0].geometry.location.lat;
      results[i].lng = location.results[0].geometry.location.lng;
    } else {
      error(`Geocoding failure for ${results[i].address}. Response:`, location);
    }
  }

  return results;
}

module.exports = start;
