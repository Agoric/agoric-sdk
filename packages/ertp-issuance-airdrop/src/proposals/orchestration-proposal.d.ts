export function setupOrchestrationVat({ consume: { loadCriticalVat, portAllocator: portAllocatorP }, produce: { orchestrationVat, ...produce }, }: BootstrapPowers & {
    consume: {
        portAllocator: PortAllocator;
    };
    produce: {
        orchestrationVat: Producer<any>;
    };
}, { options }: {
    options: {
        orchestrationRef: VatSourceRef;
    };
}): Promise<void>;
export function getManifestForOrchestration(_powers: any, { orchestrationRef }: {
    orchestrationRef: any;
}): {
    manifest: {
        [x: string]: {
            consume: {
                loadCriticalVat: boolean;
                portAllocator: string;
            };
            produce: {
                cosmosInterchainService: string;
                orchestrationVat: string;
            };
        };
    };
    options: {
        orchestrationRef: any;
    };
};
import type { PortAllocator } from '@agoric/network';
//# sourceMappingURL=orchestration-proposal.d.ts.map