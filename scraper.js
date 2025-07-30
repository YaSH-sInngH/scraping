import puppeteer from 'puppeteer';
import { getProductModel } from './models/Product.js';
import connectDB from './db.js';
import fs from 'fs';
import path from 'path';
import { closeLoginPopup } from './scraper-utils/closeLogin.js';
import { cleanupCategoryUrls } from './scraper-utils/cleanupCategoryUrls.js';
import {extractCategoriesFromPage} from './scraper-utils/extractCategoriesFromPage.js';

const SPECIAL_CASE_CATEGORIES = new Set([
  "Men Clothing",
  "Women Clothing",
  "Home & Kitchen",
  "Appliances"
]);
// Function to detect pagination type
async function detectPaginationType(page) {
  const paginationInfo = await page.evaluate(() => {
    // Check for traditional pagination
    const paginationElements = document.querySelectorAll('a[href*="page="], a[rel="next"]');
    
    // Check for buttons with "Next" text
    const nextButtons = Array.from(document.querySelectorAll('button, a, span')).filter(el => 
      el.textContent && el.textContent.toLowerCase().includes('next')
    );
    
    if (paginationElements.length > 0 || nextButtons.length > 0) {
      return { type: 'traditional', elements: paginationElements.length + nextButtons.length };
    }
    
    // Check for infinite scroll indicators
    const loadMoreElements = Array.from(document.querySelectorAll('button, div')).filter(el => 
      el.textContent && (
        el.textContent.toLowerCase().includes('load more') ||
        el.textContent.toLowerCase().includes('loading') ||
        el.classList.contains('infinite-scroll')
      )
    );
    
    if (loadMoreElements.length > 0) {
      return { type: 'infinite-scroll', elements: loadMoreElements.length };
    }
    
    // Check for "View All" or similar buttons
    const viewAllElements = Array.from(document.querySelectorAll('a, button')).filter(el => 
      el.textContent && (
        el.textContent.toLowerCase().includes('view all') ||
        el.textContent.toLowerCase().includes('see all')
      )
    );
    
    if (viewAllElements.length > 0) {
      return { type: 'view-all', elements: viewAllElements.length };
    }
    
    return { type: 'unknown', elements: 0 };
  });
  
  console.log(`Pagination type detected: ${paginationInfo.type} (${paginationInfo.elements} elements)`);
  return paginationInfo;
}

// Function to find working selectors dynamically
async function findWorkingSelectors(page, categoryName) {
  console.log(`Analyzing page structure for ${categoryName}...`);
  
  const commonSelectors = [
    'div[data-id]',
    'a[href*="/p/"]',
    'div._1AtVbE',
    'div.cPHDOP',
    'a.CGtC98',
    'div._1sdMkc',
    'div.slAVV4.qt3Pmj' // Keep this specific selector
  ];

  const foundSelectors = await page.evaluate((selectors) => {
    const results = {};
    // Prioritize data-id if present and has products, as it's a common and reliable fallback
    const dataIdElements = document.querySelectorAll('div[data-id]');
    if (dataIdElements.length > 5) { 
      results['div[data-id]'] = dataIdElements.length;
    }

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        results[selector] = elements.length;
      }
    });
    return results;
  }, commonSelectors);

  console.log('Found selectors:', foundSelectors);
  
  // Find the most common product card selector
  let bestCardSelector = 'div[data-id]'; // Default fallback
  let maxCount = 0;
  
  for (const [selector, count] of Object.entries(foundSelectors)) {
    if (count > maxCount && count > 5) { // At least 5 products
      maxCount = count;
      bestCardSelector = selector;
    }
  }

  return bestCardSelector;
}

// Function to handle infinite scroll
async function handleInfiniteScroll(page, maxScrolls = 10) {
  console.log('Handling infinite scroll...');
  let scrollCount = 0;
  let previousProductCount = 0;
  
  while (scrollCount < maxScrolls) {
    // Get current product count, preferring data-id as a robust product card identifier
    const currentProductCount = await page.evaluate(() => {
      return document.querySelectorAll('div[data-id]').length;  // Line 110
    });
    
    console.log(`Scroll ${scrollCount + 1}: Found ${currentProductCount} products`);
    
    // Scroll to bottom
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for new content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if new products were loaded
    const newProductCount = await page.evaluate(() => {
      return document.querySelectorAll('div[data-tkid]').length;  // Line 124
    });
    
    if (newProductCount === currentProductCount && currentProductCount === previousProductCount) {
      console.log('No new products loaded, stopping infinite scroll');
      break;
    }
    
    previousProductCount = currentProductCount;
    scrollCount++;
  }
  
  console.log(`Infinite scroll completed after ${scrollCount} scrolls`);
}

