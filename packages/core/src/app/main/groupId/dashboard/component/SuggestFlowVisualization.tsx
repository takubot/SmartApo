"use client";

import { Card, CardBody, CardHeader, Chip, Tooltip } from "@heroui/react";
import {
  GitBranch,
  MousePointer2,
  Info,
  ChevronRight,
  Maximize,
  Minimize,
} from "lucide-react";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import type {
  SuggestFlowNodeItemType,
  SuggestFlowPathItemType,
  SuggestFlowOverviewType,
} from "@repo/api-contracts/based_template/zschema";

interface SuggestFlowVisualizationProps {
  data: SuggestFlowOverviewType;
}

// --- Constants & Types ---

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;
const LEVEL_SPACING = 250; // Horizontal spacing between levels
const NODE_SPACING = 90; // Vertical spacing between nodes
const INITIAL_X_OFFSET = 50; // Initial padding from left
const INITIAL_Y_OFFSET = 50; // Initial padding from top

const COLORS = {
  level0: "from-blue-500 to-blue-600",
  level1: "from-emerald-500 to-emerald-600",
  level2: "from-amber-500 to-amber-600",
  level3: "from-rose-500 to-rose-600",
  level4: "from-purple-500 to-purple-600",
  default: "from-gray-500 to-gray-600",
  path: "#94a3b8", // slate-400
  pathHighlight: "#3b82f6", // blue-500
};

interface LayoutNode extends SuggestFlowNodeItemType {
  x: number;
  y: number;
  children: LayoutNode[];
  isRoot: boolean;
}

// --- Helper Functions ---

/**
 * Calculates the tree layout coordinates.
 * Uses a simple recursive algorithm to position nodes.
 * Adds a virtual "Start" node as the single root.
 */
function calculateLayout(nodes: SuggestFlowNodeItemType[]): {
  layoutNodes: LayoutNode[];
  width: number;
  height: number;
  virtualPaths: SuggestFlowPathItemType[];
} {
  if (nodes.length === 0)
    return { layoutNodes: [], width: 0, height: 0, virtualPaths: [] };

  // 1. Build Tree Structure
  const nodeMap = new Map<number, LayoutNode>();
  const actualRoots: LayoutNode[] = [];

  // Initialize LayoutNodes
  nodes.forEach((node) => {
    nodeMap.set(node.suggestItemId, {
      ...node,
      x: 0,
      y: 0,
      children: [],
      isRoot: false,
    });
  });

  // Link children to parents
  nodes.forEach((node) => {
    const layoutNode = nodeMap.get(node.suggestItemId)!;
    if (node.parentSuggestItemId && nodeMap.has(node.parentSuggestItemId)) {
      const parent = nodeMap.get(node.parentSuggestItemId)!;
      parent.children.push(layoutNode);
    } else {
      layoutNode.isRoot = true; // Temporarily mark as root
      actualRoots.push(layoutNode);
    }
  });

  // Sort children by click count
  nodeMap.forEach((node) => {
    node.children.sort((a, b) => b.clickCount - a.clickCount);
  });
  actualRoots.sort((a, b) => b.clickCount - a.clickCount);

  // 2. Create Virtual Start Node
  const virtualStartNode: LayoutNode = {
    suggestItemId: -1, // Special ID for Start
    displayLabel: "Start",
    parentSuggestItemId: null,
    clickCount: actualRoots.reduce((sum, n) => sum + n.clickCount, 0),
    level: -1,
    suggestName: null,
    x: 0,
    y: 0,
    children: actualRoots,
    isRoot: true,
  };

  // 3. Assign Coordinates (Recursive)
  let currentY = INITIAL_Y_OFFSET;
  let maxLevel = 0;

  function traverse(node: LayoutNode, level: number) {
    maxLevel = Math.max(maxLevel, level);

    if (node.children.length === 0) {
      // Leaf node
      node.y = currentY;
      currentY += NODE_SPACING;
    } else {
      // Parent node
      // First traverse all children
      node.children.forEach((child) => traverse(child, level + 1));

      // Position parent at the average Y of its first and last child
      if (node.children.length > 0) {
        const firstChild = node.children[0];
        const lastChild = node.children[node.children.length - 1];
        if (firstChild && lastChild) {
          node.y = (firstChild.y + lastChild.y) / 2;
        }
      }
    }

    // Shift x by one level to accommodate Start node at level 0 (visually)
    // Virtual Start node is at level -1, so it will be at INITIAL_X_OFFSET
    // Actual level 0 nodes will be at INITIAL_X_OFFSET + LEVEL_SPACING
    node.x = INITIAL_X_OFFSET + (level + 1) * LEVEL_SPACING;
  }

  traverse(virtualStartNode, -1);

  const width = INITIAL_X_OFFSET + (maxLevel + 2) * LEVEL_SPACING;
  const height = currentY + INITIAL_Y_OFFSET;

  // 4. Generate Virtual Paths from Start to Actual Roots
  const virtualPaths: SuggestFlowPathItemType[] = actualRoots.map((root) => ({
    fromSuggestItemId: -1,
    toSuggestItemId: root.suggestItemId,
    transitionCount: root.clickCount,
    percentage:
      root.clickCount > 0
        ? (root.clickCount / virtualStartNode.clickCount) * 100
        : 0,
  }));

  // Include the virtual start node in the result
  const allLayoutNodes = [virtualStartNode, ...Array.from(nodeMap.values())];

  return { layoutNodes: allLayoutNodes, width, height, virtualPaths };
}

