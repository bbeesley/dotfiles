/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */

'use strict';

var _require = require('./ReactRelayCompatContainerBuilder'),
    buildCompatContainer = _require.buildCompatContainer;

/**
 * Wrap the basic `createContainer()` function with logic to adapt to the
 * `context.relay.environment` in which it is rendered. Specifically, the
 * extraction of the environment-specific version of fragments in the
 * `fragmentSpec` is memoized once per environment, rather than once per
 * instance of the container constructed/rendered.
 */
function createContainer(Component, fragmentSpec, connectionConfig) {
  var Container = buildCompatContainer(Component, fragmentSpec, function (ComponentClass, fragments) {
    return require('./ReactRelayPaginationContainer').createContainerWithFragments(ComponentClass, fragments, connectionConfig);
  });
  Container.childContextTypes = {
    relay: require('./RelayPropTypes').Relay
  };
  return Container;
}

module.exports = { createContainer: createContainer };