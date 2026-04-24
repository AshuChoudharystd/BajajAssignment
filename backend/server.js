const express  = require('express');
const cors = require('cors');
const dotenv = require("dotenv");
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

port = process.env.PORT || 3001

app.get('/',(req,res)=>{
    res.send("/bfhl endpoint is running");
});

const USER_ID = "AshuChoudhary_21022005";
const EMAIL_ID = "ac7830@srmist.edu.in";
const COLLEGE_ROLL_NUMBER = "RA2311003020065";

const handleEntry = (value)=>{
    return typeof value === "string" ? value.trim() : "";
}

const isValidEdge = (entry)=>{
    return /^[A-Z]->[A-Z]$/.test(entry);
}

const addNode = (node,state)=>{
    if(!state.nodeSeen.has(node)){
        state.nodeSeen.add(node);
        state.orderedNodes.push(node);
    }

    if (!state.childrenMap.has(node)) {
        state.childrenMap.set(node, []);
    }

    if (!state.indegree.has(node)) {
        state.indegree.set(node, 0);
    }

    if (!state.undirected.has(node)) {
        state.undirected.set(node, new Set());
    }
}

const buildComponents = (orderedNodes,undirected)=>{
     const visited = new Set();
  const components = [];

  for (const start of orderedNodes) {
    if (visited.has(start)) continue;

    const stack = [start];
    visited.add(start);
    const component = [];

    while (stack.length > 0) {
      const node = stack.pop();
      component.push(node);

      for (const neighbor of undirected.get(node) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}

const componentRoot = (component,indegree)=>{
    const roots = component.filter((node) => (indegree.get(node) || 0) === 0);
  roots.sort();
  if (roots.length > 0) return roots[0];
  return [...component].sort()[0];
}

const hasCycle = (component,childrenMap)=>{
    const componentSet = new Set(component);
  const color = new Map();

  function dfs(node) {
    color.set(node, 1);

    for (const child of childrenMap.get(node) || []) {
      if (!componentSet.has(child)) continue;

      const childColor = color.get(child) || 0;
      if (childColor === 1) return true;
      if (childColor === 0 && dfs(child)) return true;
    }

    color.set(node, 2);
    return false;
     }

  for (const node of component) {
    if ((color.get(node) || 0) === 0) {
      if (dfs(node)) return true;
    }
  }

  return false;

}

const buildTree = (node,childrenMap)=>{
    const subtree = {};
  let maxChildDepth = 0;

  for (const child of childrenMap.get(node) || []) {
    const { tree, depth } = buildTree(child, childrenMap);
    subtree[child] = tree;
    maxChildDepth = Math.max(maxChildDepth, depth);
  }

  return {
    tree: subtree,
    depth: 1 + maxChildDepth,
  };
}

const processData = (data)=>{
    const invalid_entries = [];
  const duplicate_edges = [];

  const state = {
    seenValidEdges: new Set(),
    duplicateSeen: new Set(),
    childToParent: new Map(),
    childrenMap: new Map(),
    indegree: new Map(),
    undirected: new Map(),
    orderedNodes: [],
    nodeSeen: new Set(),
  };

  for (const rawEntry of data) {
    const entry = handleEntry(rawEntry);

    if (!isValidEdge(entry)) {
      invalid_entries.push(entry);
      continue;
    }

    const [parent, child] = entry.split("->");

    if (parent === child) {
      invalid_entries.push(entry);
      continue;
    }

    if (state.seenValidEdges.has(entry)) {
      if (!state.duplicateSeen.has(entry)) {
        duplicate_edges.push(entry);
        state.duplicateSeen.add(entry);
      }
      continue;
    }

    state.seenValidEdges.add(entry);

    if (state.childToParent.has(child)) {
      // Multi-parent case: silently discard later parent edges
      continue;
    }

    state.childToParent.set(child, parent);

    addNode(parent, state);
    addNode(child, state);

    state.childrenMap.get(parent).push(child);
    state.indegree.set(child, (state.indegree.get(child) || 0) + 1);

    state.undirected.get(parent).add(child);
    state.undirected.get(child).add(parent);
  }

  const components = buildComponents(state.orderedNodes, state.undirected);
  const hierarchies = [];

  let total_trees = 0;
  let total_cycles = 0;
  let largest_tree_root = "";
  let largest_depth = 0;

  for (const component of components) {
    const root = componentRoot(component, state.indegree);
    const cycle = hasCycle(component, state.childrenMap);

    if (cycle) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true,
      });
      total_cycles += 1;
      continue;
    }

    const { tree, depth } = buildTree(root, state.childrenMap);

    hierarchies.push({
      root,
      tree: { [root]: tree },
      depth,
    });

    total_trees += 1;

    if (
      depth > largest_depth ||
      (depth === largest_depth &&
        (largest_tree_root === "" || root < largest_tree_root))
    ) {
      largest_depth = depth;
      largest_tree_root = root;
    }
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root,
    },
  };
}

app.post("/bfhl",(req,res)=>{
     const { data } = req.body || {};

  if (!Array.isArray(data)) {
    return res.status(400).json({
      error: "Invalid request body. Expected: { data: string[] }",
    });
  }

  const result = processData(data);
  return res.status(200).json(result);
})



app.listen(port,()=>{
    console.log("Application is at port ",port)
});