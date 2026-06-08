import { createWorkflow } from '@browsermesh/sdk';

export default createWorkflow<{ books: { title: string; price: string }[] }, { runCount: number }>(
  (wf) => {
    const state = wf.getState();
    const page = wf.createPage();
    page.navigate({ url: 'https://books.toscrape.com/' });
    const books = page.select({ selector: 'article.product_pod' }).selectAll();
    const results: { title: string; price: string }[] = [];
    for (const book of books) {
      const title = book.extract('attribute', 'title');
      const price = book.extract('text');
      results.push({ title, price });
    }
    wf.setState(state);
    return { books: results };
  },
);
