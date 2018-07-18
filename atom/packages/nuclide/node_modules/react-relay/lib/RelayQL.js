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

var _extends3 = _interopRequireDefault(require('babel-runtime/helpers/extends'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * @public
 *
 * This is a tag function used with template strings to provide the facade of a
 * runtime GraphQL parser. Example usage:
 *
 *   Relay.QL`fragment on User { name }`
 *
 * In actuality, a Babel transform parses these tag templates and replaces it
 * with an internal representation of the query structure.
 */
function RelayQL(strings) {
  require('fbjs/lib/invariant')(false, 'RelayQL: Unexpected invocation at runtime. Either the Babel transform ' + 'was not set up, or it failed to identify this call site. Make sure it ' + 'is being used verbatim as `Relay.QL`.');
}

function assertValidFragment(substitution) {
  require('fbjs/lib/invariant')(substitution instanceof require('./RelayFragmentReference') || require('./QueryBuilder').getFragment(substitution) || require('./QueryBuilder').getFragmentSpread(substitution), 'RelayQL: Invalid fragment composition, use ' + "`${Child.getFragment('name')}`.");
}

var CLASSIC_NODE = '__classic_node__';

/**
 * Private helper methods used by the transformed code.
 */
Object.assign(RelayQL, {
  __frag: function __frag(substitution) {
    if (typeof substitution === 'function') {
      // Route conditional fragment, e.g. `${route => matchRoute(route, ...)}`.
      return new (require('./RelayRouteFragment'))(substitution);
    }
    if (substitution != null) {
      if (Array.isArray(substitution)) {
        substitution.forEach(assertValidFragment);
      } else {
        assertValidFragment(substitution);
      }
    }
    return substitution;
  },
  __var: function __var(expression) {
    var variable = require('./QueryBuilder').getCallVariable(expression);
    if (variable) {
      require('fbjs/lib/invariant')(false, 'RelayQL: Invalid argument `%s` supplied via template substitution. ' + 'Instead, use an inline variable (e.g. `comments(count: $count)`).', variable.callVariableName);
    }
    return require('./QueryBuilder').createCallValue(expression);
  },
  __id: function __id() {
    return require('./generateConcreteFragmentID')();
  },
  __createFragment: function __createFragment(fragment, variableMapping) {
    return new (require('./RelayFragmentReference'))(function () {
      return fragment;
    }, null, variableMapping);
  },


  /**
   * Memoizes the results of executing the `.classic()` functions on
   * graphql`...` tagged expressions. Memoization allows the framework to use
   * object equality checks to compare fragments (useful, for example, when
   * comparing two `Selector`s to see if they select the same data).
   */
  __getClassicNode: function __getClassicNode(taggedNode) {
    var concreteNode = taggedNode[CLASSIC_NODE];
    if (concreteNode == null) {
      var fn = taggedNode.classic;
      require('fbjs/lib/invariant')(typeof fn === 'function', 'RelayQL: Expected a graphql literal, got `%s`.\n' + 'The "relay" Babel plugin must enable "compat" mode to be used with ' + '"react-relay/compat" or "react-relay/classic".\n' + 'See: https://facebook.github.io/relay/docs/babel-plugin-relay.html', JSON.stringify(taggedNode));
      concreteNode = fn(this);
      taggedNode[CLASSIC_NODE] = concreteNode;
    }
    return concreteNode;
  },
  __getClassicFragment: function __getClassicFragment(taggedNode, isUnMasked) {
    var concreteNode = this.__getClassicNode(taggedNode);
    var fragment = require('./QueryBuilder').getFragmentDefinition(concreteNode);
    require('fbjs/lib/invariant')(fragment, 'RelayQL: Expected a fragment, got `%s`.\n' + 'The "relay" Babel plugin must enable "compat" mode to be used with ' + '"react-relay/compat" or "react-relay/classic".\n' + 'See: https://facebook.github.io/relay/docs/babel-plugin-relay.html', concreteNode);
    if (isUnMasked) {
      /*
       * For a regular `Fragment` or `Field` node, its variables have been declared
       * in the parent. However, since unmasked fragment is actually parsed as `FragmentSpread`,
       * we need to manually hoist its arguments to the parent.
       * In reality, we do not actually hoist the arguments because Babel transform is per file.
       * Instead, we could put the `argumentDefinitions` in the `metadata` and resolve the variables
       * when building the concrete fragment node.
       */
      var hoistedRootArgs = [];
      fragment.argumentDefinitions.forEach(function (argDef) {
        require('fbjs/lib/invariant')(argDef.kind === 'RootArgument', 'RelayQL: Cannot unmask fragment `%s`. Expected all the arguments are root argument' + ' but get `%s`', concreteNode.node.name, argDef.name);
        hoistedRootArgs.push(argDef.name);
      });

      fragment.node.metadata = (0, _extends3['default'])({}, concreteNode.node.metadata, {
        hoistedRootArgs: hoistedRootArgs
      });
    }
    return fragment;
  },
  __getClassicOperation: function __getClassicOperation(taggedNode) {
    var concreteNode = this.__getClassicNode(taggedNode);
    var operation = require('./QueryBuilder').getOperationDefinition(concreteNode);
    require('fbjs/lib/invariant')(operation, 'RelayQL: Expected an operation, got `%s`.\n' + 'The "relay" Babel plugin must enable "compat" mode to be used with ' + '"react-relay/compat" or "react-relay/classic".\n' + 'See: https://facebook.github.io/relay/docs/babel-plugin-relay.html', concreteNode);
    return operation;
  }
});

module.exports = RelayQL;