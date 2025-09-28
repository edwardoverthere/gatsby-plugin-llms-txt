# gatsby-plugin-llms-txt

A Gatsby plugin that generates an `llms.txt` file from your CMS content or other source during the build process.

## What is llms.txt?

The `llms.txt` file is a proposed standard for providing context and instructions to Large Language Models (LLMs) about your website. It's similar to `robots.txt` but designed specifically for AI consumption.

## Installation

```bash
npm install gatsby-plugin-llms-txt
```

or

```bash
yarn add gatsby-plugin-llms-txt
```

## Usage

Add the plugin to your `gatsby-config.js`:

```javascript
module.exports = {
	plugins: [
		{
			resolve: 'gatsby-plugin-llms-txt',
			options: {
				query: `
					query {
						settings {
						llmsTxt
						}
					}
				`,
				contentPath: 'settings.llmsTxt',
			},
		},
	],
};
```

## Configuration

The plugin requires two configuration options:

### `query` (required)

A GraphQL query string that fetches your llms.txt content from your CMS or other source.

### `contentPath` (required)

A dot-notation path to the field containing your llms.txt content within the GraphQL query result.

## Examples

### Basic Sanity CMS Setup

```javascript
{
  resolve: 'gatsby-plugin-llms-txt',
  options: {
    query: `
      {
        settings {
          llmsTxt
        }
      }
    `,
    contentPath: 'settings.llmsTxt'
  }
}
```

### Nested Content Path

```javascript
{
  resolve: 'gatsby-plugin-llms-txt',
  options: {
    query: `
      {
        site {
          siteMetadata {
            llmsContent
          }
        }
      }
    `,
    contentPath: 'site.siteMetadata.llmsContent'
  }
}
```

## How it Works

1. During the build process (`onPostBuild` hook), the plugin executes your GraphQL query
2. It extracts the content using the specified `contentPath`
3. If content is found, it writes it to `public/llms.txt`
4. If no content is found or the field is empty, it skips file creation
5. The resulting file is accessible at `yoursite.com/llms.txt`

## Requirements

-   Gatsby v4, or v5
-   A GraphQL data source (Sanity, Contentful, etc.)

## Error Handling

The plugin will:

-   Log an error if the `query` option is missing
-   Log an error if the `contentPath` option is missing
-   Log a warning if no content is found and skip file creation
-   Log errors if the GraphQL query fails

## Contributing

Issues and pull requests are welcome! Please check the [issues page](https://github.com/edwardoverthere/gatsby-plugin-llms-txt/issues) before submitting.

## License

MIT
