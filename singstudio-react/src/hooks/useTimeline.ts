import { useState, useCallback } from 'react';
import type { TimelineState } from '../types';

export function useTimeline(initialDuration = 60) {
  const [timelineState, setTimelineState] = useState<TimelineState>({
    zoomLevel: 1.0,
    viewStartTime: 0,
    duration: initialDuration,
    currentTime: 0,
    isDragging: false,
    isSnapped: false,
    snapTime: 0,
    isRecording: false,
  });

  const [selectedTakeId, setSelectedTakeId] = useState<number | null>(null);

  const MIN_ZOOM = 1.0;
  const MAX_ZOOM = 10.0;

  const setDuration = useCallback((dur: number) => {
    setTimelineState(prev => ({
      ...prev,
      duration: Math.max(1, dur),
      viewStartTime: Math.min(prev.viewStartTime, Math.max(0, dur - (dur / prev.zoomLevel))),
    }));
  }, []);

  const seek = useCallback((time: number) => {
    setTimelineState(prev => ({
      ...prev,
      currentTime: Math.max(0, Math.min(prev.duration, time)),
    }));
  }, []);

  const zoom = useCallback((factor: number, centerTime?: number) => {
    setTimelineState(prev => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoomLevel * factor));
      if (Math.abs(newZoom - prev.zoomLevel) < 0.01) return prev;

      const visibleDuration = prev.duration / prev.zoomLevel;
      const newVisibleDuration = prev.duration / newZoom;

      let newStart = prev.viewStartTime;
      if (centerTime !== undefined) {
        const ratio = (centerTime - prev.viewStartTime) / visibleDuration;
        newStart = centerTime - ratio * newVisibleDuration;
      }
      newStart = Math.max(0, Math.min(prev.duration - newVisibleDuration, newStart));

      return {
        ...prev,
        zoomLevel: newZoom,
        viewStartTime: newStart,
      };
    });
  }, []);

  const zoomIn = useCallback(() => zoom(1.25), [zoom]);
  const zoomOut = useCallback(() => zoom(0.8), [zoom]);
  const zoomReset = useCallback(() => {
    setTimelineState(prev => ({
      ...prev,
      zoomLevel: 1.0,
      viewStartTime: 0,
    }));
  }, []);

  const pan = useCallback((deltaSeconds: number) => {
    setTimelineState(prev => {
      const visibleDur = prev.duration / prev.zoomLevel;
      const newStart = Math.max(0, Math.min(prev.duration - visibleDur, prev.viewStartTime + deltaSeconds));
      return { ...prev, viewStartTime: newStart };
    });
  }, []);

  const panLeft = useCallback(() => {
    setTimelineState(prev => {
      const step = (prev.duration / prev.zoomLevel) * 0.2;
      return { ...prev, viewStartTime: Math.max(0, prev.viewStartTime - step) };
    });
  }, []);

  const panRight = useCallback(() => {
    setTimelineState(prev => {
      const visibleDur = prev.duration / prev.zoomLevel;
      const step = visibleDur * 0.2;
      return { ...prev, viewStartTime: Math.min(prev.duration - visibleDur, prev.viewStartTime + step) };
    });
  }, []);

  const setViewStartTime = useCallback((start: number) => {
    setTimelineState(prev => ({
      ...prev,
      viewStartTime: Math.max(0, Math.min(prev.duration - (prev.duration / prev.zoomLevel), start)),
    }));
  }, []);

  return {
    timelineState,
    setTimelineState,
    selectedTakeId,
    setSelectedTakeId,
    setDuration,
    seek,
    zoom,
    zoomIn,
    zoomOut,
    zoomReset,
    pan,
    panLeft,
    panRight,
    setViewStartTime,
  };
}
