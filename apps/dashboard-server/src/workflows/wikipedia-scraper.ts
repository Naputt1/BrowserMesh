import { createWorkflow } from '@browsermesh/sdk';

export default createWorkflow((wf) => {
  const page = wf.createPage();
  page.navigate({ url: 'https://en.wikipedia.org/wiki/Web_scraping' });
  const pageTitle = page.select({ selector: 'h1' }).text();
  const firstParagraph = page.select({ selector: '#mw-content-text p' }).text();
  page.wait({ durationMs: 2000 });
  return { pageTitle, firstParagraph };
});
