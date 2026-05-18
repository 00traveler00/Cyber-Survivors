import subprocess
import sys

# Use Python to validate JS syntax by checking for common issues
with open('js/bundle.js', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f"Bundle: {len(lines)} lines, {len(content)} bytes")

# Check for unmatched braces/brackets/parens (outside strings and template literals)
def find_syntax_issues(content):
    stack = []
    in_string = False
    in_template = 0  # nesting level of template literals
    string_char = None
    escaped = False
    
    for i, ch in enumerate(content):
        line_num = content[:i].count('\n') + 1
        
        if escaped:
            escaped = False
            continue
            
        if ch == '\\':
            escaped = True
            continue
        
        if in_string:
            if ch == string_char:
                in_string = False
                string_char = None
            continue
        
        if ch in ('"', "'"):
            in_string = True
            string_char = ch
            continue
        
        if ch == '`':
            if in_template > 0:
                in_template -= 1
            else:
                in_template += 1
            continue
        
        if in_template > 0:
            continue
        
        if ch in ('{', '[', '('):
            stack.append((ch, line_num))
        elif ch in ('}', ']', ')'):
            if stack:
                open_ch, open_line = stack.pop()
                expected = {'}': '{', ']': '[', ')': '('}[ch]
                if open_ch != expected:
                    print(f"MISMATCH at line {line_num}: got '{ch}' but expected match for '{open_ch}' opened at line {open_line}")
                    if len(stack) < 5:
                        return
            else:
                print(f"UNMATCHED CLOSE at line {line_num}: '{ch}'")
                return
    
    if stack:
        print(f"UNCLOSED at end of file: {stack[-5:]}")
    else:
        print("Bracket balance OK!")
    
    if in_template > 0:
        print(f"WARNING: Unclosed template literal (depth={in_template})")

find_syntax_issues(content)
