import {
    PlcopenConfiguration,
    PlcopenFbdBlock,
    PlcopenFbdConnection,
    PlcopenFbdNetwork,
    PlcopenFbdVariable,
    PlcopenLdElement,
    PlcopenLdNetwork,
    PlcopenLdRung,
    PlcopenPou,
    PlcopenPouBody,
    PlcopenPouInterface,
    PlcopenPouType,
    PlcopenProject,
    PlcopenSfcAction,
    PlcopenSfcNetwork,
    PlcopenSfcStep,
    PlcopenSfcTransition,
    PlcopenStructuredText,
    PlcopenVarDeclaration,
} from '../types/plcopen-types';

const VAR_SECTION_TAGS: Array<{
    tag: string;
    key: keyof PlcopenPouInterface;
}> = [
    { tag: 'inputVars', key: 'inputs' },
    { tag: 'outputVars', key: 'outputs' },
    { tag: 'inOutVars', key: 'inOuts' },
    { tag: 'localVars', key: 'locals' },
    { tag: 'tempVars', key: 'temps' },
    { tag: 'externalVars', key: 'externals' },
];

function readTextContent(element?: Element | null): string | undefined {
    if (!element) return undefined;
    const text = element.textContent?.trim();
    return text ? text : undefined;
}

function readDocumentation(element: Element): string | undefined {
    const documentation = element.getElementsByTagName('documentation')[0];
    return readTextContent(documentation);
}

function parseType(typeElement?: Element | null): string | undefined {
    if (!typeElement) return undefined;

    const derived = typeElement.getElementsByTagName('derived')[0];
    if (derived?.getAttribute('name')) {
        return derived.getAttribute('name') || undefined;
    }

    const arrayEl = typeElement.getElementsByTagName('array')[0];
    if (arrayEl) {
        const dimension = arrayEl.getElementsByTagName('dimension')[0];
        const lower = dimension?.getAttribute('lower');
        const upper = dimension?.getAttribute('upper');
        const baseTypeEl = arrayEl.getElementsByTagName('baseType')[0];
        const baseType = parseType(baseTypeEl) || 'UNKNOWN';
        if (lower && upper) {
            return `ARRAY[${lower}..${upper}] OF ${baseType}`;
        }
        return `ARRAY OF ${baseType}`;
    }

    const child = Array.from(typeElement.children).find((el) => el.tagName);
    return child ? child.tagName : undefined;
}

function parseVarDeclaration(variableEl: Element): PlcopenVarDeclaration | null {
    const name = variableEl.getAttribute('name');
    if (!name) return null;

    const type = parseType(variableEl.getElementsByTagName('type')[0]) || 'UNKNOWN';
    const address = variableEl.getAttribute('address') || undefined;
    const comment = readDocumentation(variableEl);

    let initialValue: string | undefined;
    const initialValueEl = variableEl.getElementsByTagName('initialValue')[0];
    if (initialValueEl) {
        const simpleValue = initialValueEl.getElementsByTagName('simpleValue')[0];
        initialValue =
            simpleValue?.getAttribute('value') ||
            readTextContent(initialValueEl) ||
            undefined;
    }

    return {
        name,
        type,
        comment,
        address,
        initialValue,
    };
}

function parseInterface(pouEl: Element): PlcopenPouInterface {
    const empty: PlcopenPouInterface = {
        inputs: [],
        outputs: [],
        inOuts: [],
        locals: [],
        temps: [],
        externals: [],
    };

    const interfaceEl = pouEl.getElementsByTagName('interface')[0];
    if (!interfaceEl) {
        return empty;
    }

    for (const section of VAR_SECTION_TAGS) {
        const sectionEl = interfaceEl.getElementsByTagName(section.tag)[0];
        if (!sectionEl) continue;
        const vars = Array.from(sectionEl.getElementsByTagName('variable'))
            .map(parseVarDeclaration)
            .filter(Boolean) as PlcopenVarDeclaration[];
        empty[section.key] = vars;
    }

    const returnTypeEl = interfaceEl.getElementsByTagName('returnType')[0];
    if (returnTypeEl) {
        empty.returnType = parseType(returnTypeEl) || undefined;
    }

    return empty;
}

function normalizePouType(raw?: string | null): PlcopenPouType {
    if (!raw) return 'unknown';
    const lower = raw.toLowerCase();
    if (lower === 'program') return 'program';
    if (lower === 'functionblock') return 'functionBlock';
    if (lower === 'function') return 'function';
    return 'unknown';
}

function parseStructuredText(stEl?: Element | null): PlcopenStructuredText | undefined {
    if (!stEl) return undefined;
    const text = stEl.textContent?.replace(/\r\n/g, '\n').trim();
    if (!text) return undefined;
    return { code: text };
}

