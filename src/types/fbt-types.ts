export type FbtVarDirection = 'input' | 'output';

export interface FbtVar {
    name: string;
    type: string;
    comment?: string;
    direction: FbtVarDirection;
    usedByEvents: string[];
    arraySize?: string;
}

export type FbtEventDirection = 'input' | 'output';

export interface FbtEvent {
    name: string;
    comment?: string;
    direction: FbtEventDirection;
    associatedVars: string[];
}

export interface FbtEccAction {
    algorithm?: string;
    output?: string;
}

export interface FbtEccState {
    name: string;
    comment?: string;
    x?: number;
    y?: number;
    actions: FbtEccAction[];
}

export interface FbtEccTransition {
    source: string;
    destination: string;
    condition: string;
    x?: number;
    y?: number;
}

export type FbtAlgorithmLanguage = 'ST' | 'unknown';

export interface FbtAlgorithm {
    name: string;
    comment?: string;
    language: FbtAlgorithmLanguage;
    body: string;
    usedInStates?: string[];
}

export interface FbtBasicFb {
    name: string;
    comment?: string;
    namespace?: string;
    guid?: string;
    version?: string;
    author?: string;
    date?: string;
    events: FbtEvent[];
    vars: FbtVar[];
    ecc?: {
        states: FbtEccState[];
        transitions: FbtEccTransition[];
    };
    algorithms: FbtAlgorithm[];
}
