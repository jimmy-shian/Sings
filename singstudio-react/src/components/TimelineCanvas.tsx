import React, { useRef, useEffect, useCallback } from 'react';
import type { VocalTake, TimelineContextMenuInfo } from '../types';

interface TimelineCanvasProps {
  duration: number;
  currentTime: number;
  viewStartTime: number;
  zoomLevel: number;
  backingPeaks?: Float32Array | null;
  vocalTakes?: VocalTake[];
  liveVocalWave?: Float32Array | null;
  selectedTakeId?: number | null;
  isRecording?: boolean;
  onSeek: (time: number) => void;
  onZoom: (factor: number, centerTime?: number) => void;
  onPan: (deltaSeconds: number) => void;
  onContextMenu?: (e: React.MouseEvent, info: TimelineContextMenuInfo) => void;
  onSelectTake?: (takeId: number) => void;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  duration,
  currentTime,
  viewStartTime,
  zoomLevel,
  backingPeaks,
  vocalTakes = [],
  liveVocalWave,
  selectedTakeId,
  isRecording,
  onSeek,
  onZoom,
  onPan,
  onContextMenu,
  onSelectTake,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, viewStartTime: 0 });
  const snapInfoRef = useRef<{ isSnapped: boolean; snapTime: number }>({ isSnapped: false, snapTime: 0 });

  const SNAP_THRESHOLD = 0.05;

  const getVisibleDuration = useCallback(() => {
    return Math.max(1, duration / zoomLevel);
  }, [duration, zoomLevel]);

  const timeToX = useCallback((time: number, width: number) => {
    const visibleDur = getVisibleDuration();
    return ((time - viewStartTime) / visibleDur) * width;
  }, [getVisibleDuration, viewStartTime]);

  const xToTime = useCallback((x: number, width: number) => {
    const visibleDur = getVisibleDuration();
    return viewStartTime + (x / width) * visibleDur;
  }, [getVisibleDuration, viewStartTime]);

  const checkSnap = useCallback((time: number): { snappedTime: number; isSnapped: boolean } => {
    let closest = time;
    let minDist = SNAP_THRESHOLD;
    let isSnapped = false;

    if (Math.abs(time - 0) < minDist) {
      minDist = Math.abs(time - 0);
      closest = 0;
      isSnapped = true;
    }

    for (const take of vocalTakes) {
      const distStart = Math.abs(time - take.startTime);
      const distEnd = Math.abs(time - (take.startTime + take.duration));
      if (distStart < minDist) {
        minDist = distStart;
        closest = take.startTime;
        isSnapped = true;
      }
      if (distEnd < minDist) {
        minDist = distEnd;
        closest = take.startTime + take.duration;
        isSnapped = true;
      }
    }

    return { snappedTime: closest, isSnapped };
  }, [vocalTakes]);

  const getTickInterval = (visibleDur: number): number => {
    if (visibleDur <= 5) return 0.5;
    if (visibleDur <= 15) return 1;
    if (visibleDur <= 30) return 2;
    if (visibleDur <= 60) return 5;
    if (visibleDur <= 180) return 10;
    if (visibleDur <= 360) return 30;
    return 60;
  };

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;

    ctx.fillStyle = '#1c1e26';
    ctx.fillRect(0, 0, width, height);

    const visibleDur = getVisibleDuration();
    const tickInterval = getTickInterval(visibleDur);
    const firstTick = Math.floor(viewStartTime / tickInterval) * tickInterval;

    ctx.strokeStyle = '#323644';
    ctx.fillStyle = '#8b92a5';
    ctx.font = '11px "JetBrains Mono", Consolas, monospace';
    ctx.lineWidth = 1;

    for (let t = firstTick; t <= viewStartTime + visibleDur; t += tickInterval) {
      const x = timeToX(t, width);
      if (x >= 0 && x <= width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.fillText(formatTime(t), x + 4, 13);
      }
    }

    const rulerHeight = 18;
    const trackPadding = 4;
    const availableHeight = height - rulerHeight - trackPadding * 3;
    const trackHeight = availableHeight / 2;

    const backingY = rulerHeight + trackPadding;
    const vocalY = backingY + trackHeight + trackPadding;

    ctx.fillStyle = '#232632';
    ctx.fillRect(0, backingY, width, trackHeight);
    ctx.strokeStyle = '#323644';
    ctx.strokeRect(0, backingY, width, trackHeight);

    if (backingPeaks && backingPeaks.length > 0) {
      const peakStep = duration / backingPeaks.length;
      const playheadX = timeToX(currentTime, width);

      for (let i = 0; i < backingPeaks.length; i++) {
        const peakTime = i * peakStep;
        if (peakTime < viewStartTime || peakTime > viewStartTime + visibleDur) continue;

        const x = timeToX(peakTime, width);
        const amp = backingPeaks[i] * (trackHeight / 2) * 0.9;
        const midY = backingY + trackHeight / 2;

        ctx.strokeStyle = x <= playheadX ? '#3b82f6' : '#5a6278';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, midY - amp);
        ctx.lineTo(x, midY + amp);
        ctx.stroke();
      }
    }

    ctx.fillStyle = '#232632';
    ctx.fillRect(0, vocalY, width, trackHeight);
    ctx.strokeStyle = '#323644';
    ctx.strokeRect(0, vocalY, width, trackHeight);

    vocalTakes.forEach((take, idx) => {
      const startX = timeToX(take.startTime, width);
      const endX = timeToX(take.startTime + take.duration, width);
      const takeWidth = Math.max(2, endX - startX);

      if (startX + takeWidth < 0 || startX > width) return;

      const isSelected = take.id === selectedTakeId;
      ctx.fillStyle = isSelected ? 'rgba(16, 185, 129, 0.45)' : 'rgba(59, 130, 246, 0.35)';
      ctx.fillRect(startX, vocalY + 2, takeWidth, trackHeight - 4);

      ctx.strokeStyle = isSelected ? '#10b981' : '#3b82f6';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(startX, vocalY + 2, takeWidth, trackHeight - 4);

      if (takeWidth > 45) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillText(`Take ${idx + 1}`, startX + 6, vocalY + 16);
      }
    });

    if (isRecording && liveVocalWave) {
      const midY = vocalY + trackHeight / 2;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const waveStep = width / liveVocalWave.length;
      for (let i = 0; i < liveVocalWave.length; i++) {
        const x = i * waveStep;
        const y = midY + liveVocalWave[i] * (trackHeight / 2) * 0.85;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (snapInfoRef.current.isSnapped) {
      const snapX = timeToX(snapInfoRef.current.snapTime, width);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(snapX, 0);
      ctx.lineTo(snapX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const playheadX = timeToX(currentTime, width);
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 9);
      ctx.closePath();
      ctx.fill();
    }
  }, [getVisibleDuration, viewStartTime, duration, currentTime, backingPeaks, vocalTakes, selectedTakeId, isRecording, liveVocalWave, timeToX]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    render();
  }, [render]);

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [resizeCanvas]);

  useEffect(() => {
    let animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.button === 1 || e.altKey) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, viewStartTime };
      canvas.style.cursor = 'grab';
    } else if (e.button === 0) {
      isDraggingRef.current = true;
      canvas.style.cursor = 'crosshair';

      const rect = canvas.getBoundingClientRect();
      const clickTime = xToTime(e.clientX - rect.left, rect.width);
      const { snappedTime, isSnapped } = checkSnap(clickTime);
      snapInfoRef.current = { isSnapped, snapTime: snappedTime };
      onSeek(snappedTime);

      if (onSelectTake) {
        const hit = vocalTakes.find(t => clickTime >= t.startTime && clickTime <= t.startTime + t.duration);
        if (hit) onSelectTake(hit.id);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const visibleDur = getVisibleDuration();
      const deltaTime = (dx / rect.width) * visibleDur;
      onPan(-deltaTime);
    } else if (isDraggingRef.current) {
      const clickTime = xToTime(e.clientX - rect.left, rect.width);
      const { snappedTime, isSnapped } = checkSnap(clickTime);
      snapInfoRef.current = { isSnapped, snapTime: snappedTime };
      onSeek(snappedTime);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
    snapInfoRef.current = { isSnapped: false, snapTime: 0 };
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseTime = xToTime(mouseX, rect.width);
    const visibleDur = getVisibleDuration();

    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const scrollDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      const panAmount = (scrollDelta > 0 ? 1 : -1) * (visibleDur * 0.12);
      onPan(panAmount);
    } else {
      const factor = e.deltaY < 0 ? 1.25 : 0.8;
      onZoom(factor, mouseTime);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !onContextMenu) return;

    const rect = canvas.getBoundingClientRect();
    const clickTime = xToTime(e.clientX - rect.left, rect.width);
    const hitTake = vocalTakes.find(t => clickTime >= t.startTime && clickTime <= t.startTime + t.duration) || null;

    onContextMenu(e, {
      x: e.clientX,
      y: e.clientY,
      time: clickTime,
      take: hitTake,
    });
  };

  return (
    <div className="visualizer-card" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '180px' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};
