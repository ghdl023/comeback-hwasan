"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { GripVertical, Check, BookOpen } from "lucide-react";
import type { CalendarSettings, CalendarDisplayItem } from "@/lib/types";
import { QUOTE_ICON_OPTIONS } from "@/lib/types";

const QUOTE_INTERVAL_OPTIONS = [
  { value: 30, label: "30초" },
  { value: 60, label: "1분" },
  { value: 300, label: "5분" },
  { value: 600, label: "10분" },
  { value: 0, label: "끄기" },
];

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

  const handleBodyToggle = useCallback(
    (field: "showBodyWeight" | "showBodySkeletalMuscle" | "showBodyFat", checked: boolean) => {
      onSettingsChange({ ...settings, [field]: checked });
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
      <div className="w-[calc(100%-2rem)] max-w-sm bg-background rounded-2xl shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto">
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
            <h3 className="text-sm font-bold mb-3">신체정보 표시</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">체중</span>
                <Switch
                  checked={settings.showBodyWeight}
                  onCheckedChange={(c) => handleBodyToggle("showBodyWeight", c)}
                  data-testid="toggle-show-body-weight"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">골격근량</span>
                <Switch
                  checked={settings.showBodySkeletalMuscle}
                  onCheckedChange={(c) => handleBodyToggle("showBodySkeletalMuscle", c)}
                  data-testid="toggle-show-body-skeletal-muscle"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">체지방률</span>
                <Switch
                  checked={settings.showBodyFat}
                  onCheckedChange={(c) => handleBodyToggle("showBodyFat", c)}
                  data-testid="toggle-show-body-fat"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold mb-3">청명 잔소리 노출 주기</h3>
            <div className="flex flex-wrap gap-2">
              {QUOTE_INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSettingsChange({ ...settings, quoteIntervalSeconds: opt.value })}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    settings.quoteIntervalSeconds === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground"
                  }`}
                  data-testid={`button-quote-interval-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold mb-3">청명 이미지</h3>
            <div className="grid grid-cols-5 gap-2">
              {QUOTE_ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onSettingsChange({ ...settings, quoteIconId: opt.id })}
                  className={`relative w-full aspect-square rounded-full overflow-hidden border-2 transition-all ${
                    settings.quoteIconId === opt.id
                      ? "border-primary ring-2 ring-primary/40 scale-110 shadow-md shadow-primary/30"
                      : "border-border hover:border-primary/50 opacity-70"
                  }`}
                  data-testid={`button-icon-${opt.id}`}
                >
                  <img
                    src={opt.src}
                    alt={opt.id}
                    className="w-full h-full object-cover"
                  />
                  {settings.quoteIconId === opt.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <a
              href="https://comic.naver.com/webtoon/list?titleId=769209"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#00C73C] hover:bg-[#00b336] text-white text-sm font-bold transition-colors"
              data-testid="link-webtoon"
            >
              <BookOpen className="h-4 w-4" />
              웹툰 화산귀환 보러가기
            </a>
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
