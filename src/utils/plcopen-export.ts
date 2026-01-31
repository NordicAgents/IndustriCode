import {
    PlcopenFbdBlock,
    PlcopenFbdNetwork,
    PlcopenFbdVariable,
    PlcopenLdNetwork,
    PlcopenPou,
    PlcopenProject,
    PlcopenSfcNetwork,
    PlcopenVarDeclaration,
} from '../types/plcopen-types';

const PLCOPEN_XMLNS = 'http://www.plcopen.org/xml/tc6_0201';

type VarSection = { tag: string; vars: PlcopenVarDeclaration[] };

type ElementFactory = (name: string, attributes?: Record<string, string>) => Element;

const createElementFactory = (doc: Document): ElementFactory => (name, attributes = {}) => {
    const el = doc.createElement(name);
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            el.setAttribute(key, value);
        }
    });
    return el;
};

const appendOptionalText = (doc: Document, parent: Element, tag: string, text?: string) => {
    if (!text) return;
    const el = doc.createElement(tag);
    el.appendChild(doc.createTextNode(text));
    parent.appendChild(el);
};

const buildTypeElement = (doc: Document, type: string): Element => {
    const typeEl = doc.createElement('type');
    const arrayMatch = type.match(/^ARRAY\s*(\[[^\]]+\])?\s*OF\s+(.+)$/i);

    if (arrayMatch) {
        const dimensions = arrayMatch[1];
        const baseType = arrayMatch[2].trim();
        const arrayEl = doc.createElement('array');

        if (dimensions) {
            const rangeMatch = dimensions.match(/\[\s*([^\.]+)\s*\.\.\s*([^\]]+)\s*\]/);
            if (rangeMatch) {
                const dimensionEl = doc.createElement('dimension');
                dimensionEl.setAttribute('lower', rangeMatch[1].trim());
                dimensionEl.setAttribute('upper', rangeMatch[2].trim());
                arrayEl.appendChild(dimensionEl);
            }
        }

        const baseTypeEl = doc.createElement('baseType');
        const baseTypeInner = buildTypeElement(doc, baseType);
        baseTypeEl.appendChild(baseTypeInner);
        arrayEl.appendChild(baseTypeEl);
        typeEl.appendChild(arrayEl);
        return typeEl;
    }

    const derivedEl = doc.createElement('derived');
    derivedEl.setAttribute('name', type);
    typeEl.appendChild(derivedEl);
    return typeEl;
};

const appendVarSection = (
    doc: Document,
    interfaceEl: Element,
    section: VarSection,
    createElement: ElementFactory
) => {
    if (section.vars.length === 0) return;
    const sectionEl = doc.createElement(section.tag);

    section.vars.forEach((variable) => {
        const varEl = createElement('variable', {
            name: variable.name,
            address: variable.address || '',
        });
        varEl.appendChild(buildTypeElement(doc, variable.type));
        if (variable.initialValue) {
            const initialValue = doc.createElement('initialValue');
            const simpleValue = doc.createElement('simpleValue');
            simpleValue.setAttribute('value', variable.initialValue);
            initialValue.appendChild(simpleValue);
            varEl.appendChild(initialValue);
        }
        appendOptionalText(doc, varEl, 'documentation', variable.comment);
        sectionEl.appendChild(varEl);
    });

    interfaceEl.appendChild(sectionEl);
};

const buildPouInterface = (doc: Document, pou: PlcopenPou, createElement: ElementFactory) => {
    const interfaceEl = doc.createElement('interface');
    const sections: VarSection[] = [
        { tag: 'inputVars', vars: pou.interface.inputs },
        { tag: 'outputVars', vars: pou.interface.outputs },
        { tag: 'inOutVars', vars: pou.interface.inOuts },
        { tag: 'localVars', vars: pou.interface.locals },
        { tag: 'tempVars', vars: pou.interface.temps },
        { tag: 'externalVars', vars: pou.interface.externals },
    ];

    sections.forEach((section) => appendVarSection(doc, interfaceEl, section, createElement));

    if (pou.interface.returnType) {
        const returnTypeEl = doc.createElement('returnType');
        returnTypeEl.appendChild(buildTypeElement(doc, pou.interface.returnType));
        interfaceEl.appendChild(returnTypeEl);
    }

    return interfaceEl;
};

const appendStructuredText = (doc: Document, parent: Element, code?: string) => {
    if (!code) return;
    const stEl = doc.createElement('ST');
    stEl.appendChild(doc.createTextNode(code));
    parent.appendChild(stEl);
};

