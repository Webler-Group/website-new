/**
 * Browser translators (Chrome / Google Translate, Edge, ...) replace translated text nodes with
 * their own <font> elements. React still holds references to the original text nodes, so a later
 * insertBefore/removeChild using one of them throws NotFoundError and crashes the whole app.
 *
 * This makes those two DOM methods tolerant of nodes that were moved out from under React.
 * See https://github.com/facebook/react/issues/11538
 */
export function patchDomForTranslators() {
    if (typeof Node !== "function" || !Node.prototype) return;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
        if (child.parentNode !== this) {
            // The translator already moved/removed this node; nothing to do.
            return child;
        }
        return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
        if (referenceNode && referenceNode.parentNode !== this) {
            // Reference node was replaced by the translator; append instead of crashing.
            return originalInsertBefore.call(this, newNode, null) as T;
        }
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };
}
