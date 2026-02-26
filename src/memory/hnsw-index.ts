/**
 * Pure TypeScript HNSW (Hierarchical Navigable Small World) Index
 *
 * Approximate nearest neighbor search using cosine distance.
 * Zero native dependencies. Designed for <50K vectors.
 */

interface HNSWNode {
  label: string;
  vector: Float32Array;
  connections: Map<number, Set<string>>; // layer -> set of neighbor labels
  layer: number; // max layer this node exists on
}

interface SearchCandidate {
  label: string;
  distance: number;
}

export interface HNSWConfig {
  M?: number; // max connections per layer (default: 16)
  efConstruction?: number; // construction search width (default: 200)
  dimensions: number;
}

const MAGIC_NUMBER = 0x484e5357; // 'HNSW'
const FORMAT_VERSION = 1;

export class HNSWIndex {
  private readonly M: number;
  private readonly efConstruction: number;
  private readonly dimensions: number;
  private readonly mL: number; // normalization factor for layer assignment
  private nodes: Map<string, HNSWNode> = new Map();
  private entryPoint: string | null = null;
  private maxLayer = 0;

  constructor(config: HNSWConfig) {
    this.M = config.M ?? 16;
    this.efConstruction = config.efConstruction ?? 200;
    this.dimensions = config.dimensions;
    this.mL = 1 / Math.log(this.M);
  }

  get size(): number {
    return this.nodes.size;
  }

  /**
   * Cosine distance: 1 - cosine_similarity (0 = identical, 2 = opposite)
   */
  private cosineDistance(a: Float32Array, b: Float32Array): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    if (denom === 0) return 1;

