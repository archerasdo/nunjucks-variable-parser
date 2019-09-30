import nunjucks from "nunjucks";

const { parser, nodes } = nunjucks;

const {
  LookupVal, Symbol, Pair, Compare, Filter, FunCall, For, If,
} = nodes;

function traverseNode(node, inLoop = false) {
  if (node instanceof Symbol) {
    return [node.value];
  } if (node instanceof Pair) {
    return parsePair(node, inLoop);
  } if (node instanceof LookupVal) {
    return parseLookUp(node, inLoop);
  } if (node instanceof For) {
    return parseFor(node, inLoop);
  } if (node instanceof If) {
    return parseIf(node, inLoop);
  } if (node instanceof FunCall || node instanceof Filter) {
    return parseFuncOrFilter(node, inLoop);
  } if (["And", "Or", "Not", "Add", "Sub", "Mul", "Div", "Mod", "Pow", "Neg", "Pos", "FloorDiv"].includes(node.typename)) {
    return parseExpression(node, inLoop);
  } if (node instanceof Compare) {
    return parseCompare(node, inLoop);
  }
  return [];
}

function traverse(ast, inLoop = false) {
  if (!ast.children) {
    return traverseNode(ast, inLoop);
  }
  return ast.children.reduce((ret, item) => {
    const result = traverse(item, inLoop);

    return [...ret, ...result];
  }, []);
}

function parseCompare(node, inLoop = false) {
  if (!(node instanceof Compare)) {
    throw new Error(`current node type is not Compare, it is ${node.typename}`);
  }

  const { expr } = node;

  return traverse(expr, inLoop);
}

function parseFuncOrFilter(node, inLoop = false) {
  if (!(node instanceof FunCall) && !(node instanceof Filter)) {
    throw new Error(`current node type is not FunCall or Filter, it is ${node.typename}`);
  }

  const { args } = node;

  return traverse(args, inLoop);
}

function parseExpression(node, inLoop = false) {
  if (!["And", "Or", "Not", "Add", "Sub", "Mul", "Div", "Mod", "Pow", "Neg", "Pos", "FloorDiv"]
    .includes(node.typename)) {
    throw new Error(`current node type is not in Expression, it is ${node.typename}`);
  }

  const { left, right } = node;

  return [...traverse(left, inLoop), ...traverse(right, inLoop)];
}


function parseIf(node, inLoop = false) {
  if (!(node instanceof If)) {
    throw new Error(`current node type is not LookupVal, it is ${node.typename}`);
  }

  const { body, cond, else_ } = node;

  return [...traverse(body, inLoop), ...traverse(cond, inLoop)]
    .concat(else_ ? traverse(else_, inLoop) : []);
}

function parseLookUp(node, inLoop = false) {
  if (!(node instanceof LookupVal)) {
    throw new Error(`current node type is not LookupVal, it is ${node.typename}`);
  }
  const { target, val } = node;
  if (!(target instanceof Symbol)) {
    throw new Error("表达式有误，LookupVal target 必须为变量!");
  }

  if (target.value === "loop") {
    return [];
  }
  return [...traverse(target, inLoop), ...traverse(val, inLoop)];
}

function parsePair(node, inLoop = false) {
  if (!(node instanceof Pair)) {
    throw new Error(`current node type is not Pair, it is ${node.typename}`);
  }
  const { key, value } = node;
  return [...traverse(key, inLoop), ...traverse(value, inLoop)];
}

function parseFor(node) {
  if (!(node instanceof For)) {
    throw new Error(`current node type is not For, it is ${node.typename}`);
  }
  let ret = [];
  const { arr, name, body } = node;


  if (arr instanceof Symbol && name instanceof Symbol) {
    ret.push(arr.value);
    ret.push(`${arr.value}.${name.value}`);
  } else {
    ret = [...ret, ...traverse(arr, true), ...traverse(name, true)];
  }

  let bodyVariable = traverse(body, true);
  if (ret.find(el => el.includes("."))) {
    const childrenVariable = ret.filter(el => el.includes("."))
      .map(el => el.split(".")[1]);
    bodyVariable = bodyVariable.filter(el => !childrenVariable.includes(el));
  }
  ret = ret.concat(bodyVariable);
  return ret;
}


export default function (tpl) {
  const ast = parser.parse(tpl, true);

  return traverse(ast);
}
