import re

with open('app/modules/reporting/brsr_generator.py', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(m):
    val = m.group(1).strip()
    code = m.group(2).strip()
    rest = m.group(3)
    if code.endswith('-PREV') or code.endswith('-P') or '-P-' in code or '-PREV-' in code:
        return f"render_num_cell(prev_v.get('{code}'), '{code}'{rest}"
    else:
        return f"render_num_cell(curr_v.get('{code}'), '{code}'{rest}"

# Matches render_num_cell(123, 'CODE', ...)
pattern = r"render_num_cell\(\s*([0-9.]+)\s*,\s*['\"]([^'\"]+)['\"]([^)]*)"
new_content = re.sub(pattern, replacer, content)

with open('app/modules/reporting/brsr_generator.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

calls = re.findall(r"render_num_cell\(([^,]+),", new_content)
literals = [c for c in calls if re.match(r"^\s*[0-9.]+\s*$", c)]
print("Total calls:", len(calls))
print("Remaining literal calls:", len(literals))
