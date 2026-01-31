export type PlcopenPouType = 'program' | 'functionBlock' | 'function' | 'unknown';

export interface PlcopenVarDeclaration {
    name: string;
    type: string;
    comment?: string;
    address?: string;
    initialValue?: string;
}

export interface PlcopenPouInterface {
    inputs: PlcopenVarDeclaration[];
    outputs: PlcopenVarDeclaration[];
    inOuts: PlcopenVarDeclaration[];
    locals: PlcopenVarDeclaration[];
    temps: PlcopenVarDeclaration[];
    externals: PlcopenVarDeclaration[];
    returnType?: string;
}

export interface PlcopenStructuredText {
    code: string;
}

export interface PlcopenSfcStep {
    name: string;
    initial: boolean;
    actionBlocks: string[];
}

export interface PlcopenSfcTransition {
    name?: string;
    from: string[];
    to: string[];
    condition?: string;
}

export interface PlcopenSfcAction {
    name: string;
    body?: PlcopenStructuredText;
}

export interface PlcopenSfcNetwork {
    steps: PlcopenSfcStep[];
    transitions: PlcopenSfcTransition[];
    actions: PlcopenSfcAction[];
}

export interface PlcopenLdElement {
    type: string;
    name?: string;
    variable?: string;
    expression?: string;
    localId?: string;
    negated?: boolean;
}

export interface PlcopenLdRung {
    id?: string;
    comment?: string;
    elements: PlcopenLdElement[];
}

export interface PlcopenLdNetwork {
    id?: string;
    comment?: string;
    rungs: PlcopenLdRung[];
}

export interface PlcopenFbdPin {
    name?: string;
    negated?: boolean;
}

export interface PlcopenFbdBlock {
    localId?: string;
    type: string;
    instanceName?: string;
    name?: string;
    position?: { x?: number; y?: number };
    inputs: PlcopenFbdPin[];
    outputs: PlcopenFbdPin[];
}

export interface PlcopenFbdConnection {
    source: string;
    target: string;
    formalParameter?: string;
}

export interface PlcopenFbdVariable {
    localId?: string;
    name?: string;
    role: 'in' | 'out' | 'inout' | 'unknown';
}

export interface PlcopenFbdNetwork {
    id?: string;
    comment?: string;
    blocks: PlcopenFbdBlock[];
    connections: PlcopenFbdConnection[];
    variables: PlcopenFbdVariable[];
}

export interface PlcopenPouBody {
    st?: PlcopenStructuredText;
    sfc?: PlcopenSfcNetwork;
    ldNetworks: PlcopenLdNetwork[];
    fbdNetworks: PlcopenFbdNetwork[];
}

export interface PlcopenPou {
    name: string;
    pouType: PlcopenPouType;
    interface: PlcopenPouInterface;
    body: PlcopenPouBody;
}

export interface PlcopenTask {
    name: string;
    interval?: string;
    priority?: string;
}

export interface PlcopenPouInstance {
    name?: string;
    typeName?: string;
}

export interface PlcopenResource {
    name: string;
    tasks: PlcopenTask[];
    instances: PlcopenPouInstance[];
}

export interface PlcopenConfiguration {
    name: string;
    resources: PlcopenResource[];
}

export interface PlcopenProject {
    name?: string;
    companyName?: string;
    productName?: string;
    productVersion?: string;
    copyright?: string;
    pous: PlcopenPou[];
    configurations: PlcopenConfiguration[];
}
