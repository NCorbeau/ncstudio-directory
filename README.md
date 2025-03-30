# Multi-Directory Generator with Astro

This project is a template generator for creating multiple web directories, each with its own domain, design, and content. Built with Astro, it allows you to generate separate static websites for different directories (like dog parks in Warsaw, French desserts, etc.) from a single codebase.

## Features

- **Single codebase** for managing multiple directory websites
- **Separate domains** for each directory
- **Custom theming** for each directory
- **Content management** through YAML and Markdown files
- **SEO optimized** with dedicated landing pages
- **Fast static sites** with minimal JavaScript
- **Responsive design** that works on all devices
- **High performance** with Astro's minimal JS approach

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Basic knowledge of Astro, YAML, and Markdown

### Installation

1. Clone this repository or create a new project using the template:

```bash
# Clone repository
git clone https://github.com/yourusername/multi-directory-generator.git
cd multi-directory-generator

# Install dependencies
npm install
```

### Project Structure

The project follows this structure:

```
📁 my-directory-generator/
├── 📁 src/
│   ├── 📁 components/          # UI components
│   ├── 📁 layouts/             # Page layouts
│   ├── 📁 content/             # Directory data and content
│   │   ├── 📁 directories/     # Directory configurations (YAML)
│   │   └── 📁 listings/        # Content for listings (Markdown)
│   ├── 📁 styles/              # CSS styles
│   └── 📁 pages/               # Astro page components
├── 📁 scripts/                 # Build and deployment scripts
│   ├── build-all.js            # Script to build all directories
│   └── deploy.js               # Script to deploy to different domains
├── 📁 public/                  # Static assets
└── 📁 dist/                    # Build output
```

## Creating a New Directory

1. **Create configuration file**

Create a new YAML file in `src/content/directories/` for your directory:

```yaml
# src/content/directories/dog-parks.yml
id: dog-parks
name: Dog Parks Warsaw
description: The most comprehensive directory of dog parks in Warsaw
domain: dogparkswarsaw.com
theme: modern
primaryColor: "#1E5128"
secondaryColor: "#4E9F3D"
logo: /dog-parks/logo.svg
categories:
  - id: central
    name: Central Warsaw
    description: Dog parks in the center of Warsaw
  - id: north
    name: Northern Districts
    description: Dog parks in northern districts of Warsaw
metaTags:
  title: Dog Parks Warsaw - Find the Perfect Park for Your Puppy
  description: Comprehensive directory of dog parks in Warsaw, Poland.
  keywords:
    - dog parks
    - warsaw
```

2. **Add listings**

Create Markdown files for your listings in `src/content/listings/your-directory-id/`:

```markdown
---
title: Łazienki Royal Park Dog Area
description: A beautiful designated area for dogs within the historic Łazienki Royal Park.
directory: dog-parks
category: central
featured: true
images: 
  - /dog-parks/listings/lazienki1.jpg
address: Agrykola 1, 00-460 Warszawa
rating: 4.7
tags:
  - royal park
  - central
---

# Łazienki Royal Park Dog Area

Located in the historic Łazienki Park, this designated dog area offers a beautiful setting for your furry friend to exercise and socialize.

## Features

- Designated off-leash area within a beautiful historical park
- Water fountains for dogs
- Nearby benches for owners
```

3. **Add assets**

Place images and other assets for your directory in `public/your-directory-id/`.

## Building the Sites

To build all directory sites:

```bash
node scripts/build-all.js
```

This will create separate builds for each directory in the `dist` folder.

To build a specific directory:

```bash
CURRENT_DIRECTORY=dog-parks npm run build
```

## Deploying to Different Domains

You can deploy each directory to its own domain using the deploy script:

```bash
# Deploy all directories using the specified method
node scripts/deploy.js ftp

# Deploy a specific directory
node scripts/deploy.js ftp dog-parks
```

Supported deployment methods:
- `manual` - Creates ZIP files for manual upload
- `ftp` - Deploys via FTP
- `ssh` - Deploys via SSH/SFTP
- `s3` - Deploys to AWS S3
- `gcs` - Deploys to Google Cloud Storage
- `github` - Deploys to GitHub Pages

## Configuration

### Deployment Configuration

Add deployment settings to your directory configuration:

```yaml
# Example FTP deployment configuration
deployment:
  ftp:
    host: ftp.dogparkswarsaw.com
    user: ftpuser
    password: ${FTP_PASSWORD} # Uses environment variable
    path: /public_html

# Example GitHub Pages configuration
deployment:
  github:
    repo: username/dogparkswarsaw
    branch: gh-pages
    user: githubuser
    token: ${GITHUB_TOKEN} # Uses environment variable
```

## Customizing Themes

Each directory can use a different theme. Themes are defined in:

- `src/styles/themes/` - CSS files for each theme
- `src/components/themes/` - Theme-specific component variants

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.