import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Drawing } from "@shared/schema";
import { X, Trash2, Pencil, Download, Plus } from "lucide-react";

interface GalleryProps {
  onOpen: (drawing: Drawing) => void;
  onNewDrawing: () => void;
  onClose: () => void;
}

export default function Gallery({ onOpen, onNewDrawing, onClose }: GalleryProps) {
  const [renaming, setRenaming] = useState<number | null>(null);
  const [newName, setNewName] = useState("");

  const { data: drawings = [], isLoading } = useQuery<Drawing[]>({
    queryKey: ['/api/drawings'],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/drawings/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/drawings'] }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest('PATCH', `/api/drawings/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drawings'] });
      setRenaming(null);
    },
  });

  const handleDownload = (drawing: Drawing) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = drawing.width;
      canvas.height = drawing.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `${drawing.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    // Use canvasData to reconstruct — for now use thumbnail as preview
    img.src = drawing.thumbnail;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-HK', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: 'min(90vw, 780px)',
          maxHeight: '85vh',
          background: 'hsl(220 18% 10%)',
          border: '1px solid hsl(220 12% 20%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'hsl(220 12% 18%)' }}>
          <h2 className="text-lg font-semibold text-white/90">Gallery</h2>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ background: 'hsl(210 100% 60%)' }}
              onClick={onNewDrawing}
              data-testid="gallery-new"
            >
              <Plus size={16} /> New Drawing
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              onClick={onClose}
              data-testid="gallery-close"
            >
              <X size={18} className="text-white/60" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="p-5 overflow-y-auto gallery-scroll" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video rounded-xl animate-pulse" style={{ background: 'hsl(220 15% 18%)' }} />
              ))}
            </div>
          ) : drawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'hsl(220 15% 18%)' }}>
                <Pencil size={24} className="text-white/30" />
              </div>
              <p className="text-white/40 text-sm">No saved drawings yet</p>
              <p className="text-white/20 text-xs mt-1">Save a drawing to see it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {drawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="group relative rounded-xl overflow-hidden cursor-pointer"
                  style={{
                    background: 'hsl(220 15% 15%)',
                    border: '1px solid hsl(220 12% 20%)',
                  }}
                  onClick={() => onOpen(drawing)}
                  data-testid={`gallery-drawing-${drawing.id}`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video overflow-hidden" style={{ background: '#fff' }}>
                    {drawing.thumbnail ? (
                      <img
                        src={drawing.thumbnail}
                        alt={drawing.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Pencil size={20} className="text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    {renaming === drawing.id ? (
                      <input
                        className="w-full text-sm bg-white/10 rounded px-1 py-0.5 text-white border border-blue-500/50"
                        value={newName}
                        autoFocus
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameMutation.mutate({ id: drawing.id, name: newName });
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        onBlur={() => {
                          if (newName.trim()) renameMutation.mutate({ id: drawing.id, name: newName });
                          else setRenaming(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        data-testid={`rename-input-${drawing.id}`}
                      />
                    ) : (
                      <p className="text-sm text-white/80 truncate font-medium">{drawing.name}</p>
                    )}
                    <p className="text-xs text-white/30 mt-0.5">{formatDate(drawing.updatedAt)}</p>
                  </div>

                  {/* Action overlay */}
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                      onClick={e => {
                        e.stopPropagation();
                        setRenaming(drawing.id);
                        setNewName(drawing.name);
                      }}
                      data-testid={`rename-btn-${drawing.id}`}
                    >
                      <Pencil size={12} className="text-white" />
                    </button>
                    <button
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                      onClick={e => {
                        e.stopPropagation();
                        handleDownload(drawing);
                      }}
                      data-testid={`download-btn-${drawing.id}`}
                    >
                      <Download size={12} className="text-white" />
                    </button>
                    <button
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/60 transition-colors"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('Delete this drawing?')) deleteMutation.mutate(drawing.id);
                      }}
                      data-testid={`delete-btn-${drawing.id}`}
                    >
                      <Trash2 size={12} className="text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
