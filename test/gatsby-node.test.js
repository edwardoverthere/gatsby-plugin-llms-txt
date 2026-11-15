const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Joi = require('joi');

const { onPostBuild, pluginOptionsSchema } = require('../gatsby-node');

const options = {
	query: '{ settings { llmsTxt } }',
	contentPath: 'settings.llmsTxt',
};

let siteDir;
let outputPath;

beforeEach(() => {
	siteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatsby-plugin-llms-txt-'));
	fs.mkdirSync(path.join(siteDir, 'public'));
	outputPath = path.join(siteDir, 'public', 'llms.txt');
});

afterEach(() => {
	fs.rmSync(siteDir, { recursive: true, force: true });
});

// run onPostBuild against a stubbed Gatsby API and return the reporter calls
const build = async (result, pluginOptions = options) => {
	const calls = [];
	const record =
		(level) =>
		(...args) =>
			calls.push({ level, args });

	await onPostBuild(
		{
			graphql: async () => result,
			reporter: {
				info: record('info'),
				warn: record('warn'),
				success: record('success'),
				panicOnBuild: record('panicOnBuild'),
			},
			store: { getState: () => ({ program: { directory: siteDir } }) },
		},
		pluginOptions
	);

	return calls;
};

const levels = (calls) => calls.map((call) => call.level);

test('writes trimmed content with a trailing newline', async () => {
	const calls = await build({
		data: { settings: { llmsTxt: '  # Site\n\nHello\n\n' } },
	});

	assert.equal(fs.readFileSync(outputPath, 'utf8'), '# Site\n\nHello\n');
	assert.deepEqual(levels(calls), ['info', 'success']);
});

test('follows a nested contentPath', async () => {
	await build(
		{ data: { site: { siteMetadata: { llmsContent: '# Nested' } } } },
		{ ...options, contentPath: 'site.siteMetadata.llmsContent' }
	);

	assert.equal(fs.readFileSync(outputPath, 'utf8'), '# Nested\n');
});

test('removes a stale file and warns when the content is empty', async () => {
	fs.writeFileSync(outputPath, 'left over from a previous build\n');

	const calls = await build({ data: { settings: { llmsTxt: '   ' } } });

	assert.equal(fs.existsSync(outputPath), false);
	assert.deepEqual(levels(calls), ['info', 'warn']);
});

test('warns without writing when contentPath does not resolve', async () => {
	const calls = await build({ data: { settings: null } });

	assert.equal(fs.existsSync(outputPath), false);
	assert.deepEqual(levels(calls), ['info', 'warn']);
});

test('fails the build when the query returns errors', async () => {
	const errors = [new Error('Cannot query field "nope"')];

	const calls = await build({ errors });

	assert.equal(fs.existsSync(outputPath), false);
	assert.deepEqual(levels(calls), ['info', 'panicOnBuild']);
	assert.equal(calls[1].args[1], errors);
});

test('fails the build when the content is not a string', async () => {
	const calls = await build({
		data: { settings: { llmsTxt: [{ _type: 'block' }] } },
	});

	assert.equal(fs.existsSync(outputPath), false);
	assert.deepEqual(levels(calls), ['info', 'panicOnBuild']);
	assert.match(calls[1].args[0], /"settings\.llmsTxt" to be a string, got an array/);
});

test('options schema accepts query and contentPath', () => {
	const { error } = pluginOptionsSchema({ Joi }).validate(options);

	assert.equal(error, undefined);
});

test('options schema requires query', () => {
	const { error } = pluginOptionsSchema({ Joi }).validate({
		contentPath: options.contentPath,
	});

	assert.match(error.message, /"query" is required/);
});

test('options schema requires contentPath', () => {
	const { error } = pluginOptionsSchema({ Joi }).validate({
		query: options.query,
	});

	assert.match(error.message, /"contentPath" is required/);
});
