const mkdirp = require("mkdirp");
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");
const babel = require("@babel/core");

const BabelPluginPluckExports = require("babel-plugin-pluck-exports");

module.exports = function componentWithMDXScope(
  absWrapperPath,
  codeScopeAbsPath,
  projectRoot
) {
  mkdirp.sync(path.join(projectRoot, CACHE_DIR, PLUGIN_DIR, MDX_WRAPPERS_DIR));

  // hoist pageQuery and any other named exports
  const OGWrapper = fs.readFileSync(absWrapperPath, "utf-8");
  const instance = new BabelPluginPluckExports();
  const result = babel.transform(OGWrapper, {
    plugins: [instance.plugin],
    presets: [require("@babel/preset-react")]
  }).code;

  // get the preexisting hash for the scope file to use in the new wrapper filename
  const scopePathSegments = codeScopeAbsPath.split("/");
  const scopeHash = scopePathSegments[scopePathSegments.length - 1].slice(
    0,
    -3
  );

  const newWrapper = `// .cache/gatsby-mdx/wrapper-components/{wrapper-filepath-hash}-{scope-hash}.js
  import React from 'react';

import __mdxScope from '${codeScopeAbsPath}';

import OriginalWrapper from '${absWrapperPath}';

import { graphql } from 'gatsby';

// pageQuery, etc get hoisted to here
${instance.state.exports.map(exportString => exportString)};

export default ({children, ...props}) => <OriginalWrapper
  {...props}
  __mdxScope={__mdxScope}
  >
    {children}
  </OriginalWrapper>`;

  const absPathToNewWrapper = createFilePath(
    projectRoot,
    `${createHash(absWrapperPath)}--${scopeHash}`,
    ".js"
  );

  fs.writeFileSync(absPathToNewWrapper, newWrapper);

  return absPathToNewWrapper;
};

const CACHE_DIR = `.cache`;
const PLUGIN_DIR = `gatsby-mdx`;
const MDX_WRAPPERS_DIR = `mdx-wrappers-dir`;

const createFilePath = (directory, filename, ext) =>
  path.join(
    directory,
    CACHE_DIR,
    PLUGIN_DIR,
    MDX_WRAPPERS_DIR,
    `${filename}${ext}`
  );

const createHash = str =>
  crypto
    .createHash(`md5`)
    .update(str)
    .digest(`hex`);
