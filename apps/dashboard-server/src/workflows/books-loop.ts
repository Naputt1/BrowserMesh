import { createWorkflow } from '@browsermesh/sdk';

export default createWorkflow((wf) => {
  const page = wf.createPage();
  page.navigate({ url: 'https://books.toscrape.com/' });
  const books = page.select({ selector: 'article.product_pod' }).selectAll();
  const results: Array<{ title: string; price: string }> = [];
  for (const book of books) {
    const title = book.extract('attribute', 'title');
    const price = book.extract('text');
    results.push({ title, price });
  }
  return results;
});
