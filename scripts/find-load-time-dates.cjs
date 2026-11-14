// Finds every place the clock is read when a file LOADS (module scope), not when a function runs.
// Such a value is frozen at the first import: a form default, a zod .max(new Date()), a calendar maxDate...
// Usage: npm run check:dates   (or node scripts/find-load-time-dates.cjs .)  Exits 1 when it finds one.
const path = require("path");
const fs = require("fs");
const root = path.resolve(process.argv[2] || ".");
const ts = require(path.join(root, "node_modules", "typescript"));

const DIRS = ["app", "components", "lib", "hooks", "services", "layout", "providers", "utils", "context", "contexts"];
const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") walk(p); }
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith(".d.ts")) files.push(p);
  }
}
DIRS.forEach((d) => walk(path.join(root, d)));

const isFunctionLike = (n) =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n) ||
  // a class field runs per instance, not at load
  ts.isPropertyDeclaration(n);

function clockRead(n) {
  // new Date() with no arguments, or new Date(Date.now() ...) (caught by the Date.now branch)
  if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "Date" && (!n.arguments || n.arguments.length === 0)) return "new Date()";
  if (ts.isCallExpression(n)) {
    const e = n.expression;
    if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "Date" && e.name.text === "now") return "Date.now()";
    if (ts.isIdentifier(e) && (e.text === "moment" || e.text === "dayjs") && n.arguments.length === 0) return e.text + "()";
    // Luxon (Elevate Pesa's date library): DateTime.now(), DateTime.local() with no arguments, businessNow().
    if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "DateTime" && (e.name.text === "now" || (e.name.text === "local" && n.arguments.length === 0))) return "DateTime." + e.name.text + "()";
    if (ts.isIdentifier(e) && e.text === "businessNow") return "businessNow()";
    if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === "moment" || e.expression.text === "dayjs") && e.name.text === "tz" ) return e.expression.text + ".tz()";
  }
  return null;
}

let count = 0;
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  if (!/new Date|Date\.now|moment|dayjs|DateTime\.(now|local)|businessNow/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (n, inFn) => {
    const hit = !inFn && clockRead(n);
    if (hit) {
      count++;
      const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
      const src = text.split(/\r?\n/)[line].trim();
      console.log(`${path.relative(root, file)}:${line + 1}  ${hit}  |  ${src.slice(0, 110)}`);
    }
    ts.forEachChild(n, (c) => visit(c, inFn || isFunctionLike(c)));
  };
  visit(sf, false);
}
console.log(`\n${count} clock reads at load time, in ${files.length} files scanned`);
process.exit(count > 0 ? 1 : 0);
