var fs = require("fs");
var acorn = require("acorn");
var UgilfyJS = require("uglify-js");

var file = process.argv[2];
if (!file) {
    console.error("Usage: " + process.argv.join(" ") + " <js file>");
    process.exit(1);
}

var codestream = [];

var contents = fs.readFileSync(file, "utf8");
var ast = acorn.parse(contents, {ecmaVersion: 2020, allowReturnOutsideFunction: true});

var pi = (push, x) => codestream.push((push ? 0 : 25) + x);
var pnull = () => pi(true, 3);
var pn = x => {
    if (isNaN(x)) {
        // -global
        pi(true, 4); pi(true, 12);
    } else if (!isFinite(x)) {
        // Math.pow(10, 1000)
        pnull(); pn(10); pn(1000); pi(true, 4); ps("Math"); pi(true, 7); ps("pow"); pi(true, 7); pn(3); pi(true, 9);
        if (x < 0) {
            pi(true, 12); // negate
        }
    } else if (x < 0) {
        pn(Math.abs(x));
        pi(true, 12);
    } else {
        codestream.push(50 + x);
    }
}
var ps = x => {
    var ccarr = [...x].map(x => x.charCodeAt(0));

    // String.fromCharCode.call(null, ...x)
    pnull();
    ccarr.forEach(pn);
    pi(true, 5);
    pn(ccarr.length + 1);
    pi(true, 9);
}
var pb = x => {
    if (x) {
        pn(0);
    } else {
        pn(1);
    }
    pi(true, 13);
}
var pu = () => {
    getCompStack();
    ps("");
    pi(true, 7);
}

(function setupVarStore() {
    pi(true, 4);

    // Object polyfill
    ps("Object");
    pi(true, 4);
    ps("constructor");
    pi(true, 7);
    pi(true, 8);

    // Array polyfill
    ps("Array");
    pnull();
    ps("[]");
    pi(true, 4);
    ps("JSON");
    pi(true, 7);
    ps("parse");
    pi(true, 7);
    pn(2);
    pi(true, 9);
    ps("constructor");
    pi(true, 7);
    pi(true, 8);

    // TODO: Expand with other useful globals, like Array ([].constructor)
})();
var getVarStore = () => {
    // s[0]
    pn(0);
    pi(true, 6);
}

(function setupCompStack() {
    pnull();
    getVarStore();
    ps("Array");
    pi(true, 7);
    pn(1);
    pi(true, 9);
})();

function getCompStack() {
    pn(1);
    pi(true, 6);
}

var selfVMMode;

function setupSelfVM() {
    selfVMMode = "funcvm";
    pnull();
    ps("c,input");
    ps(UgilfyJS.minify(fs.readFileSync("funcvm.js", "utf8").trim()));
    pi(true, 4);
    ps("Math");
    pi(true, 7);
    ps("pow");
    pi(true, 7);
    ps("constructor");
    pi(true, 7);
    pn(3);
    pi(true, 9);
}

function getSelfVM() {
    if (selfVMMode == "funcvm") {
        pn(2);
        pi(true, 6);
    } else if (selfVMMode.startsWith("global:")) {
        pi(true, 4);
        ps(selfVMMode.slice("global:".length));
        pi(true, 7);
    } else {
        throw new Error("IVM is not set up. Pass --ivm");
    }
}

if (process.argv.includes("--ivm")) {
    setupSelfVM();
} else {
    var f = process.argv.find(x => x.startsWith("--gvm="));
    if (f) {
        var name = f.slice("--gvm=".length);
        selfVMMode = "global:" + name;
    }
}

