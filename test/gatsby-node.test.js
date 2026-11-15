const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { onPostBuild } = require('../gatsby-node');

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

test('builds the content with serialize', async () => {
	const calls = await build(
		{ data: { pages: [{ title: 'Home' }, { title: 'About' }] } },
		{
			query: options.query,
			serialize: ({ data }) =>
				data.pages.map((page) => `- ${page.title}`).join('\n'),
		}
	);

	assert.equal(fs.readFileSync(outputPath, 'utf8'), '- Home\n- About\n');
	assert.deepEqual(levels(calls), ['info', 'success']);
});

test('waits for an async serialize', async () => {
	await build(
		{ data: {} },
		{ query: options.query, serialize: async () => '# Async' }
	);

	assert.equal(fs.readFileSync(outputPath, 'utf8'), '# Async\n');
});

test('removes a stale file and warns when serialize returns nothing', async () => {
	fs.writeFileSync(outputPath, 'left over from a previous build\n');

	const calls = await build(
		{ data: {} },
		{ query: options.query, serialize: () => null }
	);

	assert.equal(fs.existsSync(outputPath), false);
	assert.deepEqual(levels(calls), ['info', 'warn']);
});

test('fails the build when serialize does not return a string', async () => {
	const calls = await build(
		{ data: {} },
		{ query: options.query, serialize: () => ({ title: 'Site' }) }
	);

	assert.equal(fs.existsSync(outputPath), false);
	assert.deepEqual(levels(calls), ['info', 'panicOnBuild']);
	assert.match(calls[1].args[0], /serialize to return a string, got object/);
});

test('writes to the output path', async () => {
	await build(
		{ data: { settings: { llmsTxt: '# Full' } } },
		{ ...options, output: 'docs/llms-full.txt' }
	);

	assert.equal(
		fs.readFileSync(
			path.join(siteDir, 'public', 'docs', 'llms-full.txt'),
			'utf8'
		),
		'# Full\n'
	);
	assert.equal(fs.existsSync(outputPath), false);
});

test('removes a stale file at the output path', async () => {
	const fullPath = path.join(siteDir, 'public', 'llms-full.txt');
	fs.writeFileSync(fullPath, 'left over from a previous build\n');
	fs.writeFileSync(outputPath, 'written by another instance\n');

	await build(
		{ data: { settings: { llmsTxt: '' } } },
		{ ...options, output: 'llms-full.txt' }
	);

	assert.equal(fs.existsSync(fullPath), false);
	assert.equal(fs.existsSync(outputPath), true);
});

test('rejects when serialize throws', async () => {
	await assert.rejects(
		build(
			{ data: {} },
			{
				query: options.query,
				serialize: () => {
					throw new Error('bad data');
				},
			}
		),
		/bad data/
	);

	assert.equal(fs.existsSync(outputPath), false);
});
