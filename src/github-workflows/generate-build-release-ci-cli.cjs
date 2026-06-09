#!/usr/bin/env node
const { writeYamlFile } = require('./utils.cjs');
const workflowObject = require('./ci-yaml-fixtures/build-release-data.cjs');
const setupEnvironmentsObject = require('./ci-yaml-fixtures/setup-environments-data.cjs');

const workflowFile = writeYamlFile('.github/workflows/build-release.yml', workflowObject);
console.log(`Generated ${workflowFile}`);

const setupEnvironmentsFile = writeYamlFile('.github/actions/setup-environments/action.yml', setupEnvironmentsObject);
console.log(`Generated ${setupEnvironmentsFile}.`);
