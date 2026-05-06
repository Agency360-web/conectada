import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  entityType?: string;
  entityId?: string;
  onUploaded?: () => void;
  onFileSelect?: (file: File) => void;
  className?: string;
}

export function FileUploader({ entityType, entityId, onUploaded, onFileSelect, className }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onFileSelect) {
      onFileSelect(file);
      return;
    }

    if (!entityType || !entityId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${entityType}/${entityId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('attachments').insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
        created_by: user?.id
      });

      if (dbError) throw dbError;

      toast.success("Arquivo enviado com sucesso!");
      if (onUploaded) onUploaded();
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        Anexar arquivo
      </Button>
    </div>
  );
}
