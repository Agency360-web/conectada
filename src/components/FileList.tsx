import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileIcon, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

interface Props {
  entityType: string;
  entityId: string;
  refreshKey?: number;
}

export function FileList({ entityType, entityId, refreshKey }: Props) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [entityId, refreshKey]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (!error) setFiles(data || []);
    setLoading(false);
  };

  const download = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from('attachments').download(path);
    if (error) return toast.error("Erro ao baixar arquivo");
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  const remove = async (id: string, path: string) => {
    if (!confirm("Excluir este anexo?")) return;
    
    await supabase.storage.from('attachments').remove([path]);
    await supabase.from('attachments').delete().eq('id', id);
    
    toast.success("Anexo removido");
    load();
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (files.length === 0) return <p className="text-xs text-muted-foreground">Nenhum anexo.</p>;

  return (
    <div className="space-y-2">
      {files.map(f => (
        <div key={f.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 group">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs truncate font-medium">{f.file_name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              ({(f.file_size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => download(f.file_path, f.file_name)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(f.id, f.file_path)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
