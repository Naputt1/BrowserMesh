// Source: this file is compiled at build time
// The createWorkflow call is detected by the compiler plugin
// which evaluates the builder function and emits workflow.ir.json

export const scrape = createWorkflow<{ title: string; data: string[] }>((wf) => {
  const page = wf
    .createPage()
    .navigate({ url: "https://example.com" })

  const title = page
    .select({ selector: "h1" })
    .text("title")

  const items = page
    .select({ selector: ".item" })
    .selectAll()

  const output: { title: string; data: string[] } = { title: "", data: [] }

  for (const item of items) {
    output.data.push(item.text())
  }

  return output
})
