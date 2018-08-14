module.exports = {
  frontPageURL: 'https://www.example.com/',
  frontPageHeadlineRegex: /title="(.+?)"/g,
  searchURLPrefix: 'https://www.example.com/suche/?q=',
  searchURLSuffix: '&sort=recs-publishtime',
  maximumSearchRequests: 1000,
  searchPageHeadlineSelector: 'a.news-links',
  searchPageHeadlinePart1Selector: 'strong',
  searchPageHeadlinePart2Selector: 'span',
};
