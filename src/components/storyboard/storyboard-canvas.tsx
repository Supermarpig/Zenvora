"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFrameStore } from "@/stores/use-frame-store";
import { FrameNode, type FrameNodeData } from "./frame-node";

const NODE_WIDTH = 192;
const NODE_GAP = 80;

const nodeTypes: NodeTypes = {
  frame: FrameNode,
};

interface StoryboardCanvasProps {
  projectId: string;
}

function framesToNodes(
  frames: ReturnType<typeof useFrameStore.getState>["frames"],
  selectedFrameId: string | null
): Node<FrameNodeData>[] {
  return frames.map((frame, index) => ({
    id: frame.id,
    type: "frame",
    position: { x: index * (NODE_WIDTH + NODE_GAP), y: 0 },
    data: {
      frameId: frame.id,
      order: frame.order,
      prompt: frame.prompt,
      imageBase64Key: frame.imageBase64Key,
      isSelected: frame.id === selectedFrameId,
    },
  }));
}

function framesToEdges(
  frames: ReturnType<typeof useFrameStore.getState>["frames"]
): Edge[] {
  return frames.slice(0, -1).map((frame, index) => ({
    id: `edge-${frame.id}-${frames[index + 1].id}`,
    source: frame.id,
    target: frames[index + 1].id,
    animated: true,
  }));
}

export function StoryboardCanvas({ projectId }: StoryboardCanvasProps) {
  const allFrames = useFrameStore((s) => s.frames);
  const selectedFrameId = useFrameStore((s) => s.selectedFrameId);
  const setSelectedFrameId = useFrameStore((s) => s.setSelectedFrameId);

  const frames = useMemo(
    () =>
      allFrames
        .filter((f) => f.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [allFrames, projectId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FrameNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setNodes(framesToNodes(frames, selectedFrameId));
    setEdges(framesToEdges(frames));
  }, [frames, selectedFrameId, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedFrameId(node.id);
    },
    [setSelectedFrameId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedFrameId(null);
  }, [setSelectedFrameId]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