/**
 * Generates a straight line path between two points.
 */
function getPathD(x1: number, y1: number, x2: number, y2: number) {
  // Simple straight line
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

// --- Components ---

function FlowNode({
  node,
  isSelected,
  isRelated,
  onClick,
}: {
  node: LayoutNode;
  isSelected: boolean;
  isRelated: boolean;
  onClick: () => void;
}) {
  // Special styling for Start node
  if (node.suggestItemId === -1) {
    return (
      <div
        className="absolute flex items-center justify-center pointer-events-auto"
        style={{
          left: node.x,
          top: node.y,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          transform: "translateY(-50%)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <div
            className={`
                  w-32 h-12 rounded-full flex items-center justify-center shadow-md border-2 cursor-pointer transition-all
                  ${isSelected ? "bg-blue-600 border-blue-700 text-white scale-110 ring-4 ring-blue-200" : "bg-white border-blue-500 text-blue-600 hover:bg-blue-50"}
              `}
          >
            <span className="font-bold text-lg">Start</span>
          </div>
          {/* Right connector - positioned at vertical center */}
          <div
            className={`absolute right-[calc(50%-64px-4px)] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-300 ${isRelated || isSelected ? "bg-blue-500 scale-125" : ""} transition-colors`}
          />
        </motion.div>
      </div>
    );
  }

  const gradient =
    [COLORS.level0, COLORS.level1, COLORS.level2, COLORS.level3, COLORS.level4][
      Math.min(node.level, 4)
    ] || COLORS.default;

  return (
    <div
      className="absolute flex items-center group pointer-events-auto"
      style={{
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        transform: "translateY(-50%)", // Center vertically on the coordinate
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full h-full"
      >
        {/* Connector Dot (Left) - positioned at vertical center */}
        <div
          className={`absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300 ${isRelated || isSelected ? "bg-blue-500 scale-125" : ""} transition-colors`}
        />

        {/* Main Card */}
        <div
          className={`
            relative w-full h-full rounded-xl shadow-sm border transition-all duration-300 cursor-pointer overflow-hidden
            flex flex-col justify-between
            ${
              isSelected
                ? "ring-2 ring-blue-500 border-blue-500 shadow-md scale-105 z-20 bg-white"
                : isRelated
                  ? "border-blue-300 shadow-sm bg-blue-50/50 hover:shadow-md hover:border-blue-400"
                  : "border-gray-200 bg-white hover:shadow-md hover:border-gray-300"
            }
          `}
        >
          {/* Header Bar */}
          <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

          <div className="px-3 py-2 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-bold text-sm text-gray-800 truncate"
                title={node.displayLabel}
              >
                {node.displayLabel}
              </span>
              {node.children.length > 0 && (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              <Chip
                size="sm"
                variant="flat"
                className="h-5 px-1 bg-gray-100 text-gray-600 text-[10px]"
              >
                {node.clickCount}回
              </Chip>
            </div>
          </div>
        </div>

        {/* Connector Dot (Right) - positioned at vertical center */}
        {node.children.length > 0 && (
          <div
            className={`absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300 ${isRelated || isSelected ? "bg-blue-500 scale-125" : ""} transition-colors`}
          />
        )}
      </motion.div>
    </div>
  );
}

function FlowConnection({
  path,
  fromNode,
  toNode,
  highlighted,
  relativePercentage,
}: {
  path: SuggestFlowPathItemType;
  fromNode: LayoutNode;
  toNode: LayoutNode;
  highlighted: boolean;
  relativePercentage: number;
}) {
  // Calculate connection points from the center (middle) of cards
  // FlowNode uses `top: node.y` with `transform: translateY(-50%)`
  // This means node.y is the vertical center of the card

  // For Start node (w-32 = 128px), connect from right edge at vertical center
  // For normal nodes (NODE_WIDTH = 180px), connect from right edge at vertical center
  const actualStartX =
    fromNode.suggestItemId === -1 ? fromNode.x + 128 : fromNode.x + NODE_WIDTH;
  const actualStartY = fromNode.y; // Already at vertical center due to translateY(-50%)

  // Connect to left edge of target node at its vertical center
  const actualEndX = toNode.x;
  const actualEndY = toNode.y; // Already at vertical center due to translateY(-50%)

  const d = getPathD(actualStartX, actualStartY, actualEndX, actualEndY);
  const strokeWidth = Math.max(
    1.5,
    Math.min(6, Math.log(path.transitionCount + 1) * 2),
  );

  return (
    <g className="pointer-events-none">
      {/* Background path for easier hover/visibility */}
      <path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth={strokeWidth + 4}
        opacity={0.5}
      />
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: highlighted ? 1 : 0.4 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        d={d}
        fill="none"
        stroke={highlighted ? COLORS.pathHighlight : COLORS.path}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Percentage Label */}
      {highlighted && (
        <foreignObject
          x={(actualStartX + actualEndX) / 2 - 20}
          y={(actualStartY + actualEndY) / 2 - 10}
          width={40}
          height={20}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full border border-blue-200 text-[10px] font-bold text-blue-600 text-center shadow-sm">
            {relativePercentage.toFixed(0)}%
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export default function SuggestFlowVisualization({
  data,
}: SuggestFlowVisualizationProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize layout calculation
  const { layoutNodes, width, height, virtualPaths } = useMemo(() => {
    return calculateLayout(data.nodes || []);
  }, [data.nodes]);

  // Combine actual paths and virtual paths
  const allPaths = useMemo(() => {
    return [...(data.paths || []), ...virtualPaths];
  }, [data.paths, virtualPaths]);

  // Calculate outgoing clicks for each node to compute relative percentages
  const outgoingClicksMap = useMemo(() => {
    const map = new Map<number, number>();
    allPaths.forEach((path) => {
      if (
        path.fromSuggestItemId !== undefined &&
        path.fromSuggestItemId !== null
      ) {
        const current = map.get(path.fromSuggestItemId) || 0;
        map.set(path.fromSuggestItemId, current + path.transitionCount);
      }
    });
    return map;
  }, [allPaths]);

  // Helper to find related nodes/paths
  const { relatedNodeIds, relatedPaths } = useMemo(() => {
    const relatedNodeIds = new Set<number>();
    const relatedPaths = new Set<string>();

    if (selectedNodeId === null) return { relatedNodeIds, relatedPaths };

    relatedNodeIds.add(selectedNodeId);

    // Find paths connected to selected node
    allPaths.forEach((path) => {
      const key = `${path.fromSuggestItemId}-${path.toSuggestItemId}`;
      if (path.fromSuggestItemId === selectedNodeId) {
        relatedPaths.add(key);
        relatedNodeIds.add(path.toSuggestItemId);
      } else if (path.toSuggestItemId === selectedNodeId) {
        relatedPaths.add(key);
        if (path.fromSuggestItemId) relatedNodeIds.add(path.fromSuggestItemId);
      }
    });

    return { relatedNodeIds, relatedPaths };
  }, [selectedNodeId, allPaths]);

  // Center the view on initial load or reset
  useEffect(() => {
    if (containerRef.current) {
      // Simple centering logic if needed, or just start at top-left
      // containerRef.current.scrollLeft = 0;
    }
  }, [width]);

  if (!data.nodes || data.nodes.length === 0) {
    return (
      <Card className="h-96 w-full bg-gradient-to-br from-gray-50 to-gray-100 border-none shadow-inner">
        <CardBody className="flex flex-col items-center justify-center text-gray-400">
          <GitBranch className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">データがありません</p>
          <p className="text-sm">
            指定された期間またはエントリのサジェスト利用データがありません。
          </p>
        </CardBody>
      </Card>
    );
  }

  const selectedNode = layoutNodes.find(
    (n) => n.suggestItemId === selectedNodeId,
  );

  return (
    <div
      className={`h-full w-full flex flex-col min-h-0 ${isFullscreen ? "relative z-50" : ""}`}
    >
      <Card
        className={`
          transition-all duration-300 bg-white overflow-hidden flex flex-col min-h-0 h-full
          ${
            isFullscreen
              ? "fixed inset-0 z-50 rounded-none w-screen h-screen border-none shadow-none"
              : "w-full border border-default-200 shadow-sm relative"
          }
        `}
      >
        <CardHeader
          className={`border-b border-default-100 bg-white/50 backdrop-blur-md sticky top-0 z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0 ${
            isFullscreen ? "px-6 py-4" : "px-2 py-1"
          }`}
        >
          <div>
            <h3
              className={`font-bold text-foreground flex items-center gap-2 ${
                isFullscreen ? "text-lg text-gray-900" : "text-[10px]"
              }`}
            >
              <div
                className={`bg-blue-100 rounded-lg ${
                  isFullscreen ? "p-1.5" : "p-1"
                }`}
              >
                <GitBranch
                  className={`text-blue-600 ${
                    isFullscreen ? "w-5 h-5" : "w-3 h-3"
                  }`}
                />
              </div>
              サジェストフロー分析
            </h3>
            {isFullscreen && (
              <p className="text-sm text-gray-500 mt-1">
                ユーザーのサジェスト選択遷移を可視化します。
              </p>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300 bg-white ${
              isFullscreen ? "p-2" : "p-1"
            }`}
            title={isFullscreen ? "縮小表示" : "全画面表示"}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-gray-600" />
            ) : (
              <Maximize className="w-3 h-3 text-gray-600" />
            )}
          </button>
        </CardHeader>

        <CardBody
          className={`relative bg-slate-50/50 flex-1 flex flex-col min-h-0 overflow-hidden ${
            isFullscreen ? "p-0" : "p-2"
          }`}
        >
          <div
            className={`w-full bg-slate-50/30 overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300/50 [&::-webkit-scrollbar-track]:bg-transparent ${isFullscreen ? "h-[calc(100vh-85px)]" : ""}`}
            style={
              !isFullscreen
                ? { height: Math.min(Math.max(height + 100, 500), 800) }
                : undefined
            }
            ref={containerRef}
          >
            <div
              className="relative min-w-full min-h-full transition-all duration-500 ease-in-out origin-top-left"
              style={{
                width: Math.max(width + 100, isFullscreen ? 0 : 800),
                height: Math.max(height + 100, isFullscreen ? 0 : 500),
              }}
              onClick={() => setSelectedNodeId(null)}
            >
              {/* SVG Layer for Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <linearGradient
                    id="pathGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                {allPaths.map((path) => {
                  const fromNode = layoutNodes.find(
                    (n) => n.suggestItemId === path.fromSuggestItemId,
                  );
                  const toNode = layoutNodes.find(
                    (n) => n.suggestItemId === path.toSuggestItemId,
                  );

                  if (!fromNode || !toNode) return null;

                  const key = `${path.fromSuggestItemId}-${path.toSuggestItemId}`;
                  const isHighlighted =
                    selectedNodeId !== null && relatedPaths.has(key);
                  const isDimmed = selectedNodeId !== null && !isHighlighted;

                  // Calculate relative percentage
                  const totalOutgoing = path.fromSuggestItemId
                    ? outgoingClicksMap.get(path.fromSuggestItemId) || 0
                    : 0;
                  const relativePercentage =
                    totalOutgoing > 0
                      ? (path.transitionCount / totalOutgoing) * 100
                      : 0;

                  return (
                    <FlowConnection
                      key={key}
                      path={path}
                      fromNode={fromNode}
                      toNode={toNode}
                      highlighted={isHighlighted || selectedNodeId === null}
                      relativePercentage={relativePercentage}
                    />
                  );
                })}
              </svg>

              {/* HTML Layer for Nodes */}
              <div className="absolute inset-0 z-10">
                {layoutNodes.map((node) => {
                  const isSelected = selectedNodeId === node.suggestItemId;
                  const isRelated = relatedNodeIds.has(node.suggestItemId);
                  const isDimmed =
                    selectedNodeId !== null && !isSelected && !isRelated;

                  return (
                    <div
                      key={node.suggestItemId}
                      className={`transition-opacity duration-300 ${isDimmed ? "opacity-30 grayscale" : "opacity-100"}`}
                    >
                      <FlowNode
                        node={node}
                        isSelected={isSelected}
                        isRelated={isRelated}
                        onClick={() =>
                          setSelectedNodeId(
                            node.suggestItemId === selectedNodeId
                              ? null
                              : node.suggestItemId,
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Floating Detail Panel */}
          <AnimatePresence>
            {selectedNode && selectedNode.suggestItemId !== -1 && (
              <motion.div
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 20, x: 20 }}
                className="absolute bottom-6 right-6 z-40 w-72 bg-white/90 backdrop-blur-md border border-blue-100 rounded-2xl shadow-xl overflow-hidden"
              >
                <div
                  className={`h-2 w-full bg-gradient-to-r ${
                    [
                      COLORS.level0,
                      COLORS.level1,
                      COLORS.level2,
                      COLORS.level3,
                    ][Math.min(selectedNode.level, 3)] || COLORS.default
                  }`}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-bold text-gray-900 text-lg leading-tight">
                      {selectedNode.displayLabel}
                    </h4>
                    <Chip
                      size="sm"
                      color="primary"
                      variant="flat"
                      className="shrink-0"
                    >
                      ID: {selectedNode.suggestItemId}
                    </Chip>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                        総クリック数
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {selectedNode.clickCount}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-[10px] text-gray-500 uppercase">
                          階層
                        </div>
                        <div className="font-semibold text-gray-700">
                          {selectedNode.level}
                        </div>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-[10px] text-gray-500 uppercase">
                          子ノード数
                        </div>
                        <div className="font-semibold text-gray-700">
                          {selectedNode.children.length}
                        </div>
                      </div>
                    </div>

                    {selectedNode.suggestName && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-[10px] text-gray-400 mb-1">
                          パッケージ
                        </div>
                        <div className="text-xs text-gray-600 font-medium truncate">
                          {selectedNode.suggestName}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardBody>
      </Card>
    </div>
  );
}