const appendSfc = (doc: Document, bodyEl: Element, sfc?: PlcopenSfcNetwork) => {
    if (!sfc) return;
    const sfcEl = doc.createElement('SFC');

    sfc.steps.forEach((step) => {
        const stepEl = doc.createElement('step');
        stepEl.setAttribute('name', step.name);
        if (step.initial) {
            stepEl.setAttribute('initialStep', 'true');
        }
        step.actionBlocks.forEach((action) => {
            const actionEl = doc.createElement('actionBlock');
            actionEl.setAttribute('action', action);
            stepEl.appendChild(actionEl);
        });
        sfcEl.appendChild(stepEl);
    });

    sfc.transitions.forEach((transition) => {
        const transitionEl = doc.createElement('transition');
        if (transition.name) {
            transitionEl.setAttribute('name', transition.name);
        }
        transition.from.forEach((from) => {
            const fromEl = doc.createElement('from');
            fromEl.setAttribute('step', from);
            transitionEl.appendChild(fromEl);
        });
        transition.to.forEach((to) => {
            const toEl = doc.createElement('to');
            toEl.setAttribute('step', to);
            transitionEl.appendChild(toEl);
        });
        if (transition.condition) {
            const conditionEl = doc.createElement('condition');
            appendStructuredText(doc, conditionEl, transition.condition);
            transitionEl.appendChild(conditionEl);
        }
        sfcEl.appendChild(transitionEl);
    });

    sfc.actions.forEach((action) => {
        const actionEl = doc.createElement('action');
        actionEl.setAttribute('name', action.name);
        if (action.body?.code) {
            appendStructuredText(doc, actionEl, action.body.code);
        }
        sfcEl.appendChild(actionEl);
    });

    bodyEl.appendChild(sfcEl);
};

const appendLdNetworks = (doc: Document, bodyEl: Element, networks: PlcopenLdNetwork[]) => {
    if (networks.length === 0) return;
    const ldEl = doc.createElement('LD');

    networks.forEach((network, networkIndex) => {
        const rungs = network.rungs.length > 0 ? network.rungs : [{ elements: [] }];
        rungs.forEach((rung, rungIndex) => {
            const networkEl = doc.createElement('network');
            const localId = rung.id || network.id || `${networkIndex + 1}-${rungIndex + 1}`;
            networkEl.setAttribute('localId', localId);
            if (network.id) {
                networkEl.setAttribute('name', network.id);
            }
            appendOptionalText(doc, networkEl, 'comment', rung.comment || network.comment);
            rung.elements.forEach((element) => {
                const elementEl = doc.createElement(element.type);
                if (element.name) elementEl.setAttribute('name', element.name);
                if (element.variable) elementEl.setAttribute('variable', element.variable);
                if (element.expression) elementEl.setAttribute('expression', element.expression);
                if (element.localId) elementEl.setAttribute('localId', element.localId);
                if (element.negated) elementEl.setAttribute('negated', 'true');
                networkEl.appendChild(elementEl);
            });
            ldEl.appendChild(networkEl);
        });
    });

    bodyEl.appendChild(ldEl);
};

const appendFbdVariables = (doc: Document, networkEl: Element, variables: PlcopenFbdVariable[]) => {
    variables.forEach((variable) => {
        const role = variable.role === 'out' ? 'outVariable' : 'inVariable';
        const varEl = doc.createElement(role);
        if (variable.localId) varEl.setAttribute('localId', variable.localId);
        if (variable.name) varEl.setAttribute('expression', variable.name);
        networkEl.appendChild(varEl);
    });
};

const appendFbdBlocks = (doc: Document, networkEl: Element, blocks: PlcopenFbdBlock[]) => {
    blocks.forEach((block) => {
        const blockEl = doc.createElement('block');
        if (block.localId) blockEl.setAttribute('localId', block.localId);
        blockEl.setAttribute('typeName', block.type);
        if (block.instanceName) blockEl.setAttribute('instanceName', block.instanceName);
        if (block.name) blockEl.setAttribute('name', block.name);
        if (block.position?.x !== undefined) {
            blockEl.setAttribute('x', String(block.position.x));
        }
        if (block.position?.y !== undefined) {
            blockEl.setAttribute('y', String(block.position.y));
        }
        if (block.inputs.length > 0) {
            const inputsEl = doc.createElement('inputVariables');
            block.inputs.forEach((input) => {
                const varEl = doc.createElement('variable');
                if (input.name) varEl.setAttribute('formalParameter', input.name);
                if (input.negated) varEl.setAttribute('negated', 'true');
                inputsEl.appendChild(varEl);
            });
            blockEl.appendChild(inputsEl);
        }
        if (block.outputs.length > 0) {
            const outputsEl = doc.createElement('outputVariables');
            block.outputs.forEach((output) => {
                const varEl = doc.createElement('variable');
                if (output.name) varEl.setAttribute('formalParameter', output.name);
                if (output.negated) varEl.setAttribute('negated', 'true');
                outputsEl.appendChild(varEl);
            });
            blockEl.appendChild(outputsEl);
        }
        networkEl.appendChild(blockEl);
    });
};

