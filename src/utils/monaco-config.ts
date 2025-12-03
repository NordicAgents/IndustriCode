import { editor, languages } from 'monaco-editor';

// Structured Text (IEC 61131-3) Language Definition
export const structuredTextConfig: languages.LanguageConfiguration = {
    comments: {
        lineComment: '//',
        blockComment: ['(*', '*)'],
    },
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
    ],
    autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
    ],
};

export const structuredTextTokensProvider: languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.st',

    keywords: [
        'PROGRAM',
        'END_PROGRAM',
        'FUNCTION',
        'END_FUNCTION',
        'FUNCTION_BLOCK',
        'END_FUNCTION_BLOCK',
        'VAR',
        'VAR_INPUT',
        'VAR_OUTPUT',
        'VAR_IN_OUT',
        'VAR_TEMP',
        'VAR_GLOBAL',
        'VAR_EXTERNAL',
        'END_VAR',
        'IF',
        'THEN',
        'ELSIF',
        'ELSE',
        'END_IF',
        'CASE',
        'OF',
        'END_CASE',
        'FOR',
        'TO',
        'BY',
        'DO',
        'END_FOR',
        'WHILE',
        'END_WHILE',
        'REPEAT',
        'UNTIL',
        'END_REPEAT',
        'RETURN',
        'EXIT',
        'CONTINUE',
        'AND',
        'OR',
        'XOR',
        'NOT',
        'MOD',
        'TRUE',
        'FALSE',
        'AT',
        'CONST',
        'END_CONST',
        'TYPE',
        'END_TYPE',
        'STRUCT',
        'END_STRUCT',
        'ARRAY',
    ],

    typeKeywords: [
        'BOOL',
        'BYTE',
        'WORD',
        'DWORD',
        'LWORD',
        'SINT',
        'INT',
        'DINT',
        'LINT',
        'USINT',
        'UINT',
        'UDINT',
        'ULINT',
        'REAL',
        'LREAL',
        'TIME',
        'DATE',
        'TIME_OF_DAY',
        'TOD',
        'DATE_AND_TIME',
        'DT',
        'STRING',
        'WSTRING',
    ],

    operators: [
        '=',
        '>',
        '<',
        ':=',
        '<=',
        '>=',
        '<>',
        '+',
        '-',
        '*',
        '/',
        '&',
        '^',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    tokenizer: {
        root: [
            // identifiers and keywords
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        '@typeKeywords': 'type.identifier',
                        '@keywords': 'keyword',
                        '@default': 'identifier',
                    },
                },
            ],
            [/[A-Z][\w\$]*/, 'type.identifier'], // Pascal case for types

            // whitespace
            { include: '@whitespace' },

            // delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [
                /@symbols/,
                {
                    cases: {
                        '@operators': 'operator',
                        '@default': '',
                    },
                },
            ],

            // numbers
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/\d+/, 'number'],

            // delimiter: after number because of .\d floats
            [/[;,.]/, 'delimiter'],

            // strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
            [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
        ],

        whitespace: [
            [/[ \t\r\n]+/, ''],
            [/\(\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
        ],

        comment: [
            [/[^(*]+/, 'comment'],
            [/\*\)/, 'comment', '@pop'],
            [/[(*]/, 'comment'],
        ],

        string_double: [
            [/[^\\"]+/, 'string'],
            [/"/, 'string', '@pop'],
        ],

        string_single: [
            [/[^\\']+/, 'string'],
            [/'/, 'string', '@pop'],
        ],
    },
};

export const instructionListTokensProvider: languages.IMonarchLanguage = {
    defaultToken: '',
    tokenPostfix: '.il',

    keywords: [
        'LD',
        'LDN',
        'ST',
        'STN',
        'S',
        'R',
        'AND',
        'ANDN',
        'OR',
        'ORN',
        'XOR',
        'XORN',
        'NOT',
        'ADD',
        'SUB',
        'MUL',
        'DIV',
        'MOD',
        'GT',
        'GE',
        'EQ',
        'NE',
        'LE',
        'LT',
        'JMP',
        'JMPC',
        'JMPCN',
        'CAL',
        'CALC',
        'CALCN',
        'RET',
        'RETC',
        'RETCN',
    ],

    typeKeywords: [
        'BOOL',
        'INT',
        'DINT',
        'REAL',
        'STRING',
        'TIME',
        'BYTE',
        'WORD',
        'DWORD',
    ],

    operators: ['(', ')'],

    tokenizer: {
        root: [
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        '@keywords': 'keyword',
                        '@typeKeywords': 'type',
                        '@default': 'identifier',
                    },
                },
            ],

            { include: '@whitespace' },

            [/\d+/, 'number'],
            [/[();,]/, 'delimiter'],
        ],

        whitespace: [
            [/[ \t\r\n]+/, ''],
            [/\(\*/, 'comment', '@comment'],
        ],

        comment: [
            [/[^(*]+/, 'comment'],
            [/\*\)/, 'comment', '@pop'],
            [/[(*]/, 'comment'],
        ],
    },
};

// Register the languages with Monaco
export function registerPLCLanguages() {
    // Register Structured Text
    languages.register({ id: 'structured-text' });
    languages.setLanguageConfiguration('structured-text', structuredTextConfig);
    languages.setMonarchTokensProvider('structured-text', structuredTextTokensProvider);

    // Register Instruction List
    languages.register({ id: 'instruction-list' });
    languages.setMonarchTokensProvider('instruction-list', instructionListTokensProvider);
}

// Editor theme configuration
export function getEditorTheme(isDark: boolean): editor.IStandaloneThemeData {
    return {
        base: isDark ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: isDark ? 'C586C0' : '0000FF' },
            { token: 'type.identifier', foreground: isDark ? '4EC9B0' : '267F99' },
            { token: 'identifier', foreground: isDark ? '9CDCFE' : '000000' },
            { token: 'number', foreground: isDark ? 'B5CEA8' : '098658' },
            { token: 'string', foreground: isDark ? 'CE9178' : 'A31515' },
            { token: 'comment', foreground: isDark ? '6A9955' : '008000', fontStyle: 'italic' },
        ],
        colors: isDark
            ? {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editor.lineHighlightBackground': '#2a2a2a',
                'editorCursor.foreground': '#ffffff',
                'editor.selectionBackground': '#264f78',
            }
            : {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
            },
    };
}

// Default editor options
export const defaultEditorOptions: editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    scrollBeyondLastLine: false,
    wordWrap: 'off',
    folding: true,
    bracketPairColorization: { enabled: true },
    suggest: {
        showKeywords: true,
        showSnippets: true,
    },
    quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
    },
};
