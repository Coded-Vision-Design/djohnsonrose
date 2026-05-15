// assets/js/components/apps/database-sql.js
//
// Plain-JS port of v2/src/apps/database/sql.ts. Same grammar:
//
//   SELECT <cols> FROM <table>
//     [WHERE <cond> [AND|OR <cond>]…]
//     [ORDER BY <col> [ASC|DESC]]
//     [LIMIT <n>]
//
// Exposes a single global `window.PortfolioSQL` with `parse(sql)`, `execute(ast,
// rows)`, and `EXAMPLES`. v1 Alpine `databaseApp()` consumes it; v2 has its own
// typed copy.

(function () {
    const KEYWORDS = new Set([
        'select', 'from', 'where', 'and', 'or', 'order', 'by', 'asc', 'desc', 'limit', 'like', 'not',
    ]);

    function tokenize(src) {
        const out = [];
        let i = 0;
        while (i < src.length) {
            const ch = src[i];
            if (/\s/.test(ch)) { i++; continue; }
            if (ch === '*' || ch === '(' || ch === ')' || ch === ',') { out.push({ type: 'op', value: ch }); i++; continue; }
            if (ch === '=' || ch === '<' || ch === '>' || ch === '!') {
                let op = ch;
                if (src[i + 1] === '=' || (ch === '<' && src[i + 1] === '>')) { op += src[i + 1]; i += 2; }
                else { i += 1; }
                out.push({ type: 'op', value: op });
                continue;
            }
            if (ch === "'" || ch === '"') {
                const quote = ch;
                let j = i + 1; let str = '';
                while (j < src.length && src[j] !== quote) {
                    if (src[j] === '\\' && j + 1 < src.length) { str += src[j + 1]; j += 2; }
                    else { str += src[j]; j += 1; }
                }
                if (j >= src.length) throw new Error(`Unterminated string literal at column ${i + 1}`);
                out.push({ type: 'string', value: str }); i = j + 1; continue;
            }
            if (/[0-9]/.test(ch)) {
                let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
                out.push({ type: 'number', value: Number(src.slice(i, j)) }); i = j; continue;
            }
            if (/[a-zA-Z_\[`]/.test(ch)) {
                let j = i; while (j < src.length && /[a-zA-Z0-9_.\[\]`]/.test(src[j])) j++;
                const word = src.slice(i, j); const lower = word.toLowerCase();
                if (KEYWORDS.has(lower)) out.push({ type: 'kw', value: lower });
                else {
                    const clean = word.replace(/[`\[\]]/g, '').split('.').pop() || word;
                    out.push({ type: 'ident', value: clean });
                }
                i = j; continue;
            }
            throw new Error(`Unexpected character '${ch}' at column ${i + 1}`);
        }
        return out;
    }

    function describe(t) {
        if (!t) return 'end of query';
        if (t.type === 'kw') return t.value.toUpperCase();
        return String(t.value);
    }

    function parse(sql) {
        const tokens = tokenize(sql.trim().replace(/;\s*$/, ''));
        let pos = 0;
        const peek = () => tokens[pos];
        const eat = (predicate, expected) => {
            const t = tokens[pos];
            if (!t || !predicate(t)) throw new Error(`Expected ${expected}, got '${describe(t)}'`);
            pos++; return t;
        };
        const consumeKw = (kw) => eat((t) => t.type === 'kw' && t.value === kw, kw.toUpperCase());

        consumeKw('select');

        const columns = [];
        if (peek() && peek().type === 'op' && peek().value === '*') { pos++; columns.push('*'); }
        else {
            columns.push(eat((t) => t.type === 'ident', 'column name').value);
            while (peek() && peek().type === 'op' && peek().value === ',') {
                pos++; columns.push(eat((t) => t.type === 'ident', 'column name').value);
            }
        }

        consumeKw('from');
        const table = eat((t) => t.type === 'ident', 'table name').value.toLowerCase();

        let where = null;
        if (peek() && peek().type === 'kw' && peek().value === 'where') { pos++; where = parseExpr(); }

        let orderBy = null;
        if (peek() && peek().type === 'kw' && peek().value === 'order') {
            pos++; consumeKw('by');
            const col = eat((t) => t.type === 'ident', 'column name').value;
            let direction = 'ASC';
            if (peek() && peek().type === 'kw' && (peek().value === 'asc' || peek().value === 'desc')) {
                direction = peek().value.toUpperCase(); pos++;
            }
            orderBy = { column: col, direction };
        }

        let limit = null;
        if (peek() && peek().type === 'kw' && peek().value === 'limit') {
            pos++;
            const n = eat((t) => t.type === 'number', 'limit number');
            limit = Math.max(0, Math.floor(n.value));
        }

        if (pos < tokens.length) throw new Error(`Unexpected '${describe(tokens[pos])}' after end of statement`);
        return { columns, table, where, orderBy, limit };

        function parseExpr() {
            let left = parseAnd();
            while (peek() && peek().type === 'kw' && peek().value === 'or') {
                pos++; left = { kind: 'or', left, right: parseAnd() };
            }
            return left;
        }
        function parseAnd() {
            let left = parseCmp();
            while (peek() && peek().type === 'kw' && peek().value === 'and') {
                pos++; left = { kind: 'and', left, right: parseCmp() };
            }
            return left;
        }
        function parseCmp() {
            const column = eat((t) => t.type === 'ident', 'column name').value;
            let op;
            const t = peek();
            if (t && t.type === 'kw' && t.value === 'not') { pos++; consumeKw('like'); op = 'NOT LIKE'; }
            else if (t && t.type === 'kw' && t.value === 'like') { pos++; op = 'LIKE'; }
            else if (t && t.type === 'op' && ['=', '!=', '<>', '<', '<=', '>', '>='].indexOf(t.value) !== -1) { op = t.value; pos++; }
            else throw new Error(`Expected comparison operator after '${column}'`);
            const valTok = eat((tt) => tt.type === 'string' || tt.type === 'number', 'literal value');
            return { kind: 'cmp', column, op, value: valTok.value };
        }
    }

    function evalCondition(cond, row) {
        if (cond.kind === 'and') return evalCondition(cond.left, row) && evalCondition(cond.right, row);
        if (cond.kind === 'or')  return evalCondition(cond.left, row) || evalCondition(cond.right, row);
        const lhs = row[cond.column]; const rhs = cond.value;
        const looseEq = (a, b) => {
            if (a == null) return b == null;
            if (typeof a === 'number' && typeof b === 'number') return a === b;
            return String(a).toLowerCase() === String(b).toLowerCase();
        };
        const numericPair = (a, b, fn) => {
            const ax = Number(a), bx = Number(b);
            if (isNaN(ax) || isNaN(bx)) return false;
            return fn(ax, bx);
        };
        const likeMatch = (value, pattern) => {
            const re = new RegExp(
                '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$',
                'i'
            );
            return re.test(value);
        };
        switch (cond.op) {
            case '=':       return looseEq(lhs, rhs);
            case '!=':
            case '<>':      return !looseEq(lhs, rhs);
            case '<':       return numericPair(lhs, rhs, (a, b) => a < b);
            case '<=':      return numericPair(lhs, rhs, (a, b) => a <= b);
            case '>':       return numericPair(lhs, rhs, (a, b) => a > b);
            case '>=':      return numericPair(lhs, rhs, (a, b) => a >= b);
            case 'LIKE':    return likeMatch(String(lhs == null ? '' : lhs), String(rhs));
            case 'NOT LIKE':return !likeMatch(String(lhs == null ? '' : lhs), String(rhs));
        }
        return false;
    }

    function execute(ast, rows) {
        let result = rows;
        if (ast.where) result = result.filter((r) => evalCondition(ast.where, r));
        if (ast.orderBy) {
            const { column, direction } = ast.orderBy;
            result = result.slice().sort((a, b) => {
                const av = a[column], bv = b[column];
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                const cmp = typeof av === 'number' && typeof bv === 'number'
                    ? av - bv
                    : String(av).localeCompare(String(bv));
                return direction === 'ASC' ? cmp : -cmp;
            });
        }
        if (ast.limit != null) result = result.slice(0, ast.limit);
        if (ast.columns.indexOf('*') === -1) {
            result = result.map((r) => {
                const out = {};
                for (const c of ast.columns) out[c] = r[c] == null ? null : r[c];
                return out;
            });
        }
        return result;
    }

    const EXAMPLES = [
        { label: "Find roles with 'SCCM'",     sql: "SELECT role, company, period FROM experience WHERE highlights LIKE '%SCCM%'" },
        { label: 'Microsoft certifications',   sql: "SELECT name, year FROM certifications WHERE issuer = 'Microsoft'" },
        { label: 'Anthropic certifications',   sql: "SELECT name FROM certifications WHERE issuer = 'Anthropic' ORDER BY name" },
        { label: 'Frontend skills',            sql: "SELECT name FROM skills WHERE category = 'frameworks' ORDER BY name" },
        { label: 'Projects built with React',  sql: "SELECT title, location FROM projects WHERE tags LIKE '%React%'" },
        { label: 'UK-based clients',           sql: "SELECT title, url FROM projects WHERE location = 'UK'" },
        { label: 'Most recent 3 jobs',         sql: 'SELECT role, company, period FROM experience ORDER BY id DESC LIMIT 3' },
        { label: 'All achievements',           sql: 'SELECT title, result FROM achievements' },
    ];

    window.PortfolioSQL = { parse, execute, EXAMPLES };
})();
