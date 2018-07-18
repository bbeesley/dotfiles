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

/**
 * The public interface to React Relay.
 */
module.exports = {
  QueryRenderer: require('./ReactRelayQueryRenderer'),

  MutationTypes: require('relay-runtime').MutationTypes,
  RangeOperations: require('relay-runtime').RangeOperations,

  commitLocalUpdate: require('relay-runtime').commitLocalUpdate,
  commitMutation: require('relay-runtime').commitMutation,
  createFragmentContainer: require('./ReactRelayFragmentContainer').createContainer,
  createPaginationContainer: require('./ReactRelayPaginationContainer').createContainer,
  createRefetchContainer: require('./ReactRelayRefetchContainer').createContainer,
  fetchQuery: require('relay-runtime').fetchQuery,
  graphql: require('relay-runtime').graphql,
  requestSubscription: require('relay-runtime').requestSubscription
};