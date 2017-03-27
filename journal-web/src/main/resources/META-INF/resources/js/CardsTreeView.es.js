import Soy from 'metal-soy/src/Soy';

import core from 'metal/src/core';
import dom from 'metal-dom/src/dom';
import Treeview from 'metal-treeview';

import Autocomplete from 'metal-autocomplete';

import templates from './CardsTreeView.soy';

/**
 * CardsTreeView
 *
 * This is an extension of the default TreeView component that adds
 * the following features:
 *
 * - Node selection management, both single and multiple
 * - Custom tree node template using Lexicon Horizontal Cards
 * - Improved accessibility for keyboard navigation following common tree widget patterns
 */
class CardsTreeview extends Treeview {

	/**
	 * @inheritDoc
	 */
	attached() {
		let inputSearch = document.getElementById(this.filterElementId);

		if (!inputSearch) {
			return;
		}

		dom.on(inputSearch, 'keyup', this.filterOnKeyup.bind(this));

		new Autocomplete(
			{
				inputElement: inputSearch,
				data: query => {
					return this.originalNodes.filter(function(item) {
						item.textPrimary = item.name;
						return query && item.name.toLowerCase().indexOf(query.toLowerCase()) !== -1;
					});
				},
				select: event => {
					inputSearch.value = event.name;

					this.filterNodes(event.name);
				}
			}
		);
	}

	/**
	 * @inheritDoc
	 */
	created() {
		this.originalNodes = JSON.parse(JSON.stringify(this.nodes));

		this.expandSelectedNodesParentNodes_(this.nodes);
		this.addSelectedNodes_(this.nodes);
	}

	/**
	 * Adds nodes with selected attribute to selectedNodes list in case when
	 * they are still not there.
	 *
	 * @param nodes Nodes to check and add to selectedNodes list.
	 * @protected
	 */
	addSelectedNodes_(nodes) {
		nodes.forEach(
			(node) => {
				if (node.children) {
					this.addSelectedNodes_(node.children);
				}

				if (node.selected || this.selectedNodes.indexOf(node) !== -1) {
					this.selectNode_(node);
				}
			}
		);
	}

	/**
	 * Deselects all selected tree nodes
	 *
	 * @protected
	 */
	deselectAll_() {
		for (let i = this.selectedNodes.length - 1; i >= 0; i--) {
			this.selectedNodes[i].selected = false;
			this.selectedNodes.pop();
		}
	}

	/**
	 * Selects specific nodes
	 *
	 * @param node to deselect.
	 * @protected
	 */
	deselectNode_(node) {
		node.selected = false;

		this.selectedNodes.splice(this.selectedNodes.indexOf(node), 1);

		this.selectedNodes = this.selectedNodes;
	}

	/**
	 * Expands all parent nodes of expanded children.
	 *
	 * @param nodes List of nodes to expand all parent nodes of expanded children.
	 * @protected
	 */
	expandSelectedNodesParentNodes_(nodes) {
		let expanded,
			expandedParent;

		nodes.forEach(
			(node) => {
				expanded = node.expanded;

				if (node.selected || this.selectedNodes.indexOf(node) !== -1) {
					expandedParent = true;
				}

				if (node.children) {
					expanded = this.expandSelectedNodesParentNodes_(node.children) || expanded;
				}

				node.expanded = expanded;
			},
			this
		);

		return expandedParent;
	}

	/**
	 * Filter original nodes list based on specific value.
	 * @param value Value to filter original nodes list with.
	 * @protected
	 */
	filterNodes(value) {
		let filterFunction = function(nodes) {
			let filteredNodes = [];

			nodes.filter(
				node => {
					if (node.children) {
						Array.prototype.push.apply(filteredNodes, filterFunction.bind(this)(node.children));

						delete node.children;
					}

					if (node.name.toLowerCase().indexOf(value.toLowerCase()) !== -1) {
						filteredNodes.push(node);
					}
				},
				this
			);

			return filteredNodes;
		};

		this.nodes = JSON.parse(JSON.stringify(this.originalNodes));

		if (value.length == 0) {
			return;
		}

		this.nodes = filterFunction.bind(this)(this.nodes);
	}

	filterOnKeyup(event) {
		let value = event.target.value;

		this.filterNodes(value);
	}

	/**
	 * Focus the given tree node.
	 * @param {!Object} nodeObj
	 * @protected
	 */
	focus_(nodeObj) {
		if (nodeObj) {
			this.element.querySelector('[data-treeitemid="' + nodeObj.id + '"] .card').focus();
		}
	}

