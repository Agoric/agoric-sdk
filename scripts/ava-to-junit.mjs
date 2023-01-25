#! /usr/bin/env node
import fs from 'fs';
import process from 'node:process';

const resultsBody = fs.readFileSync(process.argv[2] || 'results.txt', 'utf-8');
const packageTestRegex = new RegExp(`> (.+?)@(.+?) test$`, 'gms');
const resultRegex = new RegExp(
  `^  ([✔✘-])(( \\[skip\\])?( \\[todo\\])?( \\[expected fail\\])?( \\[fail\\]:)?)(.+?)(\\(([\\d. smd]+)\\))?$`,
  'gms',
);
console.log(`<?xml version="1.0" encoding="UTF-8" ?>
<testsuites>`);

function durationToSeconds(duration){
  if (duration === null || duration === undefined) {
    return 0.01;
  }

  if (/^[\d.]+s$/.exec(duration)) {
    const sec = parseInt(duration.replaceAll('s', ''), 10);
    return sec;
  }

  if (/^\dm [\d.]+s$/.exec(duration)) {
    const spl = duration.split(' ');
    const min = parseInt(spl[0].replaceAll('m', ''), 10);
    const sec = min * 60.0 + parseFloat(spl[1].replaceAll('s', ''), 10);
    return sec;
  }

  if (/^\d+ms$/.exec(duration)) {
    const ms = parseFloat(duration.replaceAll('ms', ''), 10);
    return ms / 1000.0;
  }

  return duration;
}

let currentSuite = null;
resultsBody.split(/\n/).forEach(element => {
  const suiteName = packageTestRegex.exec(element);
  if (suiteName !== null) {
    if (currentSuite !== null) {
      console.log('</testsuite>');
    }
    currentSuite = suiteName[1].replaceAll('@', '').replaceAll('/', '.');
    console.log(`<testsuite name="${currentSuite}">`);
  }
  const resultMatch = resultRegex.exec(element);
  if (resultMatch !== null) {
    const [
      _fullMatch,
      statusCode,
      _annotation,
      _todo,
      _skip,
      _expectedFail,
      _failed,
      testname,
      _fullduration,
      duration,
    ] = resultMatch;
    const collapsedName = testname
      .trim()
      .replaceAll(' › ', '.')
      .replaceAll(/[^a-zA-Z0-9]/g, '_');
    const fullName = currentSuite.concat('.', collapsedName);

    console.log(
      `  <testcase name="${fullName}"`.concat(
        statusCode !== '-' ? ` time="${durationToSeconds(duration)}"` : '',
        `>`,
      ),
    );
    if (statusCode === '✘') {
      console.log(`    <failure />`);
    } else if (statusCode === '-') {
      console.log(`    <skipped />`);
    }
    console.log(`  </testcase>`);
  }
});
console.log('</testsuite></testsuites>');
