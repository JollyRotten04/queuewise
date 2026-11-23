// In-process change notifications per branch, used by the Server-Sent Events stream.
// Events carry no data: clients re-fetch through the normal endpoints, so the stream can't leak anything.
// Limitation: only reaches clients connected to this process. With several instances, use Postgres LISTEN/NOTIFY.
import { EventEmitter } from "node:events";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function notifyBranch(branchId) {
    emitter.emit(`branch:${branchId}`);
}

export function onBranchChange(branchId, listener) {
    emitter.on(`branch:${branchId}`, listener);
    return () => emitter.off(`branch:${branchId}`, listener);
}
