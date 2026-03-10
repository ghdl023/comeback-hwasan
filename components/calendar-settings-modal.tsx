"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { X, GripVertical } from "lucide-react";
import type { CalendarSettings, CalendarDisplayItem } from "@/lib/types";

interface CalendarSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: CalendarSettings;
  onSettingsChange: (settings: CalendarSettings) => void;
}

const DISPLAY_ITEM_LABELS: Record<CalendarDisplayItem, string> = {
  workout: "운동",
  body: "신체",
  memo: "메모",
};

export function CalendarSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
}: CalendarSettingsModalProps) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleFontSizeChange = useCallback(
    (value: number[]) => {
      onSettingsChange({ ...settings, fontSize: value[0] });
    },
    [settings, onSettingsChange],
  );

  const handleDurationToggle = useCallback(
    (checked: boolean) => {
      onSettingsChange({ ...settings, showDuration: checked });
    },
    [settings, onSettingsChange],
  );

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...settings.displayOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    setDragIdx(idx);
    onSettingsChange({ ...settings, displayOrder: newOrder });
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (dragIdx === null) return;
      const touch = e.touches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const target = elements.find((el) => el.getAttribute("data-order-idx") !== null);
      if (target) {
        const targetIdx = parseInt(target.getAttribute("data-order-idx") || "", 10);
        if (!isNaN(targetIdx) && targetIdx !== dragIdx) {
          const newOrder = [...settings.displayOrder];
          const [moved] = newOrder.splice(dragIdx, 1);
          newOrder.splice(targetIdx, 0, moved);
          setDragIdx(targetIdx);
          onSettingsChange({ ...settings, displayOrder: newOrder });
        }
      }
    },
    [dragIdx, settings, onSettingsChange],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="calendar-settings-modal"
    >
      <div className="w-[calc(100%-2rem)] max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 space-y-6">
          <div>
            <h3 className="text-sm font-bold mb-3">캘린더 폰트 크기</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground shrink-0">작게</span>
              <Slider
                value={[settings.fontSize]}
                onValueChange={handleFontSizeChange}
                min={6}
                max={10}
                step={1}
                className="flex-1"
                data-testid="slider-font-size"
              />
              <span className="text-xs text-muted-foreground shrink-0">크게</span>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold mb-1">캘린더 표시 순서</h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              길게 눌러 순서를 변경할 수 있습니다.
            </p>
            <div className="flex items-center gap-2">
              {settings.displayOrder.map((item, idx) => (
                <div key={item} className="flex items-center gap-1">
                  <div
                    draggable
                    data-order-idx={idx}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={() => handleDragStart(idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleDragEnd}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm font-medium cursor-grab active:cursor-grabbing select-none transition-all ${
                      dragIdx === idx
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border bg-card"
                    }`}
                    data-testid={`drag-item-${item}`}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    {DISPLAY_ITEM_LABELS[item]}
                  </div>
                  {idx < settings.displayOrder.length - 1 && (
                    <span className="text-muted-foreground text-xs">⇄</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">운동 시간 표시</span>
                <span className="text-muted-foreground text-sm">Σ</span>
              </div>
              <Switch
                checked={settings.showDuration}
                onCheckedChange={handleDurationToggle}
                data-testid="toggle-show-duration"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end px-5 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm"
            onClick={onClose}
            data-testid="button-close-settings"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