    return 1 - dot / denom;
  }

  /**
   * Assign a random layer for a new node
   */
  private randomLayer(): number {
    return Math.floor(-Math.log(Math.random()) * this.mL);
  }

  /**
   * Greedy search at a single layer, returning ef nearest candidates
   */
  private searchLayer(
    query: Float32Array,
    entryLabel: string,
    ef: number,
    layer: number
  ): SearchCandidate[] {
    const visited = new Set<string>();
    const candidates: SearchCandidate[] = [];
    const results: SearchCandidate[] = [];

    const entryNode = this.nodes.get(entryLabel);
    if (!entryNode) return [];

    const entryDist = this.cosineDistance(query, entryNode.vector);
    candidates.push({ label: entryLabel, distance: entryDist });
    results.push({ label: entryLabel, distance: entryDist });
    visited.add(entryLabel);

    while (candidates.length > 0) {
      // Get closest candidate
      candidates.sort((a, b) => a.distance - b.distance);
      const current = candidates.shift()!;

      // Get farthest result
      results.sort((a, b) => a.distance - b.distance);
      const farthest = results[results.length - 1];

      if (current.distance > farthest.distance) break;

      const currentNode = this.nodes.get(current.label);
      if (!currentNode) continue;

      const connections = currentNode.connections.get(layer);
      if (!connections) continue;

      for (const neighborLabel of connections) {
        if (visited.has(neighborLabel)) continue;
        visited.add(neighborLabel);

        const neighborNode = this.nodes.get(neighborLabel);
        if (!neighborNode) continue;

        const dist = this.cosineDistance(query, neighborNode.vector);

        results.sort((a, b) => a.distance - b.distance);
        const currentFarthest = results[results.length - 1];

        if (results.length < ef || dist < currentFarthest.distance) {
          candidates.push({ label: neighborLabel, distance: dist });
          results.push({ label: neighborLabel, distance: dist });

          if (results.length > ef) {
            results.sort((a, b) => a.distance - b.distance);
            results.pop();
          }
        }
      }
    }

    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  /**
   * Select M nearest neighbors from candidates, pruning for diversity
   */
  private selectNeighbors(candidates: SearchCandidate[], M: number): SearchCandidate[] {
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.slice(0, M);
  }

  /**
   * Add a vector to the index
   */
  add(label: string, vector: Float32Array): void {
    if (vector.length !== this.dimensions) {
      throw new Error(
        `Vector dimensions mismatch: expected ${this.dimensions}, got ${vector.length}`
      );
    }

    // If label already exists, remove first
    if (this.nodes.has(label)) {
      this.remove(label);
    }

    const nodeLayer = this.randomLayer();
    const node: HNSWNode = {
      label,
      vector: new Float32Array(vector),
      connections: new Map(),
      layer: nodeLayer,
    };

    // Initialize connection sets for all layers
    for (let l = 0; l <= nodeLayer; l++) {
      node.connections.set(l, new Set());
    }

    this.nodes.set(label, node);

    if (this.entryPoint === null) {
      this.entryPoint = label;
      this.maxLayer = nodeLayer;
      return;
    }

    let currentLabel = this.entryPoint;

    // Traverse from top layer to nodeLayer + 1 (greedy, single nearest)
    for (let l = this.maxLayer; l > nodeLayer; l--) {
      const results = this.searchLayer(vector, currentLabel, 1, l);
      if (results.length > 0) {
        currentLabel = results[0].label;
      }
    }

    // Insert at layers nodeLayer down to 0
    for (let l = Math.min(nodeLayer, this.maxLayer); l >= 0; l--) {
      const candidates = this.searchLayer(vector, currentLabel, this.efConstruction, l);

      const neighbors = this.selectNeighbors(candidates, this.M);

      for (const neighbor of neighbors) {
        // Bidirectional connections
        node.connections.get(l)!.add(neighbor.label);

        const neighborNode = this.nodes.get(neighbor.label);
        if (neighborNode) {
          if (!neighborNode.connections.has(l)) {
            neighborNode.connections.set(l, new Set());
          }
          neighborNode.connections.get(l)!.add(label);

          // Prune neighbor connections if exceeding M
          const neighborConns = neighborNode.connections.get(l)!;
          if (neighborConns.size > this.M * 2) {
            const allCandidates: SearchCandidate[] = [];
            for (const connLabel of neighborConns) {
              if (connLabel === label) continue;
              const connNode = this.nodes.get(connLabel);
              if (connNode) {
                allCandidates.push({
                  label: connLabel,
                  distance: this.cosineDistance(neighborNode.vector, connNode.vector),
                });
              }
            }
            const kept = this.selectNeighbors(allCandidates, this.M * 2);
            neighborConns.clear();
            neighborConns.add(label); // always keep the new connection
            for (const k of kept) {
              neighborConns.add(k.label);
            }
          }
        }
      }

      if (candidates.length > 0) {
        currentLabel = candidates[0].label;
      }
    }

    // Update entry point if new node has higher layer
    if (nodeLayer > this.maxLayer) {
      this.entryPoint = label;
      this.maxLayer = nodeLayer;
    }
  }

  /**
   * Search k nearest neighbors
   */
  search(query: Float32Array, k: number, ef?: number): Array<{ label: string; distance: number }> {
    if (this.entryPoint === null || this.nodes.size === 0) {
      return [];
    }

    if (query.length !== this.dimensions) {
      throw new Error(
        `Query dimensions mismatch: expected ${this.dimensions}, got ${query.length}`
      );
    }

    const searchEf = Math.max(ef ?? 50, k);
    let currentLabel = this.entryPoint;

    // Traverse from top layer to layer 1 (greedy, single nearest)
    for (let l = this.maxLayer; l > 0; l--) {
      const results = this.searchLayer(query, currentLabel, 1, l);
      if (results.length > 0) {
        currentLabel = results[0].label;
      }
    }

    // Search at layer 0 with ef candidates
    const candidates = this.searchLayer(query, currentLabel, searchEf, 0);

    return candidates.slice(0, k);
  }

  /**
   * Remove a vector from the index
   */
  remove(label: string): void {
    const node = this.nodes.get(label);
    if (!node) return;

    // Remove all connections to this node
    for (const [layer, connections] of node.connections) {
      for (const neighborLabel of connections) {
        const neighborNode = this.nodes.get(neighborLabel);
        if (neighborNode) {
          const neighborConns = neighborNode.connections.get(layer);
          if (neighborConns) {
            neighborConns.delete(label);
          }
        }
      }
    }

    this.nodes.delete(label);

    // Update entry point if needed
    if (this.entryPoint === label) {
      if (this.nodes.size === 0) {
        this.entryPoint = null;
        this.maxLayer = 0;
      } else {
        // Find node with highest layer
        let bestLabel = '';
        let bestLayer = -1;
        for (const [l, n] of this.nodes) {
          if (n.layer > bestLayer) {
            bestLayer = n.layer;
            bestLabel = l;
          }
        }
        this.entryPoint = bestLabel;
        this.maxLayer = bestLayer;
      }
    }
  }

  /**
   * Serialize the index to an ArrayBuffer for disk persistence
   * Format: [magic:u32][version:u8][dimensions:u32][M:u16][nodeCount:u32][...nodes]
   */
  serialize(): ArrayBuffer {
    const nodeEntries = Array.from(this.nodes.entries());
    const labelToIndex = new Map<string, number>();
    nodeEntries.forEach(([label], i) => labelToIndex.set(label, i));

    // Calculate buffer size
    let size = 4 + 1 + 4 + 2 + 4; // header
    size += 4; // entryPointIndex
    size += 4; // maxLayer

    for (const [, node] of nodeEntries) {
      const labelBytes = new TextEncoder().encode(node.label);
      size += 2 + labelBytes.length; // label length + label
      size += this.dimensions * 4; // vector (float32)
      size += 4; // node layer
      size += 4; // connection layer count
      for (const [, connections] of node.connections) {
        size += 4; // layer number
        size += 4; // connection count
        size += connections.size * 4; // neighbor indices (u32)
      }
    }

    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    let offset = 0;

    // Header
    view.setUint32(offset, MAGIC_NUMBER, true);
    offset += 4;
    view.setUint8(offset, FORMAT_VERSION);
    offset += 1;
    view.setUint32(offset, this.dimensions, true);
    offset += 4;
    view.setUint16(offset, this.M, true);
    offset += 2;
    view.setUint32(offset, nodeEntries.length, true);
    offset += 4;
    view.setInt32(offset, this.entryPoint ? labelToIndex.get(this.entryPoint)! : -1, true);
    offset += 4;
    view.setUint32(offset, this.maxLayer, true);
    offset += 4;

    // Nodes
    const encoder = new TextEncoder();
    for (const [, node] of nodeEntries) {
      const labelBytes = encoder.encode(node.label);
      view.setUint16(offset, labelBytes.length, true);
      offset += 2;
      new Uint8Array(buffer, offset, labelBytes.length).set(labelBytes);
      offset += labelBytes.length;

      // Vector
      for (let i = 0; i < this.dimensions; i++) {
        view.setFloat32(offset, node.vector[i], true);
        offset += 4;
      }

      // Layer
      view.setUint32(offset, node.layer, true);
      offset += 4;

      // Connections
      const layerCount = node.connections.size;
      view.setUint32(offset, layerCount, true);
      offset += 4;
      for (const [layer, connections] of node.connections) {
        view.setUint32(offset, layer, true);
        offset += 4;
        view.setUint32(offset, connections.size, true);
        offset += 4;
        for (const neighborLabel of connections) {
          const idx = labelToIndex.get(neighborLabel);
          view.setUint32(offset, idx ?? 0, true);
          offset += 4;
        }
      }
    }

    return buffer;
  }

  /**
   * Deserialize an index from an ArrayBuffer
   */
  static deserialize(buffer: ArrayBuffer): HNSWIndex {
    const view = new DataView(buffer);
    let offset = 0;
    const decoder = new TextDecoder();

    // Header
    const magic = view.getUint32(offset, true);
    offset += 4;
    if (magic !== MAGIC_NUMBER) {
      throw new Error('Invalid HNSW index file');
    }
    const version = view.getUint8(offset);
    offset += 1;
    if (version !== FORMAT_VERSION) {
      throw new Error(`Unsupported HNSW format version: ${version}`);
    }
    const dimensions = view.getUint32(offset, true);
    offset += 4;
    const M = view.getUint16(offset, true);
    offset += 2;
    const nodeCount = view.getUint32(offset, true);
    offset += 4;
    const entryPointIndex = view.getInt32(offset, true);
    offset += 4;
    const maxLayer = view.getUint32(offset, true);
    offset += 4;

    const index = new HNSWIndex({ dimensions, M });
    index.maxLayer = maxLayer;

    // Read all nodes first (labels + vectors + layers)
    const labels: string[] = [];
    const nodeData: Array<{
      label: string;
      vector: Float32Array;
      layer: number;
      connectionLayers: Array<{ layer: number; neighborIndices: number[] }>;
    }> = [];

    for (let n = 0; n < nodeCount; n++) {
      const labelLen = view.getUint16(offset, true);
      offset += 2;
      const labelBytes = new Uint8Array(buffer, offset, labelLen);
      const label = decoder.decode(labelBytes);
      offset += labelLen;
      labels.push(label);

      const vector = new Float32Array(dimensions);
      for (let i = 0; i < dimensions; i++) {
        vector[i] = view.getFloat32(offset, true);
        offset += 4;
      }

      const layer = view.getUint32(offset, true);
      offset += 4;
      const layerCount = view.getUint32(offset, true);
      offset += 4;
      const connectionLayers: Array<{
        layer: number;
        neighborIndices: number[];
      }> = [];

      for (let lc = 0; lc < layerCount; lc++) {
        const connLayer = view.getUint32(offset, true);
        offset += 4;
        const connCount = view.getUint32(offset, true);
        offset += 4;
        const neighborIndices: number[] = [];
        for (let c = 0; c < connCount; c++) {
          neighborIndices.push(view.getUint32(offset, true));
          offset += 4;
        }
        connectionLayers.push({ layer: connLayer, neighborIndices });
      }

      nodeData.push({ label, vector, layer, connectionLayers });
    }

    // Reconstruct nodes with proper connections
    for (const data of nodeData) {
      const connections = new Map<number, Set<string>>();
      for (const cl of data.connectionLayers) {
        const neighbors = new Set<string>();
        for (const idx of cl.neighborIndices) {
          if (idx < labels.length) {
            neighbors.add(labels[idx]);
          }
        }
        connections.set(cl.layer, neighbors);
      }

      const node: HNSWNode = {
        label: data.label,
        vector: data.vector,
        connections,
        layer: data.layer,
      };
      index.nodes.set(data.label, node);
    }

    if (entryPointIndex >= 0 && entryPointIndex < labels.length) {
      index.entryPoint = labels[entryPointIndex];
    }

    return index;
  }
}
