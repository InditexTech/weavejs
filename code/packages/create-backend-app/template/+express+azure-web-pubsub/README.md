# Weave.js Backend start template

This is an Express.js application that was generated with **Create Weave.js Backend**

This server setup the Weave.js
[Azure Web Pubsub store](https://inditextech.github.io/weavejs/docs/main/build/stores/azure-web-pubsub-store) store. So before perform the quickstart please setup on the `.env` file the configuration for your Azure Web Pubsub instance.

## Quickstart

If you skipped the automatic installation of the dependencies, run first this
command:

```bash
npm install
# or
pnpm install
# or
yarn install
```

Now, lets run the development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

## Build & Deploy

To build the project in order to deploy it follow this steps:

```bash
npm run build
# or
pnpm build
# or
yarn build
```

Then a `dist` folder with the production files will be created, now you just need to:

- Install de dependencies on the `dist` folder.
- Copy the correct `.env` file with the values for production.

After this steps the result files on the directory should be the runtime of the application.

## Learn more

To learn more about Express.js and Weave.js, take a look at the following
resources:

- [Express.js](https://expressjs.com/) - learn about Express.js
- [Weave.js](https://inditextech.github.io/weavejs) - learn about Weave.js
- [Weave.js repository](https://github.com/InditexTech/weavejs) - check out out code.
