const cheerio = require("cheerio");
const config = require("../../config");
const fetch = require("node-fetch");
const cookie = require("cookie");
const { URLSearchParams } = require("url");
const { log, error } = require("../../helpers/log");

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
  let planningApps = await getAllApplicationDetails(rootURL, detailURLs);
  let nextURL = getNextURL(weeklyValidatedList);
  while (nextURL) {
    const nextPage = await getPage(nextURL, rootURL);
    const detailURLs = getDetailURLs(nextPage);
    let apps = await getAllApplicationDetails(rootURL, detailURLs);
    planningApps.push(...apps);
    nextURL = getNextURL(nextPage);
  }

  console.log(planningApps);
  // TODO: Decided list
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

/**
 * Fetch a page (with session cookie set)
 * @param rootURL
 * @param url
 * @returns {Promise<*>}
 */
async function getPage(url, rootURL) {
  // Check it's absolute and correct if not...
  // Pagination URLs come both ways?!
  try {
    new URL(url);
  } catch (e) {
    url = new URL(rootURL).origin + url;
  }
  log(`getPage: ${url}`);
  const page = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": config.userAgent,
      Cookie: sessionCookie
    }
  });

  return await page.text();
}

/**
 * Loop through an array of detail page URLs
 * @param rootURL
 * @param detailURLs
 * @returns {Promise<Array>}
 */
async function getAllApplicationDetails(rootURL, detailURLs) {
  let planningApps = [];
  for (let i = 0; i < detailURLs.length; i++) {
    const url = new URL(rootURL).origin + detailURLs[i];
    const page = await getPage(url, rootURL);
    planningApps.push({
      url,
      ...getDetailFields(page)
    });
  }
  return planningApps;
}

/**
 * Get the pagination "next page" URL if it exists.
 * @param html
 * @returns {*}
 */
function getNextURL(html) {
  const $ = cheerio.load(html);
  return $(".pager .next").attr("href");
}

module.exports = start;
