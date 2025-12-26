export async function extractCategoriesFromPage(page) {
  return await page.evaluate(() => {
    const baseUrl = 'https://www.flipkart.com';
    const results = [];
    let catNodes = [];

    // 1. Try horizontal navbar
    const horizontalContainers = Array.from(document.querySelectorAll('div[style*="display: flex"], div[class*="flex"], nav, header'));
    const possibleNavbars = horizontalContainers.filter(container => {
      const children = container.children;
      return children.length >= 5 &&
        Array.from(children).every(child =>
          Math.abs(child.getBoundingClientRect().height - children[0].getBoundingClientRect().height) < 20
        ) &&
        container.getBoundingClientRect().width > window.innerWidth * 0.7;
    });

    for (const navbar of possibleNavbars) {
      const items = Array.from(navbar.children);
      const itemsWithImages = items.filter(item => item.querySelector('img'));
      if (itemsWithImages.length >= 5) {
        catNodes = items;
        break;
      }
    }

    // 2. Fallback category sections
    if (catNodes.length === 0) {
      catNodes = Array.from(document.querySelectorAll('div._3sdu8W.emupdz > a._1ch8e_, div._3sdu8W.emupdz > div._1ch8e_'));
    }

    if (catNodes.length === 0 || catNodes.length < 8) {
      const navContainer = document.querySelector('div[class*="navigationCard"]')?.parentElement?.parentElement;
      if (navContainer) {
        catNodes = Array.from(navContainer.querySelectorAll('a[class*="navigationCard"], div[class*="navigationCard"]'));
      }

      if (catNodes.length === 0 || catNodes.length < 8) {
        catNodes = Array.from(document.querySelectorAll('a[href*="navigationCard"], div[class*="rich_navigation"]'));
      }

      if (catNodes.length === 0 || catNodes.length < 8) {
        const possibleContainers = Array.from(document.querySelectorAll('div[style*="display: flex"]'));
        for (const container of possibleContainers) {
          const items = container.querySelectorAll('a, div');
          if (items.length >= 8 && Array.from(items).every(item => item.querySelector('img'))) {
            catNodes = Array.from(items);
            break;
          }
        }
      }
    }

    // 3. Extract categories
    catNodes.forEach(node => {
      let name = node.querySelector('span[class*="XjE3T"] > span, span[class*="text"] > span, div > span')?.textContent?.trim() ||
                 node.getAttribute('aria-label') ||
                 node.getAttribute('title') ||
                 node.textContent?.trim();

      if (name && name.length > 50) name = name.substring(0, 50).trim();

      const relativeUrl = node.tagName === 'A' ? node.getAttribute('href') : null;
      const url = relativeUrl ? new URL(relativeUrl, baseUrl).href : null;
      const img = node.querySelector('img')?.src || null;

      if (name) results.push({ name, url, img });
    });

    // 4. Fallback by image context
    if (results.length < 8) {
      const allImages = document.querySelectorAll('img');
      for (const img of allImages) {
        if (img.width > 30 && img.width < 150 && img.height > 30 && img.height < 150) {
          let parent = img.parentElement;
          for (let i = 0; i < 5; i++) {
            if (!parent) break;
            const text = parent.textContent.trim();
            if (text && text.length < 30) {
              const link = parent.tagName === 'A' ? parent : parent.querySelector('a');
              const url = link ? link.href : null;
              const name = text;
              if (name && !results.some(r => r.name === name)) {
                results.push({ name, url, img: img.src });
              }
              break;
            }
            parent = parent.parentElement;
          }
        }
      }
    }

    // 5. Final attempt via nav elements
    if (results.length < 8) {
      const navElements = document.querySelectorAll('nav, [role="navigation"], header, [class*="menu"], [class*="nav"]');
      for (const nav of navElements) {
        const items = nav.querySelectorAll('a, li, div[role="button"], [class*="item"]');
        if (items.length >= 5) {
          for (const item of items) {
            const text = item.textContent.trim();
            if (text && text.length > 2 && text.length < 30) {
              const link = item.tagName === 'A' ? item : item.querySelector('a');
              const url = link ? link.href : null;
              const img = item.querySelector('img')?.src || null;
              const name = text;
              if (name && !results.some(r => r.name === name)) {
                results.push({ name, url, img });
              }
            }
          }
        }
      }
    }

    return results;
  });
}