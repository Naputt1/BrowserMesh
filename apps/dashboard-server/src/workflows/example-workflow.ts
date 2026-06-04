import { createWorkflow } from '@browsermesh/workflow-builder';

export default createWorkflow((wf) => {
  const page = wf.createPage();
  page.navigate({ url: 'https://example.com' });
  const title = page.select({ selector: 'h1' }).text();
  return { title };
});