async function getHardcodedCategories(categoryObject) {
  const fallbacks = {
    'Fashion': 'https://www.flipkart.com/clothing-and-accessories/pr?sid=clo',
    'Electronics': 'https://www.flipkart.com/electronics-store',
    'Home & Furniture': 'https://www.flipkart.com/home-furnishing/pr?sid=jra',
    'Beauty, Food..': 'https://www.flipkart.com/beauty-and-grooming/pr?sid=g9b',
  };

  for (const [key, fallbackUrl] of Object.entries(fallbacks)) {
    if (categoryObject[key] && !categoryObject[key].url) {
      categoryObject[key].url = fallbackUrl;
    }
  }
}
export async function fetchCategories() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  );

  const filePath = path.resolve('dynamicCategoryMapping.json');
  let categoryObject = {};

  try {
    console.log('Navigating to Flipkart homepage to fetch categories...');
    await page.goto('https://www.flipkart.com', { waitUntil: 'networkidle2', timeout: 30000 });

    await closeLoginPopup(page);

    const categories = await extractCategoriesFromPage(page);

    // Build object
    categories.forEach(category => {
      categoryObject[category.name] = category;
    });

    getHardcodedCategories(categoryObject);
    cleanupCategoryUrls(categoryObject);

    fs.writeFileSync(filePath, JSON.stringify(categoryObject, null, 2));
    console.log(`✅ ${Object.keys(categoryObject).length} categories scraped and saved to ${filePath}`);
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await browser.close();
  }

  return Object.values(categoryObject);
}
export default async function scrapeCategory(categoryUrl, categoryName) {
  try {
  await connectDB();
} catch (err) {
  console.error('DB connection failed, aborting scrape.');
  return;
}
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const Product = getProductModel(categoryName);

  let currentPage = 1;
  let hasNextPage = true;
  let totalProductsScraped = 0;
  const maxPages = 50; // Safety limit to prevent infinite loops
  
  // Load selectors from the file, or use a default empty object
  let categorySelectors = {};
  try {
    const data = fs.readFileSync(path.resolve('categorySelectors.json'), 'utf-8');
    categorySelectors = JSON.parse(data);
  } catch (error) {
    console.log('categorySelectors.json not found, using default selectors. Run `npm run find-selectors` to generate it.');
  }

  let { card, title, price, rating, specialCase, fallbackCard } = categorySelectors[categoryName] || {};

  const subCategoryMappingPath = path.resolve('dynamicSubCategoryMapping.json');
  let dynamicSubCategoryMapping = {};
  try {
    dynamicSubCategoryMapping = JSON.parse(fs.readFileSync(subCategoryMappingPath, 'utf-8'));
  } catch (error) {
    console.log('dynamicSubCategoryMapping.json not found. It will be created.');
  }

  try {
    // Scrape subcategories first
    await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    // Close login popup if present
    try {
      await page.waitForSelector('button._2KpZ6l._2doB4z', { timeout: 5000 });
      await page.click('button._2KpZ6l._2doB4z');
      console.log('Closed login popup');
    } catch (e) {
      // No popup found, continue
    }

    const subcategories = await page.evaluate(() => {
      let links = Array.from(document.querySelectorAll('section.Iu4qXa a.uWfXeF, section.Iu4qXa a.hEjLuS.WyLc0s'));
      if (links.length === 0) {
        links = Array.from(document.querySelectorAll('a[title][href*="pr?sid="]'));
      }
      return links.map(a => ({
        name: a.getAttribute('title') || a.textContent.trim(),
        url: a.href
      })).filter(sub => sub.name && sub.url);
    });

    if (subcategories.length > 0) {
      console.log(`Found ${subcategories.length} subcategories for ${categoryName}.`);
      dynamicSubCategoryMapping[categoryName] = subcategories;
      fs.writeFileSync(subCategoryMappingPath, JSON.stringify(dynamicSubCategoryMapping, null, 2));

      for (const sub of subcategories) {
        console.log(`Scraping subcategory: ${sub.name} from ${sub.url}`);
        // Recursively call scrapeCategory for subcategories, or a dedicated product scraper
        await scrapeProductsForUrl(sub.url, sub.name, Product, page, categorySelectors);
      }
    } else {
      console.log(`No subcategories found for ${categoryName}, scraping products directly.`);
      dynamicSubCategoryMapping[categoryName] = []; // Ensure the category has an entry even if no subcategories
      fs.writeFileSync(subCategoryMappingPath, JSON.stringify(dynamicSubCategoryMapping, null, 2));
      await scrapeProductsForUrl(categoryUrl, categoryName, Product, page, categorySelectors);
    }

    console.log(`\n=== ${categoryName} Scraping Complete ===`);
    console.log(`Total pages scraped: ${currentPage - 1}`); // This will be inaccurate if subcategories are scraped
    console.log(`Total products scraped: ${totalProductsScraped}`); // This will also be inaccurate
    console.log(`==========================================\n`);

  } catch (error) {
    console.error(`Error scraping ${categoryName}:`, error.message);
  } finally {
    await browser.close();
  }
}

