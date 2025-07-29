import scrapeCategory, { fetchCategories } from './scraper.js';

(async () => {
  const categories = await fetchCategories();
  for (const category of categories) {
    console.log(`Scraping ${category.name}...`);
    await scrapeCategory(category.url, category.name);
    console.log(`Done with ${category.name}`);
  }
  process.exit();
})();