const appendFbdNetworks = (doc: Document, bodyEl: Element, networks: PlcopenFbdNetwork[]) => {
    if (networks.length === 0) return;
    const fbdEl = doc.createElement('FBD');

    networks.forEach((network, index) => {
        const networkEl = doc.createElement('network');
        if (network.id) {
            networkEl.setAttribute('name', network.id);
        } else {
            networkEl.setAttribute('localId', `${index + 1}`);
        }
        appendOptionalText(doc, networkEl, 'comment', network.comment);
        appendFbdBlocks(doc, networkEl, network.blocks);
        network.connections.forEach((connection) => {
            const connEl = doc.createElement('connection');
            connEl.setAttribute('refLocalId', connection.source);
            connEl.setAttribute('formalParameter', connection.target);
            networkEl.appendChild(connEl);
        });
        appendFbdVariables(doc, networkEl, network.variables);
        fbdEl.appendChild(networkEl);
    });

    bodyEl.appendChild(fbdEl);
};

const buildPouBody = (doc: Document, pou: PlcopenPou) => {
    const bodyEl = doc.createElement('body');
    if (pou.body.st) {
        appendStructuredText(doc, bodyEl, pou.body.st.code);
    }
    appendSfc(doc, bodyEl, pou.body.sfc);
    appendLdNetworks(doc, bodyEl, pou.body.ldNetworks);
    appendFbdNetworks(doc, bodyEl, pou.body.fbdNetworks);
    return bodyEl;
};

const buildPous = (doc: Document, project: PlcopenProject, createElement: ElementFactory) => {
    const typesEl = doc.createElement('types');
    const pousEl = doc.createElement('pous');

    project.pous.forEach((pou) => {
        const pouEl = createElement('pou', {
            name: pou.name,
            pouType: pou.pouType === 'functionBlock' ? 'functionBlock' : pou.pouType,
        });
        pouEl.appendChild(buildPouInterface(doc, pou, createElement));
        pouEl.appendChild(buildPouBody(doc, pou));
        pousEl.appendChild(pouEl);
    });

    typesEl.appendChild(pousEl);
    return typesEl;
};

const buildConfigurations = (doc: Document, project: PlcopenProject) => {
    const instancesEl = doc.createElement('instances');
    const configurationsEl = doc.createElement('configurations');

    project.configurations.forEach((config) => {
        const configEl = doc.createElement('configuration');
        configEl.setAttribute('name', config.name);
        config.resources.forEach((resource) => {
            const resourceEl = doc.createElement('resource');
            resourceEl.setAttribute('name', resource.name);
            resource.tasks.forEach((task) => {
                const taskEl = doc.createElement('task');
                taskEl.setAttribute('name', task.name);
                if (task.interval) taskEl.setAttribute('interval', task.interval);
                if (task.priority) taskEl.setAttribute('priority', task.priority);
                resourceEl.appendChild(taskEl);
            });
            resource.instances.forEach((instance) => {
                const instanceEl = doc.createElement('pouInstance');
                if (instance.name) instanceEl.setAttribute('name', instance.name);
                if (instance.typeName) instanceEl.setAttribute('typeName', instance.typeName);
                resourceEl.appendChild(instanceEl);
            });
            configEl.appendChild(resourceEl);
        });
        configurationsEl.appendChild(configEl);
    });

    instancesEl.appendChild(configurationsEl);
    return instancesEl;
};

export function serializePlcopenProject(project: PlcopenProject): string {
    const doc = document.implementation.createDocument('', 'project', null);
    const root = doc.documentElement;
    root.setAttribute('xmlns', PLCOPEN_XMLNS);
    if (project.name) {
        root.setAttribute('name', project.name);
    }

    const createElement = createElementFactory(doc);

    const fileHeader = doc.createElement('fileHeader');
    if (project.companyName) fileHeader.setAttribute('companyName', project.companyName);
    if (project.productName) fileHeader.setAttribute('productName', project.productName);
    if (project.productVersion) fileHeader.setAttribute('productVersion', project.productVersion);
    if (project.copyright) fileHeader.setAttribute('copyright', project.copyright);
    root.appendChild(fileHeader);

    const contentHeader = doc.createElement('contentHeader');
    if (project.name) contentHeader.setAttribute('name', project.name);
    root.appendChild(contentHeader);

    root.appendChild(buildPous(doc, project, createElement));
    root.appendChild(buildConfigurations(doc, project));

    const serializer = new XMLSerializer();
    const xmlBody = serializer.serializeToString(doc);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBody}`;
}
