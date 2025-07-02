# Travel Light Aruba

## Project info

**URL**: https://travellightaruba.com

## How can I edit this code?

There are several ways of editing your application.

**Use the Travel Light Aruba builder**

Visit your [Travel Light Aruba project](https://travellightaruba.com) to make changes directly in the online editor.

Changes made via the builder will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in the builder.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open the Travel Light Aruba builder and click on Share -> Publish.

## Can I connect a custom domain to my site?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more in our documentation about [setting up a custom domain](https://travellightaruba.com/docs/custom-domain)

## Environment variables

Create a `.env` file based on `.env.example` and provide your Supabase details:

```env
VITE_PUBLIC_SUPABASE_URL=<your-supabase-url>
VITE_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

These values are required for the application to connect to Supabase during development and builds.
