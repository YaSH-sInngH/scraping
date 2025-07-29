import puppeteer from 'puppeteer';
import { getProductModel } from './models/Product.js';
import './db.js';

// Category-specific selectors with fallbacks
const selectors = {
  'Mobiles': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Laptops': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Men Clothing': { 
    card: 'div.cPHDOP.col-12-12', 
    title: 'a.WKTcLC', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Women Clothing': { 
    card: 'div.cPHDOP.col-12-12', 
    title: 'a.WKTcLC', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Appliances': { 
    card: 'div.cPHDOP.col-12-12', 
    title: 'a.wjcEIp', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Home & Kitchen': { 
    card: 'div.cPHDOP.col-12-12', 
    title: 'a.wjcEIp', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'TVs': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Refrigerators': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Washing Machines': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Air Conditioners': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Headphones': { 
    card: 'div._1AtVbE.col-12-12', 
    title: 'a.wjcEIp', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]',
    specialCase: true
  },
  'Smart Watches': { 
    card: 'div.cPHDOP.col-12-12', 
    title: 'a.WKTcLC', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Shoes': { 
    card: 'div._1sdMkc.LFEi7Z', 
    title: 'a.WKTcLC', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]',
    specialCase: true
  },
  'Bags': { 
    card: 'div._1sdMkc.LFEi7Z', 
    title: 'a.WKTcLC', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]',
    specialCase: true
  },
  'Toys': { 
    card: 'div._1AtVbE.col-12-12', 
    title: 'a.wjcEIp', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Books': {
    card: 'div._1AtVbE.col-12-12',
    title: 'a.wjcEIp',
    price: 'div.Nx9bqj',
    rating: 'div.XQDdHH',
    author: 'div.NqpwHC',
    fallbackCard: 'div[data-id]',
    specialCase: false
  },
  'Gaming Consoles': { 
    card: 'div.cPHDOP.col-12-12', 
    title: 'a.wjcEIp', 
    price: 'div.Nx9bqj', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
  'Tablets': { 
    card: 'a.CGtC98', 
    title: 'div.KzDlHZ', 
    price: 'div.Nx9bqj._4b5DiR', 
    rating: 'div.XQDdHH',
    fallbackCard: 'div[data-id]'
  },
};

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
    'div._1sdMkc'
  ];

  const foundSelectors = await page.evaluate((selectors) => {
    const results = {};
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
    // Get current product count
    const currentProductCount = await page.evaluate(() => {
      return document.querySelectorAll('div[data-id]').length;
    });
    
    console.log(`Scroll ${scrollCount + 1}: Found ${currentProductCount} products`);
    
    // Scroll to bottom
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for new content to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if new products were loaded
    const newProductCount = await page.evaluate(() => {
      return document.querySelectorAll('div[data-id]').length;
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

export default async function scrapeCategory(categoryUrl, categoryName) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const Product = getProductModel(categoryName);

  let currentPage = 1;
  let hasNextPage = true;
  let totalProductsScraped = 0;
  const maxPages = 50; // Safety limit to prevent infinite loops
  let { card, title, price, rating, specialCase, fallbackCard } = selectors[categoryName] || selectors['Mobiles'];

  try {
    while (hasNextPage && currentPage <= maxPages) {
    // Compose page URL for pagination
    const pageUrl = `${categoryUrl}&page=${currentPage}`;
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

      // Detect pagination type and handle accordingly
      const paginationType = await detectPaginationType(page);
      
      if (paginationType.type === 'infinite-scroll') {
        // Handle infinite scroll
        await handleInfiniteScroll(page);
      } else {
        // Traditional pagination - scroll to bottom to trigger lazy loading
    let previousHeight;
    do {
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(res => setTimeout(res, 1000));
    } while (
      await page.evaluate('document.body.scrollHeight') > previousHeight
    );  
      }

      // Try to find working selectors if the default one fails
      let cardSelector = card;
      try {
        await page.waitForSelector(card, { timeout: 10000 });
      } catch (e) {
        console.log(`Default selector '${card}' not found, trying fallback...`);
        cardSelector = await findWorkingSelectors(page, categoryName);
        console.log(`Using fallback selector: ${cardSelector}`);
      }

      let products = [];
      
      // Try different scraping strategies
      try {
    if (["Men Clothing", "Women Clothing", "Home & Kitchen", "Appliances"].includes(categoryName)) {
      products = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('div.cPHDOP.col-12-12'));
        let allProducts = [];
        for (const row of rows) {
          const cards = Array.from(row.querySelectorAll('div[data-id]'));
          for (const card of cards) {
            // Title
            const titleEl = card.querySelector('a.WKTcLC, a.wjcEIp');
                const title = titleEl?.innerText?.trim() || '';
            // Price
            const priceEl = card.querySelector('div.Nx9bqj');
                const price = priceEl?.innerText?.trim() || '';
            // Rating
            const ratingEl = card.querySelector('div.XQDdHH');
                const rating = ratingEl?.innerText?.trim() || '';
            // URL
            let url = titleEl?.getAttribute('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://www.flipkart.com' + url;
            }
            if (title && price) {
              allProducts.push({ title, price, rating, url });
            }
          }
        }
        return allProducts;
      });
    } else if (specialCase) {
          // Special handling for categories with unique structure
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
          // Generic scraping for other categories
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

        // If no products found, try generic approach
        if (products.length === 0) {
          console.log('No products found with specific selectors, trying generic approach...');
          products = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('div[data-id]'));
            return cards.map(cardEl => {
              // Try multiple title selectors
              const titleEl = cardEl.querySelector('a.WKTcLC, a.wjcEIp, div.KzDlHZ, a[title]') || cardEl;
              const titleText = titleEl?.innerText?.trim() || titleEl?.getAttribute('title') || '';
              
              // Try multiple price selectors
              const priceEl = cardEl.querySelector('div.Nx9bqj, div._30jeq3, div._1_WHN1');
              const priceText = priceEl?.innerText?.trim() || '';
              
              // Try multiple rating selectors
              const ratingEl = cardEl.querySelector('div.XQDdHH, div._3LWZlK, span._2_R_DZ');
              const ratingText = ratingEl?.innerText?.trim() || '';
              
              // Get URL
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
        console.error(`Error scraping products for ${categoryName}:`, error.message);
        products = [];
    }

    console.log(`Scraped ${products.length} products from page ${currentPage} of ${categoryName}`);
      
      if (products.length > 0) {
        console.log('Sample products:');
    console.log(products.slice(0, 3));

            // Save products to the category-specific collection
        let savedCount = 0;
        for (const product of products) {
          try {
            // Add category information to the product
            const productWithCategory = {
              ...product,
              category: categoryName,
              scrapedAt: new Date()
            };
            await Product.create(productWithCategory);
            savedCount++;
          } catch (error) {
            console.error(`Error saving product:`, error.message);
          }
        }
        console.log(`Successfully saved ${savedCount} products to database`);
        totalProductsScraped += savedCount;
      } else {
        console.log(`No products found for ${categoryName} on page ${currentPage}`);
      }

      // Enhanced pagination check
      hasNextPage = await page.evaluate(() => {
        // Check multiple possible next button selectors
        const validSelectors = [
          'a._1LKTO3[rel="next"]',
          'a[rel="next"]',
          'a[aria-label="Next"]',
          'a[href*="page="]'
        ];
        
        for (const selector of validSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) { // Check if element is visible
              return true;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        // Check for elements with "Next" text
        const nextElements = Array.from(document.querySelectorAll('a, button, span')).filter(el => 
          el.textContent && el.textContent.toLowerCase().includes('next') && el.offsetParent !== null
        );
        
        if (nextElements.length > 0) {
          return true;
        }
        
        // Check if there are more products by looking for pagination info
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
        
        // Check if URL contains page parameter and try to increment
        const url = window.location.href;
        const pageMatch = url.match(/[?&]page=(\d+)/);
        if (pageMatch) {
          const currentPageNum = parseInt(pageMatch[1]);
          // If we're on page 1 and found products, assume there might be more
          return currentPageNum === 1 && document.querySelectorAll('div[data-id]').length > 0;
        }
        
        return false;
      });
      
      console.log(`Page ${currentPage} completed. Has next page: ${hasNextPage}`);
      
      // If no products found on current page, stop pagination
      if (products.length === 0 && currentPage > 1) {
        console.log(`No products found on page ${currentPage}, stopping pagination`);
        hasNextPage = false;
      }
      
    currentPage++;
      
      // Add delay between pages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log(`\n=== ${categoryName} Scraping Complete ===`);
    console.log(`Total pages scraped: ${currentPage - 1}`);
    console.log(`Total products scraped: ${totalProductsScraped}`);
    console.log(`==========================================\n`);
    
  } catch (error) {
    console.error(`Error scraping ${categoryName}:`, error.message);
  } finally {
  await browser.close();
  }
}