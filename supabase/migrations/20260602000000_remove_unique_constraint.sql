/*
  Migration: Remove unique constraint on client_id in client_whatsapp_instances table
  This allows a client to have up to 3 WhatsApp instances as required.
*/

-- Drop the unique constraint if it exists
ALTER TABLE public.client_whatsapp_instances
  DROP CONSTRAINT IF EXISTS client_whatsapp_instances_client_id_key;

-- Optionally add a check constraint to limit max 3 instances per client (handled in app logic)
-- No further changes needed.
