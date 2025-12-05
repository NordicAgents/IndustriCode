import {
    FbtAlgorithm,
    FbtBasicFb,
    FbtEccAction,
    FbtEccState,
    FbtEccTransition,
    FbtEvent,
    FbtVar,
} from '../types/fbt-types';

function parseFloatAttr(el: Element, name: string): number | undefined {
    const value = el.getAttribute(name);
    if (!value) {
        return undefined;
    }
    const num = parseFloat(value);
    return Number.isNaN(num) ? undefined : num;
}

export function parseFbtBasicFb(xmlText: string): FbtBasicFb | null {
    if (!xmlText || !xmlText.trim()) {
        return null;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');

        const parserErrors = doc.getElementsByTagName('parsererror');
        if (parserErrors && parserErrors.length > 0) {
            console.error('[FBT Parser] XML parser error:', parserErrors[0].textContent);
            return null;
        }

        const fbTypeEl = doc.getElementsByTagName('FBType')[0];
        if (!fbTypeEl) {
            return null;
        }

        const basicFbEl = fbTypeEl.getElementsByTagName('BasicFB')[0];
        if (!basicFbEl) {
            // Only BasicFB is supported for now
            return null;
        }

        const name = fbTypeEl.getAttribute('Name') || '';
        const comment = fbTypeEl.getAttribute('Comment') || undefined;
        const namespace = fbTypeEl.getAttribute('Namespace') || undefined;
        const guid = fbTypeEl.getAttribute('GUID') || undefined;

        let version: string | undefined;
        let author: string | undefined;
        let date: string | undefined;

        const versionInfoEl = fbTypeEl.getElementsByTagName('VersionInfo')[0];
        if (versionInfoEl) {
            version = versionInfoEl.getAttribute('Version') || undefined;
            author = versionInfoEl.getAttribute('Author') || undefined;
            date = versionInfoEl.getAttribute('Date') || undefined;
        }

        const events: FbtEvent[] = [];
        const vars: FbtVar[] = [];
        const varMap = new Map<string, FbtVar>();

        const interfaceListEl = fbTypeEl.getElementsByTagName('InterfaceList')[0];
        if (interfaceListEl) {
            // Variables
            const inputVarsEl = interfaceListEl.getElementsByTagName('InputVars')[0];
            if (inputVarsEl) {
                Array.from(inputVarsEl.children).forEach((child) => {
                    if (child.tagName !== 'VarDeclaration') {
                        return;
                    }
                    const varName = child.getAttribute('Name');
                    const type = child.getAttribute('Type') || '';
                    const varComment = child.getAttribute('Comment') || undefined;
                    const arraySize = child.getAttribute('ArraySize') || undefined;
                    if (!varName) {
                        return;
                    }
                    const v: FbtVar = {
                        name: varName,
                        type,
                        comment: varComment,
                        direction: 'input',
                        usedByEvents: [],
                        arraySize,
                    };
                    vars.push(v);
                    varMap.set(varName, v);
                });
            }

            const outputVarsEl = interfaceListEl.getElementsByTagName('OutputVars')[0];
            if (outputVarsEl) {
                Array.from(outputVarsEl.children).forEach((child) => {
                    if (child.tagName !== 'VarDeclaration') {
                        return;
                    }
                    const varName = child.getAttribute('Name');
                    const type = child.getAttribute('Type') || '';
                    const varComment = child.getAttribute('Comment') || undefined;
                    const arraySize = child.getAttribute('ArraySize') || undefined;
                    if (!varName) {
                        return;
                    }
                    const v: FbtVar = {
                        name: varName,
                        type,
                        comment: varComment,
                        direction: 'output',
                        usedByEvents: [],
                        arraySize,
                    };
                    vars.push(v);
                    varMap.set(varName, v);
                });
            }

            // Events
            const eventInputsEl = interfaceListEl.getElementsByTagName('EventInputs')[0];
            if (eventInputsEl) {
                Array.from(eventInputsEl.children).forEach((child) => {
                    if (child.tagName !== 'Event') {
                        return;
                    }
                    const eventName = child.getAttribute('Name');
                    const eventComment = child.getAttribute('Comment') || undefined;
                    if (!eventName) {
                        return;
                    }
                    const associatedVars: string[] = [];
                    const withEls = child.getElementsByTagName('With');
                    Array.from(withEls).forEach((withEl) => {
                        const varName = withEl.getAttribute('Var');
                        if (!varName) {
                            return;
                        }
                        associatedVars.push(varName);
                        const v = varMap.get(varName);
                        if (v && !v.usedByEvents.includes(eventName)) {
                            v.usedByEvents.push(eventName);
                        }
                    });

                    events.push({
                        name: eventName,
                        comment: eventComment,
                        direction: 'input',
                        associatedVars,
                    });
                });
            }

            const eventOutputsEl = interfaceListEl.getElementsByTagName('EventOutputs')[0];
            if (eventOutputsEl) {
                Array.from(eventOutputsEl.children).forEach((child) => {
                    if (child.tagName !== 'Event') {
                        return;
                    }
                    const eventName = child.getAttribute('Name');
                    const eventComment = child.getAttribute('Comment') || undefined;
                    if (!eventName) {
                        return;
                    }
                    const associatedVars: string[] = [];
                    const withEls = child.getElementsByTagName('With');
                    Array.from(withEls).forEach((withEl) => {
                        const varName = withEl.getAttribute('Var');
                        if (!varName) {
                            return;
                        }
                        associatedVars.push(varName);
                        const v = varMap.get(varName);
                        if (v && !v.usedByEvents.includes(eventName)) {
                            v.usedByEvents.push(eventName);
                        }
                    });

                    events.push({
                        name: eventName,
                        comment: eventComment,
                        direction: 'output',
                        associatedVars,
                    });
                });
            }
        }

        // ECC
        let eccStates: FbtEccState[] = [];
        let eccTransitions: FbtEccTransition[] = [];

        const eccEl = basicFbEl.getElementsByTagName('ECC')[0];
        if (eccEl) {
            const stateEls = Array.from(eccEl.getElementsByTagName('ECState'));
            eccStates = stateEls
                .map<FbtEccState | null>((stateEl) => {
                    const stateName = stateEl.getAttribute('Name');
                    if (!stateName) {
                        return null;
                    }
                    const stateComment = stateEl.getAttribute('Comment') || undefined;
                    const x = parseFloatAttr(stateEl, 'x');
                    const y = parseFloatAttr(stateEl, 'y');

                    const actions: FbtEccAction[] = [];
                    const actionEls = stateEl.getElementsByTagName('ECAction');
                    Array.from(actionEls).forEach((actionEl) => {
                        const algorithm = actionEl.getAttribute('Algorithm') || undefined;
                        const output = actionEl.getAttribute('Output') || undefined;
                        const action: FbtEccAction = { algorithm, output };
                        actions.push(action);
                    });

                    return {
                        name: stateName,
                        comment: stateComment,
                        x,
                        y,
                        actions,
                    };
                })
                .filter((s): s is FbtEccState => s !== null);

            const transitionEls = Array.from(eccEl.getElementsByTagName('ECTransition'));
            eccTransitions = transitionEls
                .map<FbtEccTransition | null>((transitionEl) => {
                    const source = transitionEl.getAttribute('Source');
                    const destination = transitionEl.getAttribute('Destination');
                    const condition = transitionEl.getAttribute('Condition') || '';
                    if (!source || !destination) {
                        return null;
                    }
                    const x = parseFloatAttr(transitionEl, 'x');
                    const y = parseFloatAttr(transitionEl, 'y');
                    return {
                        source,
                        destination,
                        condition,
                        x,
                        y,
                    };
                })
                .filter((t): t is FbtEccTransition => t !== null);
        }

        // Algorithms
        const algorithms: FbtAlgorithm[] = [];
        const algorithmEls = basicFbEl.getElementsByTagName('Algorithm');
        Array.from(algorithmEls).forEach((algEl) => {
            const algName = algEl.getAttribute('Name');
            if (!algName) {
                return;
            }
            const algComment = algEl.getAttribute('Comment') || undefined;
            const stEl = algEl.getElementsByTagName('ST')[0];
            let body = '';
            let language: 'ST' | 'unknown' = 'unknown';
            if (stEl) {
                body = stEl.textContent || '';
                language = 'ST';
            }

            const alg: FbtAlgorithm = {
                name: algName,
                comment: algComment,
                language,
                body,
            };
            algorithms.push(alg);
        });

        // Compute algorithm usage in states
        if (algorithms.length > 0 && eccStates.length > 0) {
            const usageMap = new Map<string, Set<string>>();
            eccStates.forEach((state) => {
                state.actions.forEach((action) => {
                    if (!action.algorithm) {
                        return;
                    }
                    const key = action.algorithm;
                    if (!usageMap.has(key)) {
                        usageMap.set(key, new Set());
                    }
                    usageMap.get(key)!.add(state.name);
                });
            });

            algorithms.forEach((alg) => {
                const usedIn = usageMap.get(alg.name);
                if (usedIn) {
                    alg.usedInStates = Array.from(usedIn);
                }
            });
        }

        const fb: FbtBasicFb = {
            name,
            comment,
            namespace,
            guid,
            version,
            author,
            date,
            events,
            vars,
            algorithms,
        };

        if (eccStates.length > 0 || eccTransitions.length > 0) {
            fb.ecc = {
                states: eccStates,
                transitions: eccTransitions,
            };
        }

        return fb;
    } catch (error) {
        console.error('[FBT Parser] Failed to parse FBT BasicFB:', error);
        return null;
    }
}
