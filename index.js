import scrapeCategory, { fetchCategories } from './scraper.js';
import connectDB from './db.js';

async function main() {
  try {
    await connectDB();

    const categories = await fetchCategories();

    for (const category of categories) {
      console.log(`Scraping ${category.name}...`);
      await scrapeCategory(category.url, category.name);
      console.log(`Done with ${category.name}`);
    }

    console.log("All categories scraped successfully.");
    process.exit(0);
  } catch (error) {
    console.error("An error occurred during execution:", error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

main();