function parseSfc(sfcEl?: Element | null): PlcopenSfcNetwork | undefined {
    if (!sfcEl) return undefined;
    const steps: PlcopenSfcStep[] = Array.from(sfcEl.getElementsByTagName('step')).map(
        (stepEl) => {
            const name = stepEl.getAttribute('name') || 'UnnamedStep';
            const initial = stepEl.getAttribute('initialStep') === 'true';
            const actionBlocks = Array.from(stepEl.getElementsByTagName('actionBlock')).map(
                (actionBlock) => actionBlock.getAttribute('action') || 'UnnamedAction'
            );
            return { name, initial, actionBlocks };
        }
    );

    const transitions: PlcopenSfcTransition[] = Array.from(
        sfcEl.getElementsByTagName('transition')
    ).map((transitionEl) => {
        const name = transitionEl.getAttribute('name') || undefined;
        const conditionEl = transitionEl.getElementsByTagName('condition')[0];
        const conditionSt = parseStructuredText(conditionEl?.getElementsByTagName('ST')[0]);
        const from = Array.from(transitionEl.getElementsByTagName('from')).map((fromEl) =>
            fromEl.getAttribute('step') || 'Unknown'
        );
        const to = Array.from(transitionEl.getElementsByTagName('to')).map((toEl) =>
            toEl.getAttribute('step') || 'Unknown'
        );
        return {
            name,
            from,
            to,
            condition: conditionSt?.code,
        };
    });

    const actions: PlcopenSfcAction[] = Array.from(sfcEl.getElementsByTagName('action')).map(
        (actionEl) => {
            const name = actionEl.getAttribute('name') || 'UnnamedAction';
            const body = parseStructuredText(actionEl.getElementsByTagName('ST')[0]);
            return { name, body };
        }
    );

    return { steps, transitions, actions };
}

function parseLdNetwork(ldEl?: Element | null): PlcopenLdNetwork[] {
    if (!ldEl) return [];
    return Array.from(ldEl.getElementsByTagName('network')).map((networkEl, index) => {
        const elements: PlcopenLdElement[] = Array.from(networkEl.children)
            .filter((child) => child.tagName !== 'comment')
            .map((child) => ({
                type: child.tagName,
                name: child.getAttribute('name') || undefined,
                variable: child.getAttribute('variable') || undefined,
                expression: child.getAttribute('expression') || undefined,
                localId: child.getAttribute('localId') || undefined,
                negated: child.getAttribute('negated') === 'true',
            }));

        const rung: PlcopenLdRung = {
            id: networkEl.getAttribute('localId') || `${index + 1}`,
            comment: readTextContent(networkEl.getElementsByTagName('comment')[0]),
            elements,
        };

        return {
            id: networkEl.getAttribute('name') || networkEl.getAttribute('localId') || undefined,
            comment: readTextContent(networkEl.getElementsByTagName('comment')[0]),
            rungs: [rung],
        };
    });
}

function parseFbdNetwork(fbdEl?: Element | null): PlcopenFbdNetwork[] {
    if (!fbdEl) return [];
    return Array.from(fbdEl.getElementsByTagName('network')).map((networkEl) => {
        const blocks: PlcopenFbdBlock[] = Array.from(networkEl.getElementsByTagName('block')).map(
            (blockEl) => ({
                localId: blockEl.getAttribute('localId') || undefined,
                type: blockEl.getAttribute('typeName') || blockEl.getAttribute('type') || 'UNKNOWN',
                instanceName: blockEl.getAttribute('instanceName') || undefined,
                name: blockEl.getAttribute('name') || undefined,
                position: {
                    x: blockEl.getAttribute('x') ? Number(blockEl.getAttribute('x')) : undefined,
                    y: blockEl.getAttribute('y') ? Number(blockEl.getAttribute('y')) : undefined,
                },
                inputs: Array.from(blockEl.getElementsByTagName('inputVariables')).flatMap(
                    (inputsEl) =>
                        Array.from(inputsEl.getElementsByTagName('variable')).map((varEl) => ({
                            name: varEl.getAttribute('formalParameter') || undefined,
                            negated: varEl.getAttribute('negated') === 'true',
                        }))
                ),
                outputs: Array.from(blockEl.getElementsByTagName('outputVariables')).flatMap(
                    (outputsEl) =>
                        Array.from(outputsEl.getElementsByTagName('variable')).map((varEl) => ({
                            name: varEl.getAttribute('formalParameter') || undefined,
                            negated: varEl.getAttribute('negated') === 'true',
                        }))
                ),
            })
        );

        const connections: PlcopenFbdConnection[] = Array.from(
            networkEl.getElementsByTagName('connection')
        ).map((connectionEl) => ({
            source: connectionEl.getAttribute('refLocalId') || 'Unknown',
            target: connectionEl.getAttribute('formalParameter') || 'Unknown',
            formalParameter: connectionEl.getAttribute('formalParameter') || undefined,
        }));

        const variables: PlcopenFbdVariable[] = Array.from(
            networkEl.getElementsByTagName('inVariable')
        )
            .map((varEl) => ({
                localId: varEl.getAttribute('localId') || undefined,
                name: varEl.getAttribute('expression') || undefined,
                role: 'in',
            }))
            .concat(
                Array.from(networkEl.getElementsByTagName('outVariable')).map((varEl) => ({
                    localId: varEl.getAttribute('localId') || undefined,
                    name: varEl.getAttribute('expression') || undefined,
                    role: 'out',
                }))
            );

        return {
            id: networkEl.getAttribute('name') || networkEl.getAttribute('localId') || undefined,
            comment: readTextContent(networkEl.getElementsByTagName('comment')[0]),
            blocks,
            connections,
            variables,
        };
    });
}

