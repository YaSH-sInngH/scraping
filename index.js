import scrapeCategory from './scraper.js';
import categories from './categories.js';

(async () => {
  for (const category of categories) {
    console.log(`Scraping ${category.name}...`);
    await scrapeCategory(category.url, category.name);
    console.log(`Done with ${category.name}`);
  }
  process.exit();
})();