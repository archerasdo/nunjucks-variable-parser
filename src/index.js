import nunjucks from "nunjucks";

const VARIBALE_PARENT_SYMBOL = Symbol("#Variable_parent");
const VARIBALE_TYPE_SYMBOL = Symbol("#Variable_type");

const { parser, nodes } = nunjucks;

const {
  LookupVal, Symbol: NodeSymbol, Pair, Compare, Filter, FunCall, For, If, Literal,
} = nodes;


class Variable {
  constructor(value, options = {}) {
    const { type = "string", parent = undefined } = options;

    this[VARIBALE_PARENT_SYMBOL] = parent;
    this[VARIBALE_TYPE_SYMBOL] = type;
    this.value = value;
  }

  set parent(parent) {
    this[VARIBALE_PARENT_SYMBOL] = parent;
  }

  get parent() {
    return this[VARIBALE_PARENT_SYMBOL];
  }

  set type(type) {
    this[VARIBALE_TYPE_SYMBOL] = type;
  }

  get type() {
    return this[VARIBALE_TYPE_SYMBOL];
  }
}

function traverseNode(node, inLoop = false) {
  if (node instanceof NodeSymbol) {
    return [new Variable(node.value)];
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
  if (!(target instanceof NodeSymbol)) {
    throw new Error("表达式有误，LookupVal target 必须为变量!");
  }

  if (target.value === "loop") {
    return [];
  }

  const targetVar = new Variable(target.value, { type: "object" });
  if (val instanceof Literal) {
    return [targetVar, new Variable(val.value, { parent: targetVar })];
  }

  return [targetVar, ...traverse(val, inLoop)];
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


  if (arr instanceof NodeSymbol && name instanceof NodeSymbol) {
    const listVar = new Variable(arr.value, { type: "list" });
    const itemVar = new Variable(name.value, { parent: listVar });
    ret.push(itemVar);
    ret.push(listVar);
  } else {
    ret = [...ret, ...traverse(arr, true), ...traverse(name, true)];
  }

  let bodyVariable = traverse(body, true);
  const childrenVariable = ret.filter(el => el.parent && el.parent.type === "list");
  if (childrenVariable.length > 0) {
    const finalBodyVar = [];
    for (const bVar of bodyVariable) {
      const { value, parent, type } = bVar;
      const hasItemVar = childrenVariable.find(el => value === el.value);
      if (hasItemVar) {
        const itemVar = ret.find(el => el.value === value);
        itemVar.type = type;
        continue;
      }
      const hasParentItemVar = childrenVariable.find(el => parent.value === el.value);

      if (hasParentItemVar) {
        bVar.parent = hasParentItemVar;
        finalBodyVar.push(bVar);
        continue;
      }

      finalBodyVar.push(bVar);
    }

    bodyVariable = finalBodyVar;
  }
  ret = ret.concat(bodyVariable);
  return ret;
}


export default function (tpl, transformer = e => e) {
  const ast = parser.parse(tpl, true);

  return traverse(ast).map(el => transformer(el));
}
