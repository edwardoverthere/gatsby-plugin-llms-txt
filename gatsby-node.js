const fs = require('fs');
const path = require('path');

exports.pluginOptionsSchema = ({ Joi }) =>
	Joi.object({
		query: Joi.string()
			.required()
			.description('GraphQL query that fetches the llms.txt content'),
		contentPath: Joi.string()
			.required()
			.description(
				'Dot-notation path to the content within the query result (e.g., "settings.llmsTxt")'
			),
	});

exports.onPostBuild = async ({ graphql, reporter, store }, pluginOptions) => {
	const { query, contentPath } = pluginOptions;
	const outputPath = path.join(
		store.getState().program.directory,
		'public',
		'llms.txt'
	);

	reporter.info('Generating llms.txt from query...');

	// query for the llms.txt content
	const result = await graphql(query);

	if (result.errors) {
		reporter.panicOnBuild(
			'Error querying for llms.txt content',
			result.errors
		);
		return;
	}

	// extract the content from the query result using the provided path
	const llmsContent = contentPath
		.split('.')
		.reduce((obj, key) => obj?.[key], result.data);

	if (llmsContent != null && typeof llmsContent !== 'string') {
		reporter.panicOnBuild(
			`gatsby-plugin-llms-txt expected "${contentPath}" to be a string, got ${
				Array.isArray(llmsContent) ? 'an array' : typeof llmsContent
			}`
		);
		return;
	}

	if (!llmsContent || llmsContent.trim() === '') {
		// remove any file left over from a previous build
		fs.rmSync(outputPath, { force: true });
		reporter.warn(
			'No llms.txt content found in query, skipping file creation'
		);
		return;
	}

	// write the content to the file
	fs.writeFileSync(outputPath, `${llmsContent.trim()}\n`);

	reporter.success('llms.txt created at public/llms.txt');
};