	/**
	 * Focus the next tree node of given tree node.
	 * @param {!Element} node
	 * @protected
	 */
	focusNextNode_(node) {
		let path = node.getAttribute('data-treeview-path').split('-');

		let nodeObj = this.getNodeObj(path);

		let nextNodeObj;

		if (nodeObj.children && nodeObj.expanded) {
			path.push(0);

			nextNodeObj = this.getNodeObj(path);
		}
		else {
			while (!nextNodeObj && path.length > 0) {
				path[path.length - 1]++;

				nextNodeObj = this.getNodeObj(path);

				path.pop();
			}
		}

		this.focus_(nextNodeObj);
	}

	/**
	 * Focus the previous tree node of given tree node.
	 * @param {!Element} node
	 * @protected
	 */
	focusPrevNode_(node) {
		let path = node.getAttribute('data-treeview-path').split('-');

		let prevNodeObj;

		if (path[path.length - 1] === '0') {
			path.pop();

			prevNodeObj = this.getNodeObj(path);
		}
		else {
			path[path.length - 1]--;

			prevNodeObj = this.getNodeObj(path);

			while (prevNodeObj.children && prevNodeObj.expanded) {
				prevNodeObj = prevNodeObj.children[prevNodeObj.children.length - 1];
			}
		}

		this.focus_(prevNodeObj);
	}

	/**
	 * This is called when one of this tree view's nodes is clicked.
	 * @param {!Event} event
	 * @protected
	 */
	handleNodeClicked_(event) {
		let path = event.delegateTarget.parentNode.parentNode.parentNode.getAttribute('data-treeview-path').split('-');

		let node = this.getNodeObj(path);

		if (this.multiSelection) {
			if (node.selected) {
				this.deselectNode_(node);
			}
			else {
				this.selectNode_(node);
			}
		}
		else {
			if (!node.selected) {
				this.deselectAll_();
				this.selectNode_(node);
			}
		}

		this.nodes = this.nodes;
	}

	/**
	 * This is called when one of this tree view's nodes receives a keypress.
	 * Depending on the pressed key, the tree will:
	 * - ENTER or SPACE: Select the current node
	 * - DOWN ARROW: Focus the next node
	 * - UP ARROW: Focus the previous node
	 * - LEFT ARROW: Collapse the current node
	 * - RIGHT ARROW: Expand the current node
	 * @param {!Event} event
	 * @protected
	 */
	handleNodeKeyUp_(event) {
		let node = event.delegateTarget.parentNode.parentNode.parentNode;

		if (event.keyCode === 37) {
			this.setNodeExpandedState_(node, {expanded: false});
		}
		else if (event.keyCode === 38) {
			this.focusPrevNode_(node);
		}
		else if (event.keyCode === 39) {
			this.setNodeExpandedState_(node, {expanded: true});
		}
		else if (event.keyCode === 40) {
			this.focusNextNode_(node);
		}
		else if (event.keyCode === 13 || event.keyCode === 32) {
			this.handleNodeClicked_(event);
		}
	}

	/**
	 * This is called when one of this tree view's nodes toggler is clicked.
	 * @param {!Event} event
	 * @protected
	 */
	handleNodeTogglerClicked_(event) {
		this.toggleExpandedState_(event.delegateTarget.parentNode.parentNode.parentNode);
	}

	/**
	 * Selects specific node.
	 *
	 * @param node to select.
	 * @protected
	 */
	selectNode_(node) {
		node.selected = true;

		this.selectedNodes.push(node);

		this.selectedNodes = this.selectedNodes;
	}

	/**
	 * Sets the expanded state of a node
	 * @param {!Element} node The tree node we want to change the expanded state to
	 * @param {!Object} state A state object with the new value of the expanded state
	 * @protected
	 */
	setNodeExpandedState_(node, state) {
		let path = node.getAttribute('data-treeview-path').split('-');

		let nodeObj = this.getNodeObj(path);

		nodeObj.expanded = state.expanded;

		this.nodes = this.nodes;
	}
}

/**
 * CardsTreeview state definition.
 * @type {!Object}
 * @static
 */
CardsTreeview.STATE = {

	filterElementId: {
		validator: core.isString,
		value: ''
	},

	/**
	 * Enables multiple selection of tree elements
	 * @type {boolean}
	 */
	multiSelection: {
		validator: core.isBoolean,
		value: false
	},

	originalNodes: {
		validator: core.isArray,
		value: []
	},

	selectedNodes: {
		validator: core.isArray,
		value: []
	}
};

Soy.register(CardsTreeview, templates);

export default CardsTreeview;