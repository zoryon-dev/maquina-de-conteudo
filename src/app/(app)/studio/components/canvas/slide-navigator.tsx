/**
 * Slide Navigator Component
 *
 * Navegação entre slides com thumbnails:
 * - Adicionar slide
 * - Remover slide
 * - Duplicar slide
 * - Reordenar (drag & drop)
 */

"use client";

import { useMemo } from "react";
import { Plus, Copy, Trash2, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useStudioStore,
  useSlides,
  useProfile,
  useHeader,
  useCanAddSlide,
  useCanRemoveSlide,
} from "@/stores/studio-store";
import { renderSlideToHtml } from "@/lib/studio-templates/renderer";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SlideNavigator() {
  const slides = useSlides();
  const profile = useProfile();
  const header = useHeader();
  const activeSlideIndex = useStudioStore((state) => state.activeSlideIndex);
  const setActiveSlide = useStudioStore((state) => state.setActiveSlide);
  const addSlide = useStudioStore((state) => state.addSlide);
  const removeSlide = useStudioStore((state) => state.removeSlide);
  const duplicateSlide = useStudioStore((state) => state.duplicateSlide);
  const moveSlide = useStudioStore((state) => state.moveSlide);
  const canAddSlide = useCanAddSlide();
  const canRemoveSlide = useCanRemoveSlide();

  // Configurar sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo de 8px de movimento para ativar drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler para quando o drag termina
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);
      moveSlide(oldIndex, newIndex);
    }
  };

  // Navegação com teclado
  const handlePrevSlide = () => {
    if (activeSlideIndex > 0) {
      setActiveSlide(activeSlideIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (activeSlideIndex < slides.length - 1) {
      setActiveSlide(activeSlideIndex + 1);
    }
  };

  // IDs para o SortableContext
  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-4">
        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevSlide}
          disabled={activeSlideIndex === 0}
          className="text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Slide Thumbnails with Drag & Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slideIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex-1 flex items-center gap-2 overflow-x-auto py-2 px-1">
              {slides.map((slide, index) => (
                <SortableSlideThumbnail
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === activeSlideIndex}
                  totalSlides={slides.length}
                  profile={profile}
                  header={header}
                  onSelect={() => setActiveSlide(index)}
                  onDuplicate={() => duplicateSlide(slide.id)}
                  onRemove={() => removeSlide(slide.id)}
                  canRemove={canRemoveSlide}
                />
              ))}

              {/* Add Slide Button */}
              {canAddSlide && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => addSlide()}
                      className="flex-shrink-0 w-[60px] h-[75px] rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center group"
                    >
                      <Plus className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adicionar slide</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </SortableContext>
        </DndContext>

        {/* Navigation Arrows */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextSlide}
          disabled={activeSlideIndex === slides.length - 1}
          className="text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        {/* Slide Count */}
        <div className="text-sm text-white/40 font-mono">
          {slides.length}/10
        </div>
      </div>
    </TooltipProvider>
  );
}

interface SortableSlideThumbnailProps {
  slide: ReturnType<typeof useSlides>[number];
  index: number;
  isActive: boolean;
  totalSlides: number;
  profile: ReturnType<typeof useProfile>;
  header: ReturnType<typeof useHeader>;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

function SortableSlideThumbnail({
  slide,
  index,
  isActive,
  totalSlides,
  profile,
  header,
  onSelect,
  onDuplicate,
  onRemove,
  canRemove,
}: SortableSlideThumbnailProps) {
  // Hook do @dnd-kit para tornar o item arrastável
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  // Estilo com transform durante o drag
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  // Gerar HTML do slide para thumbnail
  const thumbnailHtml = useMemo(() => {
    const result = renderSlideToHtml({
      slide,
      profile,
      header,
      slideIndex: index,
      totalSlides,
    });
    return result.html;
  }, [slide, profile, header, index, totalSlides]);

  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(thumbnailHtml)}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "relative flex-shrink-0 group cursor-pointer",
            "rounded-lg overflow-hidden transition-all",
            isActive
              ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0a0a0f]"
              : "ring-1 ring-white/10 hover:ring-white/30",
            isDragging && "opacity-80 scale-105 shadow-xl shadow-black/50"
          )}
          onClick={onSelect}
        >
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              "absolute top-0 left-0 z-10 p-1 cursor-grab active:cursor-grabbing",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-black/60 rounded-br"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3 text-white/70" />
          </div>

          {/* Thumbnail Preview */}
          <div
            className="relative overflow-hidden"
            style={{
              width: 60,
              height: 75,
            }}
          >
            <iframe
              src={dataUrl}
              title={`Slide ${index + 1}`}
              className="border-0 pointer-events-none"
              style={{
                width: 1080,
                height: 1440,
                transform: "scale(0.055)",
                transformOrigin: "top left",
              }}
              tabIndex={-1}
            />
          </div>

          {/* Slide Number */}
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-medium text-white/80">
            {index + 1}
          </div>

          {/* Action Buttons (on hover) */}
          <div className="absolute top-0 right-0 flex gap-0.5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1 bg-black/60 hover:bg-black/80 rounded transition-colors"
              title="Duplicar"
            >
              <Copy className="w-3 h-3 text-white/70" />
            </button>
            {canRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="p-1 bg-black/60 hover:bg-red-500/80 rounded transition-colors"
                title="Remover"
              >
                <Trash2 className="w-3 h-3 text-white/70" />
              </button>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Slide {index + 1} - {slide.template}
          <span className="text-white/50 ml-1">(arraste para reordenar)</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
