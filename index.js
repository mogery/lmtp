var fs = require("fs");
var acorn = require("acorn");

var file = process.argv[2];
if (!file) {
    console.log("Usage: " + process.argv.join(" ") + " <js file>");
    process.exit(1);
}

var streams = {
    main: []
}
var activeStream = "main";
var switchStream = x => {
    if (!streams[x]) streams[x] = [];
    activeStream = x;
}
var mergeStream = (into = "main") => {
    streams[into] = streams[into].concat(streams[activeStream]);
    delete streams[into];
    activeStream = into;
}

var contents = fs.readFileSync(file, "utf8");
var ast = acorn.parse(contents, {ecmaVersion: 2020, allowReturnOutsideFunction: true});

var pi = (push, x) => streams[activeStream].push((push ? 0 : 25) + x);
var pnull = () => pi(true, 3);
var pn = x => {
    if (isNaN(x)) {
        // -"\0"
        ps("\0"); pi(true, 12);
    } else if (!isFinite(x)) {
        // Math.pow(10, 1000)
        pnull(); pn(10); pn(1000); pi(true, 4); ps("Math"); pi(true, 7); ps("pow"); pi(true, 7); pn(3); pi(true, 9);
        if (x < 0) {
            pi(true, 12); // negate
        }
    } else {
        streams[activeStream].push(50 + x);
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

(function setupVarStore() {
    pi(true, 4);
    // TODO: Expand with other useful globals, like Array ([].constructor) or Object ({}.constructor)
})();
var getVarStore = () => {
    // s[0]
    pn(0);
    pi(true, 6);
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
        handleNode(n.left, true, true);
        handleNode(n.right, true, true);
        if (n.operator == "+") pi(push, 10);
        if (n.operator == "*") pi(push, 11);
        if (n.operator == ">") pi(push, 14);
        if (n.operator == "==") pi(push, 15);
    },
    "VariableDeclaration": function VariableDeclaration(n) {
        n.declarations.forEach(x => handleNode(x));
    },
    "VariableDeclarator": function VariableDeclarator(n) {
        getVarStore();
        handleNode(n.id, true, false);
        handleNode(n.init, true);
        pi(false, 8);
    },
    "AssignmentExpression": function AssignmentExpression(n, push) {
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
        }
        console.error("DBG", n);
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

if (process.argv.includes("-r")) {
    var vm = require("./vm");
    console.log(vm(streams.main));
} else {
    console.log(JSON.stringify(streams.main));
}
