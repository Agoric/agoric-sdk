#! /usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import process from 'node:process';

const resultFile = process.argv[2] || 'results.txt';
const resultsBody = fs.readFileSync(resultFile, 'utf-8');

const packageTestRegex = new RegExp(`> (.+?)@(.+?) test$`, 'gms');

const tapResultRegex = new RegExp(
  `(^(?<status>not )?ok (?<num>[0-9]+) - (?<name>.+?)(?: %ava-dur=(?<duration>[0-9]+)ms)?(?:# (?<comments>.+?))?$(?<output>(\n^#.+?$)*)(?<failure>(\n^(?:(?!(?:not|ok) )).+?$)*))`,
  'gms',
);
console.log(`<?xml version="1.0" encoding="UTF-8" ?>
<testsuites>`);

const lines = resultsBody.split(/\n/);
let buffer = [];
let currentSuite = null;

function runtimeProp() {
  console.log(`<properties>`);
  if (process.env.GH_ENGINE) {
    console.log(
      `  <property name="dd_tags[runtime.name]" value="${process.env.GH_ENGINE}"></property>`,
    );
    if (process.env.GH_ENGINE !== 'xs') {
      console.log(
        `  <property name="dd_tags[runtime.version]" value="${process.version}"></property>`,
      );
    }
  }

  if (typeof os.machine === 'function') {
    console.log(
      `  <property name="dd_tags[runtime.architecture]" value="${os.machine()}"></property>`,
    );
  }
  if (typeof os.platform === 'function') {
    console.log(
      `  <property name="dd_tags[os.platform]" value="${os.platform()}"></property>`,
    );
  }
  if (typeof os.release === 'function') {
    console.log(
      `  <property name="dd_tags[os.version]" value="${os.release()}"></property>`,
    );
  }
  console.log(`</properties>`);
}

function processTAP(tapbody) {
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = tapResultRegex.exec(tapbody))) {
    if (m.groups.name) {
      const testCaseName = `${m.groups.name}`.replace(/["<>]/g, '').trim();

      console.log(
        `<testcase name="${testCaseName}"`.concat(
          m.groups.duration
            ? ` time="${parseInt(m.groups.duration, 10) / 1000.0}"`
            : '',
          '>',
        ),
      );

      let skipped = false;
      let succeeded = true;
      let todo = false;
      if (m.groups.status) {
        succeeded = false;
      }
      if (m.groups.comments) {
        if (m.groups.comments.match(/SKIP/gi)) {
          skipped = true;
        }
        if (m.groups.comments.match(/TODO/gi)) {
          todo = true;
          skipped = true;
          succeeded = true;
        }
      }

      if (!succeeded) {
        if (m.groups.failure) {
          console.log(`<failure>`);
          console.log(`<![CDATA[`);
          console.log(m.groups.failure.trim());
          console.log(`]]>`);
          console.log(`</failure>`);
        } else {
          console.log(`<failure />`);
        }
      }

      if (skipped) {
        const why = todo ? 'todo' : '';
        console.log(`<skipped message="${why}" />`);
      }

      if (m.groups.output !== undefined && m.groups.output.length > 0) {
        const output = m.groups.output.replace(/"/g, '');
        console.log(`<system-out>`);
        console.log(`<![CDATA[`);
        console.log(
          output
            .trim()
            .split(`\n`)
            .map(item => item.replace(/^# {3}/g, ''))
            .join(`\n`),
        );
        console.log(`]]>`);

        console.log(`</system-out>`);
      }
      console.log('</testcase>');
    }
  }
}

for (let i = 0; i < lines.length; i += 1) {
  const suiteName = packageTestRegex.exec(lines[i]);
  if (suiteName !== null) {
    if (buffer.length > 0) {
      processTAP(buffer.join(`\n`));
    }
    if (currentSuite !== null) {
      console.log('</testsuite>');
    }
    buffer = [];
    currentSuite = suiteName[1].replace(/@/g, '');
    console.log(`<testsuite name="${currentSuite}">`);
    runtimeProp();
    i += 1;
    continue;
  }
  buffer.push(lines[i]);
}

if (currentSuite === null) {
  // try to get package name from input path
  currentSuite = `agoric.${resultFile.split(path.sep).slice(-2, -1)[0]}`;
  console.log(`<testsuite name="${currentSuite}">`);
  runtimeProp();
}

if (buffer.length > 0) {
  processTAP(buffer.join(`\n`));
}

console.log('</testsuite></testsuites>');
