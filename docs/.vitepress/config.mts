import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'BrowserMesh',
  base: '/BrowserMesh/',
  description:
    'A unified browser automation platform where workflows compile to a JSON execution graph for deterministic execution.',

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/workflow' },
      { text: 'Reference', link: '/reference/workflow-ir' },
      { text: 'Recipes', link: '/recipes/docker-deploy' },
      { text: 'Architecture', link: '/architecture/overview' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' },
            { text: 'Authoring Workflows', link: '/guide/authoring-workflows' },
            { text: 'Compilation', link: '/guide/compilation' },
            { text: 'Runtime', link: '/guide/runtime' },
            { text: 'Examples', link: '/guide/examples' },
          ],
        },
      ],

      '/api/': [
        {
          text: 'Packages',
          items: [
            { text: '@browsermesh/workflow', link: '/api/workflow' },
            { text: '@browsermesh/workflow-builder', link: '/api/workflow-builder' },
            { text: '@browsermesh/compiler', link: '/api/compiler' },
            { text: '@browsermesh/runtime-loader', link: '/api/runtime-loader' },
            { text: '@browsermesh/sdk', link: '/api/sdk' },
            { text: '@browsermesh/ui', link: '/api/ui' },
            { text: '@browsermesh/proto', link: '/api/proto' },
          ],
        },
      ],

      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'WorkflowIR', link: '/reference/workflow-ir' },
            { text: 'Node Types', link: '/reference/node-types' },
            { text: 'Events', link: '/reference/events' },
            { text: 'gRPC API', link: '/reference/grpc-api' },
          ],
        },
      ],

      '/recipes/': [
        {
          text: 'Recipes',
          items: [
            { text: 'Seed a Database', link: '/recipes/seed-database' },
            { text: 'Docker Deploy', link: '/recipes/docker-deploy' },
            { text: 'Custom Runtime', link: '/recipes/custom-runtime' },
            { text: 'Monorepo Setup', link: '/recipes/monorepo-setup' },
          ],
        },
      ],

      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Data Flow', link: '/architecture/data-flow' },
            { text: 'Design Principles', link: '/architecture/design-principles' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/anomalyco/BrowserMesh' }],
  },
});
