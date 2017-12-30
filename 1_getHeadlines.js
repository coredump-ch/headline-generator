const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

const config = require('./0_config');
const headlines = require('./headlines.json');
const searchQueue = new Set();
const searched = new Set(['PART2', '']);
const maximumSearches = config.maximumSearchRequests;

function error(searchTerm) {
  console.error('(Error with ' + searchTerm + ')');
  searched.delete(searchTerm);
  searchQueue.add(searchTerm);
  getNextHeadline();
}


function getRandomSearchTerm() {
  if (!searchQueue.size || searched.size > maximumSearches) {
    return;
  }

  const searchTerms = [...searchQueue.values()];
  const randomIndex = Math.floor(Math.random() * searchTerms.length);
  return searchTerms[randomIndex];
}

function getSearchURL(searchterm) {
  return `${config.searchURLPrefix}${searchterm}${config.searchURLSuffix}`;
}

function getNextHeadline() {
  const searchTerm = getRandomSearchTerm();
  if (!searchTerm) {
    console.log(`finished ${searched.size - 2} searches`);
    return;
  }

  searchQueue.delete(searchTerm);
  if (searched.has(searchTerm)) {
    return getNextHeadline();
  }

  searched.add(searchTerm);
  console.info(`Starting search ${searched.size - 2}/${maximumSearches}:`, searchTerm, `(${searchQueue.size} left in queue)`);
  https.get(getSearchURL(searchTerm), response => {
    console.debug('requested:', searchTerm);
    let data = '';
    response.on('data', chunk => {
      console.debug('receiving data for:', searchTerm);
      data += chunk;
    });
    response.on('end', () => {
      console.debug('collected:', searchTerm);
      const $ = cheerio.load(data);
      $(config.searchPageHeadlineSelector).each((index, element) => {
        const part1 = $(element).find(config.searchPageHeadlinePart1Selector).text().trim();
        const part2 = $(element).find(config.searchPageHeadlinePart2Selector).text().trim();
        let headline = `${part1} PART2 ${part2}`;
        headline = headline.replace(/\n/g, '');
        headline = headline.replace(/ - /g, ' – ');
        headline = headline.replace(/  /g, ' ');
        if (headlines.indexOf(headline) === -1 && headline.indexOf('��') === -1 && headline.indexOf('\t') === -1) {
          headlines.push(headline);
          console.log('New headline:', headline);
        }
        if (searchQueue.size < maximumSearches * 1.2) {
          headline.split(/[- .,?!«»„“":()0-9]/).forEach(term => {
            searchQueue.add(term);
          });
        }
      });
      fs.writeFileSync('headlines.json', JSON.stringify(headlines));
      getNextHeadline();
    });
    response.on('error', error.bind(this, searchTerm));
  }).on('error', error.bind(this, searchTerm));
}

https.get(config.frontPageURL, response => {
  let running = false;
  console.info(`Fetching startpage. Status code ${response.statusCode}`);
  response.on('data', chunk => {
    const result = chunk.toString().match(config.frontPageHeadlineRegex);
    if (result) {
      result.forEach(match => {
        match.split(/title="|[-– .,?!«»„“":()0-9]/).forEach(keyword => {
          if (!searchQueue.has(keyword)) {
            searchQueue.add(keyword);
          }
        });
      });
      if (!running && searchQueue.size) {
        running = true;
        console.info(`Starting with ${searchQueue.size} search terms from front page.`);
        getNextHeadline();
      }
    }
  });
});
