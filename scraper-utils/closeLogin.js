export async function closeLoginPopup(page) {
  try {
    await page.waitForSelector('button._2KpZ6l._2doB4z', { timeout: 5000 });
    await page.click('button._2KpZ6l._2doB4z');
    console.log('Closed login popup');
  } catch {
    console.log('Login popup not found or already closed.');
  }
}