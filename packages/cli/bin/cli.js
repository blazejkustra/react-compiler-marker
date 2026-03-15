#!/usr/bin/env node

/**
 * React Compiler Marker CLI
 *
 * Generate React Compiler reports from the command line.
 *
 * Usage:
 *   react-compiler-marker [options] [directory]
 *
 * Examples:
 *   react-compiler-marker .
 *   react-compiler-marker --format html --output report.html src/
 *   react-compiler-marker --format json > report.json
 */

require('../out/main.js');