var nodeHandlers = {
    "Program": function Program(n) {
        for (var x of n.body) {
            handleNode(x);
        }
    },
    "ExpressionStatement": function ExpressionStatement(n, push) {
        handleNode(n.expression, push);
    },
    "ReturnStatement": function ReturnStatement(n, push) {
        handleNode(n.argument, true, true);
        pi(push, 0);
    },
    "CallExpression": function CallExpression(n, push) {
        if (n.callee.type == "MemberExpression") {
            handleNode(n.callee.object, true, true);
        } else {
            getVarStore();
        }
        //pi(true, 3); // Push null for this, TODO: push parent
        var argCnt = n.arguments.length;
        for (var arg of n.arguments) {
            handleNode(arg, true, true);
        }

        handleNode(n.callee, true, true);
        pn(argCnt + 1);
        pi(push, 9);
    },
    "Literal": function Literal(n, push) {
        if (!push) return;
        var x = n.value;
        if (typeof x == "number") pn(x);
        else if (typeof x == "string") ps(x);
        else if (x === null) pnull();
        else throw new Error("Unsupported literal " + x);
    },
    "MemberExpression": function MemberExpression(n, push) {
        handleNode(n.object, true, true);
        handleNode(n.property, true);
        pi(push, 7);
    },
    "Identifier": function Identifier(n, push, global) {
        if (!push) return;
        if (global) {
            getVarStore();
            ps(n.name);
            pi(push, 7);
        } else {
            ps(n.name);
        }
    },
    "BinaryExpression": function BinaryExpression(n, push) {
        if (n.operator == "/") {
            // x * Math.pow(y, -1)
            handleNode(n.left, true, true);
            pnull();
            handleNode(n.right, true, true);
            pn(-1);
            pi(true, 4);
            ps("Math");
            pi(true, 7);
            ps("pow");
            pi(true, 7);
            pn(3);
            pi(true, 9);
            pi(push, 11);
        }
        else if (n.operator == "%") {
            // Push operands to compStack
            getCompStack();
            handleNode(n.left, true, true);
            handleNode(n.right, true, true);
            getCompStack();
            ps("unshift");
            pi(true, 7);
            pn(3);
            pi(false, 9);

            // cs.unshift(cs[0]/cs[1])
            getCompStack();
            getCompStack();
            pn(0);
            pi(true, 7);
            pnull();
            getCompStack();
            pn(1);
            pi(true, 7);
            pn(-1);
            pi(true, 4);
            ps("Math");
            pi(true, 7);
            ps("pow");
            pi(true, 7);
            pn(3);
            pi(true, 9);
            pi(true, 11);
            getCompStack();
            ps("unshift");
            pi(true, 7);
            pn(2);
            pi(false, 9);

            // cs[0]
            getCompStack();
            pn(0);
            pi(true, 7);

            // Math.floor(cs[0])
            pnull();
            getCompStack();
            pn(0);
            pi(true, 7);
            pi(true, 4);
            ps("Math");
            pi(true, 7);
            ps("floor");
            pi(true, 7);
            pn(2);
            pi(true, 9);

            // (cs[0] + (-cs[0])) * y
            pi(true, 12);
            pi(true, 10);
            getCompStack();
            pn(2);
            pi(true, 7);
            pi(push, 11);

            // Remove operands from compStack
            getCompStack();
            pn(0);
            pn(3);
            getCompStack();
            ps("splice");
            pi(true, 7);
            pn(3);
            pi(false, 9);
        }
        else if (n.operator == "<" || n.operator == ">=") {
            // Push operands to compStack
            getCompStack();
            handleNode(n.left, true, true);
            handleNode(n.right, true, true);
            getCompStack();
            ps("unshift");
            pi(true, 7);
            pn(3);
            pi(false, 9);
            
            // Fetch operands from compStack
            getCompStack();
            pn(0);
            pi(true, 7);
            getCompStack();
            pn(1);
            pi(true, 7);

            // x > y
            pi(true, 14);

            // Fetch operands from compStack
            getCompStack();
            pn(0);
            pi(true, 7);
            getCompStack();
            pn(1);
            pi(true, 7);

            // x == y
            pi(true, 15);

            pi(true, 10);
            pn(0);
            if (n.operator == "<") { // !(x > y && x == y)
                pi(push, 15);
            } else { // x > y || x == y
                pi(true, 15);
                pi(push, 13)
            }

            // Remove operands from compStack
            getCompStack();
            pn(0);
            pn(2);
            getCompStack();
            ps("splice");
            pi(true, 7);
            pn(3);
            pi(false, 9);
        }
        else if (n.operator == "===" || n.operator == "!==") {
            // Push operands to compStack
            getCompStack();
            handleNode(n.left, true, true);
            handleNode(n.right, true, true);
            getCompStack();
            ps("unshift");
            pi(true, 7);
            pn(3);
            pi(false, 9);
            
            // Fetch operands from compStack
            getCompStack();
            pn(0);
            pi(true, 7);
            pi(true, 16); // typeof x
            getCompStack();
            pn(1);
            pi(true, 7);
            pi(true, 16); // typeof y

            // typeof x == typeof y
            pi(true, 15);

            // Fetch operands from compStack
            getCompStack();
            pn(0);
            pi(true, 7);
            getCompStack();
            pn(1);
            pi(true, 7);

            // x == y
            pi(true, 15);

            pi(true, 10);
            pn(2);
            if (n.operator == "===") { // (typeof x == typeof y && x == y)
                pi(push, 15);
            } else { // typeof x != typeof y || x != y
                pi(true, 15);
                pi(push, 13);
            }

            // Remove operands from compStack
            getCompStack();
            pn(0);
            pn(2);
            getCompStack();
            ps("splice");
            pi(true, 7);
            pn(3);
            pi(false, 9);
        }
        else {
            handleNode(n.left, true, true);
            handleNode(n.right, true, true);
            if (n.operator == "+") pi(push, 10);
            else if (n.operator == "-") {
                // x + (-y)
                pi(true, 12);
                pi(push, 10);
            }
            else if (n.operator == "*") pi(push, 11);
            else if (n.operator == ">") pi(push, 14);
            else if (n.operator == "<=") {
                // !(x > y)
                pi(true, 14);
                pi(push, 13);
            }
            else if (n.operator == "==") pi(push, 15);
            else if (n.operator == "!=") {
                // !(x == y)
                pi(true, 15);
                pi(push, 13);
            } else {
                throw new Error("Binary operator " + n.operator + " not supported.");
            }
        }
    },
    "VariableDeclaration": function VariableDeclaration(n) {
        n.declarations.forEach(x => handleNode(x));
    },
    "VariableDeclarator": function VariableDeclarator(n) {
        getVarStore();
        handleNode(n.id, true, false);
        if (n.init) {
            handleNode(n.init, true);
        } else {
            pu();
        }
        pi(false, 8);
    },
    "AssignmentExpression": function AssignmentExpression(n, push) {
        if (n.operator != "=") {
            throw new Error("Assignment operator " + n.operator + " is not supported yet.");
        }
        if (n.left.type == "Identifier") {
            getVarStore();
            handleNode(n.left, true, false);
        } else if (n.left.type == "MemberExpression") {
            handleNode(n.left.object, true, true);
            handleNode(n.left.property, true, false);
        } else {
            throw new Error("Assigning to " + n.left.type + " is not supported.");
        }
        handleNode(n.right, true, true);
        pi(push, 8);
    },
    "ArrayExpression": function ArrayExpression(n, push) {
        // []['constructor'](...n.elements)
        pnull();
        n.elements.forEach(x => handleNode(x, true, true));
        getCompStack();
        ps("constructor");
        pi(true, 7);
        pn(n.elements.length + 1);
        pi(push, 9)
    },
    "ObjectExpression": function ObjectExpression(n, push) {
        // global['constructor']()
        if (!push) return;
        pnull();
        pi(true, 4);
        ps("constructor");
        pi(true, 7);
        pn(1);
        pi(push, 9);

        n.properties.forEach(x => {
            handleNode(x, true);
            pi(true, 8);
        });
    },
    "Property": function Property(n, push) {
        handleNode(n.key, push);
        handleNode(n.value, push, true);
    },
    "UnaryExpression": function UnaryExpression(n, push) {
        if (n.operator == "!") {
            if (!push) return;
            handleNode(n.argument, true, true);
            pi(push, 13);
        } else if (n.operator == "-") {
            if (!push) return;
            handleNode(n.argument, true, true);
            pi(push, 12);
        } else {
            throw new Error("Unary operator " + n.operator + " is not supported.");
        }
    },
    "IfStatement": function IfStatement(n, push) {
        handleNode(n.test, true);
        pi(true, 13);
        var jumpAmtMarker = codestream.length, altJumpAmtMarker;
        pn(codestream.length + 2);
        pi(false, 2);
        var startMarker = codestream.length;
        handleNode(n.consequent, push);
        if (n.alternate) {
            altJumpAmtMarker = codestream.length;
            pn(codestream.length + 2);
            pi(false, 1);
            codestream[jumpAmtMarker] += codestream.length - startMarker;
            var startMarker = codestream.length;
            handleNode(n.alternate, push);
            codestream[altJumpAmtMarker] += codestream.length - startMarker;
        } else {
            codestream[jumpAmtMarker] += codestream.length - startMarker;
        }
    },
    "BlockStatement": function(n, push) {
        n.body.forEach(x => handleNode(x, push));
    },
    "LogicalExpression": function(n, push) {
        if (n.operator == "||" || n.operator == "&&") {
            // Push x to compStack
            getCompStack();
            handleNode(n.left, true, true);
            getCompStack();
            ps("unshift");
            pi(true, 7);
            pn(2);
            pi(false, 9);

            // get left twice
            getCompStack();
            pn(0);
            pi(push, 7);
            getCompStack();
            pn(0);
            pi(true, 7);

            if (n.operator == "&&") pi(true, 13);

            // if left is falsey/truthy
            var jmpMarker = codestream.length;
            pn(0);
            pi(false, 2);

            // consume remaining left, push right to stack
            pi(false, 13);
            handleNode(n.right, push, true);

            codestream[jmpMarker] += codestream.length;

            getCompStack();
            getCompStack();
            ps("shift");
            pi(true, 7);
            pn(1);
            pi(false, 9);
        } else {
            throw new Error("Logical operator " + x.operator + " is unsupported.");
        }
    },
    "ForStatement": function ForStatement(n) {
        handleNode(n.init);
        var condMarker = codestream.length;
        handleNode(n.test, true);
        pi(true, 13);
        var jmpMarker = codestream.length;
        pn(0);
        pi(false, 2);
        handleNode(n.body);
        handleNode(n.update);
        pn(condMarker);
        pi(false, 1);
        codestream[jmpMarker] += codestream.length;
    },
    "WhileStatement": function WhileStatement(n) {
        var startMarker = codestream.length;
        handleNode(n.test, true);
        pi(true, 13);
        var jmpMarker = codestream.length;
        pn(0);
        pi(false, 2);
        handleNode(n.body);
        pn(startMarker);
        pi(false, 1);
        codestream[jmpMarker] += codestream.length;
    },
    "DoWhileStatement": function DoWhileStatement(n) {
        var startMarker = codestream.length;
        handleNode(n.body);
        handleNode(n.test, true);
        pn(startMarker);
        pi(false, 2);
    }
}

var handleNode = (n, ...args) => {
    var h = nodeHandlers[n.type];
    if (!h) {
        throw new Error("Handler not found for type " + n.type);
    }
    console.error(h.name);
    h(n, ...args);
}

handleNode(ast);

console.error("Size of codestream:", codestream.length);

if (process.argv.includes("-r")) {
    var vm = require("./vm");
    console.log(vm(codestream, undefined, { debug: process.argv.includes("-d") }));
} else {
    console.log(JSON.stringify(codestream));
}
