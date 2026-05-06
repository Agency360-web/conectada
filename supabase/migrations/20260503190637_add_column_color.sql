-- Adiciona campo de cor às colunas do Kanban
ALTER TABLE public.board_columns 
ADD COLUMN IF NOT EXISTS color text DEFAULT 'default';
