# Logic & Control Flow Nodes Demo

Demonstrates BrowserMesh's logic and control-flow node types: compare, and, or, not, if, switch, break, and continue.

## Workflow Sections

### 1. Data Logic (compare → and → not → or)
- `src_age`/`src_18` provide constants via Global State `set` operations
- `cmp_age`: checks `age >= 18` using the `>=(greater_than_or_equal)` operator
- `and_active`: combines the compare result with an `active=true` constant (`true AND true = true`)
- `not_active`: inverts the `active` constant (`NOT true = false`)
- `or_cond`: ORs the AND and NOT results

### 2. Conditional Branching (if)
- `if_adult`: routes to the `true` or `false` flow output based on the `and_active` result
- Both branches converge to the same output nodes

### 3. Multi-case Branching (switch)
- `sw_role`: matches `inputs.value` against `config.cases` (`["admin", "user"]`)
- On match: routes to `case_N` flow output. On no match: routes to `default` flow output
- All branches converge to the loop section

### 4. Loop with Break/Continue
- `sel_items` selects all `.item` elements → `loop` iterates
- Inside the loop body:
  - `ext_name`: extracts text from the current element
  - `cmp_skip`: checks if text equals `"skip"`
  - `if_skip`: if skip → `continue_node` (skips to next iteration)
  - `cmp_max`: checks if loop index > 5
  - `if_max`: if true → `break_node` (stops the loop), else saves the name via `out_name`

## Node Types Demonstrated

| Node | Type | Purpose |
|---|---|---|
| compare | Data | Compare two values with configurable operator |
| and | Data | Boolean AND |
| or | Data | Boolean OR |
| not | Data | Boolean NOT |
| if | Flow | Conditional branching (true/false) |
| switch | Flow | Multi-case branching with default fallback |
| break | Flow | Exit the enclosing loop |
| continue | Flow | Skip to next loop iteration |

## Running

See [runtime README](../../apps/runtime/README.md) for instructions on running BrowserMesh workflows.
