const fs = require('fs');
const path = require('path');

exports.onPostBuild = async ({ graphql, reporter }, pluginOptions) => {
	const { query, contentPath } = pluginOptions;

	if (!query) {
		reporter.error(
			'gatsby-plugin-llms-txt requires a "query" option to be provided'
		);
		return;
	}

	if (!contentPath) {
		reporter.error(
			'gatsby-plugin-llms-txt requires a "contentPath" option to be provided (e.g., "settings.llmsTxt")'
		);
		return;
	}

	try {
		reporter.info('🤖 Generating llms.txt from query...');

		// query for the llms.txt content
		const result = await graphql(query);

		if (result.errors) {
			reporter.error(
				'Error querying for llms.txt content:',
				result.errors
			);
			return;
		}

		// extract the content from the query result using the provided path
		const llmsContent = contentPath
			.split('.')
			.reduce((obj, key) => obj?.[key], result.data);

		if (!llmsContent || llmsContent.trim() === '') {
			reporter.info(
				'⚠️ No llms.txt content found in query, skipping file creation'
			);
			return;
		}

		const outputPath = 'public/llms.txt';

		// ensure the output directory exists
		const outputDir = path.dirname(outputPath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// write the content to the file
		fs.writeFileSync(outputPath, llmsContent.trim());

		reporter.success(`✅ llms.txt successfully created at ${outputPath}`);
	} catch (error) {
		reporter.error('Error generating llms.txt:', error);
	}
};
