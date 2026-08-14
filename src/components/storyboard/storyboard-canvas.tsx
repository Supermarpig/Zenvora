"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useEpisodeStore } from "@/stores/use-episode-store";
import { FrameNode, type FrameNodeData } from "./frame-node";

const NODE_WIDTH = 192;
const NODE_GAP = 80;

/** 篩選狀態的哨兵值 */
const ALL = "__all__";
const UNASSIGNED = "__none__";

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
      hasVideo: !!frame.videoKey,
      videoStatus: frame.videoStatus,
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

  const seasons = useEpisodeStore((s) => s.seasons);
  const episodes = useEpisodeStore((s) => s.episodes);
  const [episodeFilter, setEpisodeFilter] = useState<string>(ALL);

  /**
   * 篩選選項。專案沒有集時是空陣列 —— 那時整條篩選列不渲染,
   * 畫布與先前完全一樣。
   */
  const filterOptions = useMemo(() => {
    const ordered = seasons
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => a.order - b.order);
    return ordered.flatMap((season) =>
      episodes
        .filter((e) => e.seasonId === season.id)
        .sort((a, b) => a.order - b.order)
        .map((e) => ({ id: e.id, label: `${season.name} · ${e.name}` }))
    );
  }, [seasons, episodes, projectId]);

  const projectFrames = useMemo(
    () =>
      allFrames
        .filter((f) => f.projectId === projectId)
        .sort((a, b) => a.order - b.order),
    [allFrames, projectId]
  );

  /**
   * 篩選只影響「顯示哪些節點」,**不重新編號** —— `data.order` 仍是專案內的
   * 鏡號,所以篩到第二集時看到的是第 4、5、6 鏡,不是重新從 1 開始。
   */
  const frames = useMemo(() => {
    if (episodeFilter === ALL) return projectFrames;
    if (episodeFilter === UNASSIGNED)
      return projectFrames.filter((f) => !f.episodeId);
    return projectFrames.filter((f) => f.episodeId === episodeFilter);
  }, [projectFrames, episodeFilter]);

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
    <div className="relative h-full w-full">
      {filterOptions.length > 0 && (
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 rounded-lg border bg-background/90 p-1.5 backdrop-blur">
          {[
            { id: ALL, label: `全部（${projectFrames.length}）` },
            {
              id: UNASSIGNED,
              label: `未指定（${projectFrames.filter((f) => !f.episodeId).length}）`,
            },
            ...filterOptions.map((o) => ({
              id: o.id,
              label: `${o.label}（${
                projectFrames.filter((f) => f.episodeId === o.id).length
              }）`,
            })),
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setEpisodeFilter(o.id)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                episodeFilter === o.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
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