async function scrapeProductsForUrl(url, name, ProductModel, page, categorySelectors) {
  let currentPage = 1;
  let hasNextPage = true;
  let productsScrapedCount = 0;
  const maxPages = 50; // Safety limit
  
  let { card, title, price, rating, specialCase, fallbackCard } = categorySelectors[name] || {};

  while (hasNextPage && currentPage <= maxPages) {
    const pageUrl = `${url}&page=${currentPage}`;
    console.log(`Navigating to ${pageUrl}`);
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Close login popup if present
    try {
      await page.waitForSelector('button._2KpZ6l._2doB4z', { timeout: 5000 });
      await page.click('button._2KpZ6l._2doB4z');
      console.log('Closed login popup');
    } catch (e) {
      // No popup found, continue
    }

    const paginationType = await detectPaginationType(page);

    if (paginationType.type === 'infinite-scroll') {
      await handleInfiniteScroll(page);
    } else {
      let previousHeight;
      do {
        previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await new Promise(res => setTimeout(res, 1000));
      } while (
        await page.evaluate('document.body.scrollHeight') > previousHeight
      );
    }

    let cardSelector = card;
    try {
      await page.waitForSelector(card, { timeout: 10000 });
    } catch (e) {
      console.log(`Default selector '${card}' not found, trying fallback...`);
      if (!specialCase) {
        cardSelector = await findWorkingSelectors(page, name);
      }
      console.log(`Using fallback selector: ${cardSelector}`);
    }

    let products = [];

    try {
      if (SPECIAL_CASE_CATEGORIES.has(name)) {
        products = await page.evaluate((categoryCardSelector) => {
          const rows = Array.from(document.querySelectorAll('div.cPHDOP.col-12-12'));
          let allProducts = [];
          for (const row of rows) {
            const cards = Array.from(row.querySelectorAll(categoryCardSelector));
            for (const card of cards) {
              const titleEl = card.querySelector('a.WKTcLC, a.wjcEIp');
              const title = titleEl?.innerText?.trim() || '';
              const priceEl = card.querySelector('div.Nx9bqj');
              const price = priceEl?.innerText?.trim() || '';
              const ratingEl = card.querySelector('div.XQDdHH');
              const rating = ratingEl?.innerText?.trim() || '';
              let url = '';
              if (categoryCardSelector === 'div.slAVV4.qt3Pmj') {
                const urlEl = card.querySelector('a.VJA3rP');
                url = urlEl?.getAttribute('href') || '';
              } else {
                url = titleEl?.getAttribute('href') || '';
              }

              if (url && !url.startsWith('http')) {
                url = 'https://www.flipkart.com' + url;
              }
              if (title && price) {
                allProducts.push({ title, price, rating, url });
              }
            }
          }
          return allProducts;
        }, cardSelector);
      } else if (specialCase) {
        products = await page.evaluate(({ cardSelector, title, price, rating }) => {
          const cards = Array.from(document.querySelectorAll(cardSelector));
          return cards.map(cardEl => {
            const titleEl = cardEl.querySelector(title);
            const titleText = titleEl?.innerText?.trim() || '';
            const priceText = cardEl.querySelector(price)?.innerText?.trim() || '';
            const ratingText = cardEl.querySelector(rating)?.innerText?.trim() || '';
            let url = titleEl?.getAttribute('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.flipkart.com' + url;
            }
            return { title: titleText, price: priceText, rating: ratingText, url };
          }).filter(p => p.title && p.price);
        }, { cardSelector, title, price, rating });
      } else {
        products = await page.evaluate(({ cardSelector, title, price, rating }) => {
          const cards = Array.from(document.querySelectorAll(cardSelector));
          return cards.map(cardEl => {
            const titleText = cardEl.querySelector(title)?.innerText?.trim() || '';
            const priceText = cardEl.querySelector(price)?.innerText?.trim() || '';
            const ratingText = cardEl.querySelector(rating)?.innerText?.trim() || '';
            let url = cardEl.getAttribute('href') || cardEl.href || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.flipkart.com' + url;
            }
            return { title: titleText, price: priceText, rating: ratingText, url };
          }).filter(p => p.title && p.price);
        }, { cardSelector, title, price, rating });
      }

      if (products.length === 0) {
        console.log('No products found with specific selectors, trying generic approach...');
        products = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('div[data-id], div[data-tkid]'));
          return cards.map(cardEl => {
            const titleEl = cardEl.querySelector('a.WKTcLC, a.wjcEIp, div.KzDlHZ, a[title]') || cardEl;
            const titleText = titleEl?.innerText?.trim() || titleEl?.getAttribute('title') || '';
            const priceEl = cardEl.querySelector('div.Nx9bqj, div._30jeq3, div._1_WHN1');
            const priceText = priceEl?.innerText?.trim() || '';
            const ratingEl = cardEl.querySelector('div.XQDdHH, div._3LWZlK, span._2_R_DZ');
            const ratingText = ratingEl?.innerText?.trim() || '';
            let url = '';
            if (titleEl && titleEl.tagName === 'A') {
              url = titleEl.getAttribute('href') || '';
            } else {
              const linkEl = cardEl.querySelector('a[href*="/p/"]');
              url = linkEl?.getAttribute('href') || '';
            }
            if (url && !url.startsWith('http')) {
              url = 'https://www.flipkart.com' + url;
            }
            return { title: titleText, price: priceText, rating: ratingText, url };
          }).filter(p => p.title && p.price);
        });
      }

    } catch (error) {
      console.error(`Error scraping products for ${name}:`, error.message);
      products = [];
    }

    console.log(`Scraped ${products.length} products from page ${currentPage} of ${name}`);

    if (products.length > 0) {
      console.log('Sample products:');
      console.log(products.slice(0, 3));

    try {
        const productsWithMetadata = products.map(product => ({
          ...product,
          category: name,
          scrapedAt: new Date()
        }));

        const result = await ProductModel.insertMany(productsWithMetadata, { ordered: false });

        console.log(`✅ Saved ${result.length} products for category "${name}".`);
      } catch (error) {
        console.error('❌ Error during batch insert:', error.message);

        if (error.writeErrors?.length) {
          console.error(`⚠️ Skipped ${error.writeErrors.length} products due to validation or duplication errors.`);
        }
      }
    } else {
      console.log(`No products found for ${name} on page ${currentPage}`);
    }

    hasNextPage = await page.evaluate(() => {
      const validSelectors = [
        'a._1LKTO3[rel="next"]',
        'a[rel="next"]',
        'a[aria-label="Next"]',
        'a[href*="page="]'
      ];

      for (const selector of validSelectors) {
        try {
          const element = document.querySelector(selector);
          if (element && element.offsetParent !== null) {
            return true;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      const nextElements = Array.from(document.querySelectorAll('a, button, span')).filter(el =>
        el.textContent && el.textContent.toLowerCase().includes('next') && el.offsetParent !== null
      );

      if (nextElements.length > 0) {
        return true;
      }

      const paginationText = document.body.innerText;
      const pageMatches = paginationText.match(/Page \d+ of (\d+)/i) ||
                         paginationText.match(/(\d+) pages?/i) ||
                         paginationText.match(/showing \d+-\d+ of (\d+)/i);

      if (pageMatches) {
        const totalPages = parseInt(pageMatches[1]);
        const currentPageMatch = paginationText.match(/Page (\d+)/i);
        const currentPageNum = currentPageMatch ? parseInt(currentPageMatch[1]) : 1;
        return currentPageNum < totalPages;
      }

      const url = window.location.href;
      const pageMatch = url.match(/[?&]page=(\d+)/);
      if (pageMatch) {
        const currentPageNum = parseInt(pageMatch[1]);
        return currentPageNum === 1 && document.querySelectorAll('div[data-id]').length > 0;
      }

      return false;
    });

    console.log(`Page ${currentPage} completed. Has next page: ${hasNextPage}`);

    if (products.length === 0 && currentPage > 1) {
      console.log(`No products found on page ${currentPage}, stopping pagination`);
      hasNextPage = false;
    }

    currentPage++;

    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  console.log(`Completed scraping for ${name}. Total products scraped: ${productsScrapedCount}`);
}