function parsePouBody(pouEl: Element): PlcopenPouBody {
    const bodyEl = pouEl.getElementsByTagName('body')[0];
    const st = parseStructuredText(bodyEl?.getElementsByTagName('ST')[0]);
    const sfc = parseSfc(bodyEl?.getElementsByTagName('SFC')[0]);
    const ldNetworks = parseLdNetwork(bodyEl?.getElementsByTagName('LD')[0]);
    const fbdNetworks = parseFbdNetwork(bodyEl?.getElementsByTagName('FBD')[0]);

    return {
        st,
        sfc,
        ldNetworks,
        fbdNetworks,
    };
}

function parsePous(doc: Document): PlcopenPou[] {
    const pouEls = Array.from(doc.querySelectorAll('types > pous > pou'));
    return pouEls.map((pouEl) => {
        const name = pouEl.getAttribute('name') || 'UnnamedPOU';
        const pouType = normalizePouType(pouEl.getAttribute('pouType'));
        return {
            name,
            pouType,
            interface: parseInterface(pouEl),
            body: parsePouBody(pouEl),
        };
    });
}

function parseConfigurations(doc: Document): PlcopenConfiguration[] {
    const configurations: PlcopenConfiguration[] = [];
    const configurationEls = Array.from(
        doc.querySelectorAll('instances > configurations > configuration')
    );

    configurationEls.forEach((configEl) => {
        const resources = Array.from(configEl.getElementsByTagName('resource')).map((resourceEl) => {
            const tasks = Array.from(resourceEl.getElementsByTagName('task')).map((taskEl) => ({
                name: taskEl.getAttribute('name') || 'UnnamedTask',
                interval: taskEl.getAttribute('interval') || undefined,
                priority: taskEl.getAttribute('priority') || undefined,
            }));

            const instances = Array.from(resourceEl.getElementsByTagName('pouInstance')).map(
                (instanceEl) => ({
                    name: instanceEl.getAttribute('name') || undefined,
                    typeName: instanceEl.getAttribute('typeName') || undefined,
                })
            );

            return {
                name: resourceEl.getAttribute('name') || 'UnnamedResource',
                tasks,
                instances,
            };
        });

        configurations.push({
            name: configEl.getAttribute('name') || 'UnnamedConfiguration',
            resources,
        });
    });

    return configurations;
}

export function parsePlcopenProject(xmlText: string): PlcopenProject | null {
    if (!xmlText || !xmlText.trim()) {
        return null;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const parserErrors = doc.getElementsByTagName('parsererror');
    if (parserErrors && parserErrors.length > 0) {
        console.error('[PLCopen Parser] XML parser error:', parserErrors[0].textContent);
        return null;
    }

    const projectEl = doc.getElementsByTagName('project')[0];
    if (!projectEl) {
        return null;
    }

    const fileHeader = doc.getElementsByTagName('fileHeader')[0];
    const contentHeader = doc.getElementsByTagName('contentHeader')[0];

    const project: PlcopenProject = {
        name: projectEl.getAttribute('name') || undefined,
        companyName: fileHeader?.getAttribute('companyName') || undefined,
        productName: fileHeader?.getAttribute('productName') || undefined,
        productVersion: fileHeader?.getAttribute('productVersion') || undefined,
        copyright: fileHeader?.getAttribute('copyright') || undefined,
        pous: parsePous(doc),
        configurations: parseConfigurations(doc),
    };

    if (!project.name) {
        project.name =
            contentHeader?.getAttribute('name') ||
            contentHeader?.getAttribute('projectName') ||
            undefined;
    }

    return project;
}
