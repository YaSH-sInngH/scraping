export async function cleanupCategoryUrls(categoryObject) {
  for (const catName in categoryObject) {
    if (categoryObject[catName].url) {
      categoryObject[catName].url = categoryObject[catName].url.replace(/`/g, '').trim();
    }
    if (categoryObject[catName].img) {
      categoryObject[catName].img = categoryObject[catName].img.replace(/`/g, '').trim();
    }
  }
}