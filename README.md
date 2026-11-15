# gatsby-plugin-llms-txt

A Gatsby plugin that generates an `llms.txt` file from your CMS content or other source during the build process.

## What is llms.txt?

The `llms.txt` file is a proposed standard for giving Large Language Models (LLMs) a concise, markdown-formatted overview of your website and links to its most useful content. It lives at the site root like `robots.txt`, but it is written for AI consumption rather than for controlling crawlers.

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

The plugin requires `query` and either `contentPath` or `serialize`:

### `query` (required)

A GraphQL query string that fetches your llms.txt content from your CMS or other source.

### `contentPath`

A dot-notation path to the field containing your llms.txt content within the GraphQL query result. Required unless `serialize` is set.

### `serialize`

A function that receives `{ data }`, the result of your GraphQL query, and returns the content as a string. It can be async. Use it instead of `contentPath` to build the file from several fields or nodes. Set either `contentPath` or `serialize`, not both.

### `output`

The path of the file to write, relative to `public/`. Defaults to `llms.txt`.

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

### Building the File from Your Pages

```javascript
{
  resolve: 'gatsby-plugin-llms-txt',
  options: {
    query: `
      {
        site {
          siteMetadata {
            title
            description
            siteUrl
          }
        }
        allMarkdownRemark {
          nodes {
            frontmatter {
              title
            }
            fields {
              slug
            }
          }
        }
      }
    `,
    serialize: ({ data }) => {
      const { title, description, siteUrl } = data.site.siteMetadata;
      const links = data.allMarkdownRemark.nodes.map(
        (node) => `- [${node.frontmatter.title}](${siteUrl}${node.fields.slug})`
      );

      return [`# ${title}`, `> ${description}`, '## Pages', links.join('\n')].join('\n\n');
    }
  }
}
```

### Adding llms-full.txt

List the plugin a second time with a different `output` to write another file:

```javascript
{
  resolve: 'gatsby-plugin-llms-txt',
  options: {
    query: `
      {
        settings {
          llmsFullTxt
        }
      }
    `,
    contentPath: 'settings.llmsFullTxt',
    output: 'llms-full.txt'
  }
}
```

## How it Works

1. During the build process (`onPostBuild` hook), the plugin executes your GraphQL query
2. It extracts the content using the specified `contentPath`, or builds it with `serialize`
3. If content is found, it writes it to `public/llms.txt` (or the path set in `output`)
4. If no content is found or the field is empty, it skips file creation and removes any file left over from a previous build
5. The resulting file is accessible at `yoursite.com/llms.txt`

## Requirements

-   Gatsby v4 or v5
-   A GraphQL data source (Sanity, Contentful, etc.)

## Error Handling

The plugin will:

-   Stop at startup if `query` is missing, or if `contentPath` and `serialize` are both missing or both set
-   Fail the build if the GraphQL query returns errors
-   Fail the build if the content at `contentPath`, or returned by `serialize`, is not a string
-   Fail the build if `serialize` throws
-   Log a warning if no content is found, skip file creation, and remove any file left over from a previous build

## Contributing

Issues and pull requests are welcome! Please check the [issues page](https://github.com/edwardoverthere/gatsby-plugin-llms-txt/issues) before submitting.

## License

MIT
