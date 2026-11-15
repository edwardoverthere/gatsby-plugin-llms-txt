# gatsby-plugin-llms-txt

A Gatsby plugin that generates an `llms.txt` file from your CMS content or other source during the build process.

## What is llms.txt?

The [`llms.txt`](https://llmstxt.org) file is a proposed standard for giving Large Language Models (LLMs) a concise, markdown-formatted overview of your website and links to its most useful content. It lives at the site root like `robots.txt`, but it is written for AI consumption rather than for controlling crawlers.

## Installation

```bash
npm install gatsby-plugin-llms-txt
# or
yarn add gatsby-plugin-llms-txt
```

Requires Gatsby v4 or v5 and Node 18 or later.

## Usage

Add the plugin to your `gatsby-config.js`. This example reads an `llmsTxt` field from a Sanity settings document:

```javascript
module.exports = {
	plugins: [
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
				contentPath: 'settings.llmsTxt',
			},
		},
	],
};
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `query` | string | | Required. A GraphQL query that fetches your llms.txt content from your CMS or other source. |
| `contentPath` | string | | A dot-notation path to the field containing your llms.txt content within the query result. |
| `serialize` | function | | Receives `{ data }`, the result of your query, and returns the content as a string. It can be async. Use it to build the file from several fields or nodes. |
| `output` | string | `llms.txt` | The path of the file to write, relative to `public/`. |

Set either `contentPath` or `serialize`, not both.

## Examples

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
		contentPath: 'site.siteMetadata.llmsContent',
	},
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
		},
	},
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
		output: 'llms-full.txt',
	},
}
```

## How it Works

1. During `gatsby build` (the `onPostBuild` hook), the plugin executes your GraphQL query
2. It extracts the content using `contentPath`, or builds it with `serialize`
3. If content is found, it writes it to `public/llms.txt` (or the path set in `output`), so it is accessible at `yoursite.com/llms.txt`
4. If no content is found, it logs a warning, skips file creation, and removes any file left over from a previous build

The file is not generated during `gatsby develop`.

## Error Handling

The build stops with an error if:

-   `query` is missing, or `contentPath` and `serialize` are both missing or both set (reported at startup)
-   The GraphQL query returns errors
-   The content at `contentPath`, or returned by `serialize`, is not a string
-   `serialize` throws

## Contributing

Issues and pull requests are welcome! Please check the [issues page](https://github.com/edwardoverthere/gatsby-plugin-llms-txt/issues) before submitting. Run the tests with `npm test`.

## License

MIT
