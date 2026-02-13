const fs = require('fs');

let content = fs.readFileSync('src/utils/plcopen-parser.ts', 'utf8');

// Fix dynamic property access error
// Replace 'empty[section.key] = vars;' with '(empty as any)[section.key] = vars;'
content = content.replace(
  '        empty[section.key] = vars;',
  '        (empty as any)[section.key] = vars;'
);

// Fix role type error
// Replace 'role: varEl.getAttribute(\'role\') || \'unknown\',' with 'role: (varEl.getAttribute(\'role\') || \'unknown\') as PlcopenFbdVariable[\'role\'],'
// But the snippet I saw earlier was slightly different. I need to be precise.
// Wait, snippet was:
/*
            .map((varEl) => ({
                localId: varEl.getAttribute('localId') || undefined,
*/
// I need to find where 'role' is assigned.
// I will search for 'role:' in the file.

if (content.includes('role: varEl.getAttribute(\\'role\\')')) {
  content = content.replace(
    /role: varEl.getAttribute\('role'\) \|\| 'unknown',/g,
    "role: (varEl.getAttribute('role') || 'unknown') as PlcopenFbdVariable['role'],"
  );
} else {
    // Maybe it's not exactly that.
    // I'll try a broader regex for the role assignment inside the map
    content = content.replace(
        /role:\s*['"](.*?)['"]\s*\|\|\s*['"](.*?)['"],/g,
        "role: ('' || '') as PlcopenFbdVariable['role'],"
    );
    // Actually, let's just use 'as any' for the whole object or role property if I can find it.
    // The previous error message said:
    // Type '{ ... role: string; }[]' is not assignable to type 'PlcopenFbdVariable[]'.
    // So the map returns an object with string role.

    // I'll just find the map callback and cast the result.
    // Or I can cast the role property value.

    // Let's try to match the block.
    // It's around line 256.

    // I'll replace the variable definition line to add 'as any'
    content = content.replace(
        'const variables: PlcopenFbdVariable[] = Array.from(',
        'const variables: PlcopenFbdVariable[] = (Array.from('
    );

    // And close it
    // This is hard with regex.

    // Better: cast the role value.
    // I'll try to find 'role:' assignment.
    // If I can't find exact string, I'll dump the file section to see.
}

fs.writeFileSync('src/utils/plcopen-parser.ts', content);
