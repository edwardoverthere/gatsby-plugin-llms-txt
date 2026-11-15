const fs = require('fs');
const path = require('path');

exports.pluginOptionsSchema = ({ Joi }) =>
	Joi.object({
		query: Joi.string()
			.required()
			.description('GraphQL query that fetches the llms.txt content'),
		contentPath: Joi.string().description(
			'Dot-notation path to the content within the query result (e.g., "settings.llmsTxt")'
		),
		serialize: Joi.function().description(
			'Function that receives the query data and returns the content'
		),
		output: Joi.string().description(
			'Path of the file to write, relative to public/ (defaults to "llms.txt")'
		),
	}).xor('contentPath', 'serialize');

exports.onPostBuild = async ({ graphql, reporter, store }, pluginOptions) => {
	const { query, contentPath, serialize, output = 'llms.txt' } = pluginOptions;
	const outputPath = path.join(
		store.getState().program.directory,
		'public',
		output
	);

	reporter.info(`Generating ${output} from query...`);

	// query for the llms.txt content
	const result = await graphql(query);

	if (result.errors) {
		reporter.panicOnBuild(
			`Error querying for ${output} content`,
			result.errors
		);
		return;
	}

	// build the content with serialize, or extract it from the query result
	// using the provided path
	const llmsContent = serialize
		? await serialize({ data: result.data })
		: contentPath.split('.').reduce((obj, key) => obj?.[key], result.data);

	if (llmsContent != null && typeof llmsContent !== 'string') {
		const expected = serialize
			? 'serialize to return a string'
			: `"${contentPath}" to be a string`;

		reporter.panicOnBuild(
			`gatsby-plugin-llms-txt expected ${expected}, got ${
				Array.isArray(llmsContent) ? 'an array' : typeof llmsContent
			}`
		);
		return;
	}

	if (!llmsContent || llmsContent.trim() === '') {
		// remove any file left over from a previous build
		fs.rmSync(outputPath, { force: true });
		reporter.warn(
			`No ${output} content found in query, skipping file creation`
		);
		return;
	}

	// write the content to the file
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, `${llmsContent.trim()}\n`);

	reporter.success(`${output} created at public/${output}`);
};
